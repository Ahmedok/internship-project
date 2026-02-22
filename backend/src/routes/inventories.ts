import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { requireAuth } from '../middleware/auth';
import { InventorySchema } from '@inventory/shared';

const router = Router();

const adapter = new PrismaPg({
    connectionString:
        process.env.DATABASE_URL ||
        'postgresql://user:password@localhost:5432/mydb',
});
const prisma = new PrismaClient({ adapter });

router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const parsed = InventorySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ errors: parsed.error });
        }

        const { title, description, category, isPublic, tags } = parsed.data;
        const userId = req.user!.id;

        const newInventory = await prisma.inventory.create({
            data: {
                title,
                description: description || '',
                category,
                isPublic,
                createdById: userId,
                tags: tags
                    ? {
                          create: tags.map((tagName) => ({
                              tag: {
                                  connectOrCreate: {
                                      where: { name: tagName.toLowerCase() },
                                      create: { name: tagName.toLowerCase() },
                                  },
                              },
                          })),
                      }
                    : undefined,
            },
            include: {
                tags: { include: { tag: true } },
            },
        });

        res.status(201).json(newInventory);
    } catch (error) {
        console.error('Error creating inventory:', error);
        res.status(500).json({
            error: 'Server error while creating inventory',
        });
    }
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
        const inventory = await prisma.inventory.findUnique({
            where: { id: req.params.id },
            include: {
                createdBy: {
                    select: { id: true, name: true, avatarUrl: true },
                },
                tags: { include: { tag: true } },
                accessList: true,
            },
        });

        if (!inventory) {
            return res.status(404).json({ message: 'Inventory not found' });
        }

        if (!inventory.isPublic) {
            const userId = req.user?.id;
            const isAdmin = req.user?.role === 'ADMIN';
            const isCreator = inventory.createdById === userId;
            const hasAccess = inventory.accessList.some(
                (a) => a.userId === userId,
            );

            if (!isAdmin && !isCreator && !hasAccess) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        res.status(200).json(inventory);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching inventory' });
    }
});

router.patch(
    '/:id',
    requireAuth,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const parsed = InventorySchema.partial().safeParse(req.body);
            if (!parsed.success)
                return res.status(400).json({ errors: parsed.error });

            const { version, title, description, category, isPublic } =
                parsed.data;

            if (!version)
                return res
                    .status(400)
                    .json({ message: 'Version for refresh not specified' });

            const inventory = await prisma.inventory.findUnique({
                where: { id: req.params.id },
                include: { accessList: true },
            });

            if (!inventory)
                return res.status(404).json({ message: 'Inventory not found' });

            const userId = req.user!.id;
            const canEdit =
                req.user!.role === 'ADMIN' ||
                inventory.createdById === userId ||
                inventory.accessList.some((a) => a.userId === userId);

            if (!canEdit)
                return res.status(403).json({ message: 'No edit access' });

            const updated = await prisma.inventory.update({
                where: {
                    id: req.params.id,
                    version: version,
                },
                data: {
                    title,
                    description,
                    category,
                    isPublic,
                    version: { increment: 1 },
                },
            });

            res.status(200).json(updated);
        } catch (error: any) {
            if (error.code === 'P2025') {
                return res.status(409).json({
                    message:
                        'Conflict: Inventory was modified by another user. Refresh and try again.',
                });
            }
            console.error(error);
            res.status(500).json({
                message: 'Server error while updating inventory',
            });
        }
    },
);

export default router;
