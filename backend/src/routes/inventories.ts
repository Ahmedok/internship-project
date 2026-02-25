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
                accessList: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                },
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
            console.log('Backend received PATCH request with body:', req.body); // TODO: Delete this after debugging

            const parsed = InventorySchema.partial().safeParse(req.body);
            if (!parsed.success) {
                console.error('ZOD validation error:', parsed.error.issues); // TODO: Delete this after debugging
                return res.status(400).json({ errors: parsed.error.issues });
            }

            console.log('Data after ZOD validation:', parsed.data); // TODO: Delete this after debugging

            const {
                version,
                title,
                description,
                category,
                isPublic,
                imageUrl,
                tags,
            } = parsed.data;

            if (version === undefined)
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

            const updateData: any = {
                version: { increment: 1 },
            };

            if (title !== undefined) updateData.title = title;
            if (description !== undefined) updateData.description = description;
            if (category !== undefined) updateData.category = category;
            if (isPublic !== undefined) updateData.isPublic = isPublic;
            if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

            if (tags !== undefined) {
                updateData.tags = {
                    deleteMany: {},
                    create: tags.map((tagName) => ({
                        tag: {
                            connectOrCreate: {
                                where: { name: tagName.toLowerCase() },
                                create: { name: tagName.toLowerCase() },
                            },
                        },
                    })),
                };
            }

            const updated = await prisma.inventory.update({
                where: {
                    id: req.params.id,
                    version: version,
                },
                data: updateData,
                include: {
                    tags: { include: { tag: true } },
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

router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || '';
        const category = (req.query.category as string) || undefined;
        const skip = (page - 1) * limit;

        const userId = req.user?.id;
        const isAdmin = req.user?.role === 'ADMIN';

        const filterConditions: any[] = [];

        if (search) {
            filterConditions.push({
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            });
        }

        if (category) {
            filterConditions.push({ category });
        }

        let visibilityCondition: any = { isPublic: true };

        if (isAdmin) {
            visibilityCondition = {};
        } else if (userId) {
            visibilityCondition = {
                OR: [
                    { isPublic: true },
                    { createdById: userId },
                    { accessList: { some: { userId: userId } } },
                ],
            };
        }

        const whereClause = {
            AND: [...filterConditions, visibilityCondition].filter(
                (condition) => Object.keys(condition).length > 0,
            ),
        };

        const [inventories, total] = await Promise.all([
            prisma.inventory.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    createdBy: {
                        select: { id: true, name: true, avatarUrl: true },
                    },
                    tags: { include: { tag: true } },
                },
            }),
            prisma.inventory.count({ where: whereClause }),
        ]);

        res.status(200).json({
            data: inventories,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error('Error fetching inventories:', error);
        res.status(500).json({
            message: 'Server error while fetching inventory list',
        });
    }
});

router.delete(
    '/:id',
    requireAuth,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const inventoryId = req.params.id;
            const user = req.user!;

            const inventory = await prisma.inventory.findUnique({
                where: { id: inventoryId },
            });

            if (!inventory) {
                return res.status(404).json({ message: 'Inventory not found' });
            }

            const isCreator = inventory.createdById === user.id;
            const isAdmin = user.role === 'ADMIN';

            if (!isCreator && !isAdmin) {
                return res.status(403).json({
                    message: 'No permission to delete this inventory',
                });
            }

            await prisma.inventory.delete({
                where: { id: inventoryId },
            });

            res.status(200).json({ message: 'Inventory deleted successfully' });
        } catch (error) {
            console.error('Error deleting inventory:', error);
            res.status(500).json({
                message: 'Server error while deleting inventory',
            });
        }
    },
);

router.post(
    '/:id/access',
    requireAuth,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const { userId } = req.body;
            const inventoryId = req.params.id;

            const inventory = await prisma.inventory.findUnique({
                where: { id: inventoryId },
            });
            if (!inventory) {
                return res.status(404).json({ message: 'Inventory not found' });
            }

            if (
                inventory.createdById !== req.user!.id &&
                req.user!.role !== 'ADMIN'
            ) {
                return res
                    .status(403)
                    .json({ message: 'No permission for access management' });
            }

            const accessRecord = await prisma.inventoryAccess.create({
                data: {
                    inventoryId,
                    userId,
                },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                },
            });

            res.status(201).json(accessRecord);
        } catch (error: any) {
            if (error.code === 'P2002') {
                return res
                    .status(400)
                    .json({ message: 'User already has access' });
            }
            res.status(500).json({
                message: 'Server error while granting access',
            });
        }
    },
);

router.delete(
    '/:id/access/:userId',
    requireAuth,
    async (req: Request<{ id: string; userId: string }>, res: Response) => {
        try {
            const { id: inventoryId, userId } = req.params;

            const inventory = await prisma.inventory.findUnique({
                where: { id: inventoryId },
            });
            if (!inventory) {
                return res.status(404).json({ message: 'Inventory not found' });
            }

            if (
                inventory.createdById !== req.user!.id &&
                req.user!.role !== 'ADMIN'
            ) {
                return res
                    .status(403)
                    .json({ message: 'No permission for access management' });
            }

            await prisma.inventoryAccess.delete({
                where: {
                    inventoryId_userId: {
                        inventoryId,
                        userId,
                    },
                },
            });

            res.status(200).json({ message: 'Access revoked successfully' });
        } catch (error) {
            res.status(500).json({
                message: 'Server error while revoking access',
            });
        }
    },
);

export default router;
