import { Router, Request, Response } from 'express';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { requireAuth } from '../middleware/auth';
import { UpdateItemSchema } from '@inventory/shared';

const router = Router();

const adapter = new PrismaPg({
    connectionString:
        process.env.DATABASE_URL ||
        'postgresql://user:password@localhost:5432/mydb',
});
const prisma = new PrismaClient({ adapter });

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
        const item = await prisma.item.findUnique({
            where: { id: req.params.id },
            include: {
                inventory: {
                    select: {
                        id: true,
                        isPublic: true,
                        createdById: true,
                        accessList: true,
                    },
                },
                createdBy: { select: { id: true, name: true } },
                fieldValues: true,
            },
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json(item);
    } catch (error) {
        console.error('Critical error:', error);
        res.status(500).json({ message: 'Server error while fetching item' });
    }
});

router.patch(
    '/:id',
    requireAuth,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const parsed = UpdateItemSchema.safeParse(req.body);
            if (!parsed.success)
                return res.status(400).json({
                    message: 'Invalid input',
                    errors: parsed.error.issues,
                });

            const { customId, fields, version } = parsed.data;

            const item = await prisma.item.findUnique({
                where: { id: req.params.id },
                include: {
                    inventory: {
                        select: { createdById: true, accessList: true },
                    },
                },
            });
            if (!item)
                return res.status(404).json({ message: 'Item not found' });

            const userId = req.user!.id;
            const isCreator = item.inventory.createdById === userId;
            const hasAccess = item.inventory.accessList.some(
                (a) => a.userId === userId,
            );
            const isAdmin = req.user!.role === 'ADMIN';

            if (!isCreator && !isAdmin && !hasAccess) {
                return res.status(403).json({ message: 'No item edit access' });
            }

            await prisma.$transaction(async (tx) => {
                const updateResult = await tx.item.updateMany({
                    where: {
                        id: req.params.id,
                        version: version,
                    },
                    data: {
                        customId: customId || item.customId,
                        version: { increment: 1 },
                    },
                });

                if (updateResult.count === 0) {
                    throw new Error('CONCURRENCY_CONFLICT');
                }

                if (fields) {
                    await tx.itemFieldValue.deleteMany({
                        where: { itemId: req.params.id },
                    });
                    await tx.itemFieldValue.createMany({
                        data: fields.map((f) => ({
                            itemId: req.params.id,
                            customFieldId: f.customFieldId,
                            valueString: f.valueString,
                            valueNumber: f.valueNumber,
                            valueBoolean: f.valueBoolean,
                        })),
                    });
                }
            });

            res.status(200).json({ message: 'Item updated successfully' });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                return res.status(409).json({
                    message:
                        'Error: This custom ID already exists in this inventory',
                });
            }
            if (
                error instanceof Error &&
                error.message === 'CONCURRENCY_CONFLICT'
            ) {
                return res.status(409).json({
                    message:
                        'Version conflict: item has been modified by another user',
                });
            }
            console.error('Critical error:', error);
            res.status(500).json({
                message: 'Server error while updating item',
            });
        }
    },
);

router.delete(
    '/:id',
    requireAuth,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const item = await prisma.item.findUnique({
                where: { id: req.params.id },
                include: {
                    inventory: {
                        select: { createdById: true, accessList: true },
                    },
                },
            });
            if (!item) {
                return res.status(404).json({ message: 'Item not found' });
            }

            const userId = req.user!.id;
            const isCreator = item.inventory.createdById === userId;
            const hasAccess = item.inventory.accessList.some(
                (a) => a.userId === userId,
            );
            const isAdmin = req.user!.role === 'ADMIN';

            if (!isCreator && !isAdmin && !hasAccess) {
                return res
                    .status(403)
                    .json({ message: 'No item delete access' });
            }

            await prisma.item.delete({
                where: { id: req.params.id },
            });
            res.status(200).json({ message: 'Item deleted successfully' });
        } catch (error) {
            console.error('Critical error:', error);
            res.status(500).json({
                message: 'Server error while deleting item',
            });
        }
    },
);

export default router;
