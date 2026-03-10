import { Router, Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { accessPolicy } from '../utils/permissions';
import { UpdateItemSchema } from '@inventory/shared';

const router = Router();

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
                fieldValues: {
                    include: {
                        customField: {
                            select: { title: true, fieldType: true },
                        },
                    },
                },
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
                        select: {
                            createdById: true,
                            isPublic: true,
                            accessList: true,
                        },
                    },
                },
            });
            if (!item)
                return res.status(404).json({ message: 'Item not found' });

            if (!accessPolicy.canWrite(req.user, item.inventory)) {
                return res.status(403).json({ message: 'No item edit access' });
            }

            await prisma.$transaction(async (tx) => {
                const dataToUpdate: Prisma.ItemUpdateManyMutationInput = {
                    customId: customId || item.customId,
                    version: { increment: 1 },
                };

                if (fields) {
                    dataToUpdate.searchText = fields
                        .map((f) => {
                            const parts = [];
                            if (f.valueString) parts.push(f.valueString);
                            if (
                                f.valueNumber !== null &&
                                f.valueNumber !== undefined
                            )
                                parts.push(String(f.valueNumber));
                            if (
                                f.valueBoolean !== null &&
                                f.valueBoolean !== undefined
                            )
                                parts.push(f.valueBoolean ? 'true' : 'false');
                            return parts.join(' ');
                        })
                        .filter(Boolean)
                        .join(' ');
                }

                const updateResult = await tx.item.updateMany({
                    where: {
                        id: req.params.id,
                        version: version,
                    },
                    data: dataToUpdate,
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
                    code: 'CUSTOM_ID_CONFLICT',
                    message: 'This custom ID already exists in this inventory',
                });
            }
            if (
                error instanceof Error &&
                error.message === 'CONCURRENCY_CONFLICT'
            ) {
                return res.status(409).json({
                    code: 'VERSION_CONFLICT',
                    message:
                        'This item was modified by someone else while you were editing it.',
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
                        select: {
                            createdById: true,
                            isPublic: true,
                            accessList: true,
                        },
                    },
                },
            });
            if (!item) {
                return res.status(404).json({ message: 'Item not found' });
            }

            if (!accessPolicy.canWrite(req.user, item.inventory)) {
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

// --- Likes API ---

router.get('/:id/like', async (req: Request<{ id: string }>, res: Response) => {
    try {
        const itemId = req.params.id;
        const userId = req.user?.id;

        if (userId) {
            const [totalLikes, userLike] = await Promise.all([
                prisma.itemLike.count({ where: { itemId } }),
                prisma.itemLike.findUnique({
                    where: { userId_itemId: { userId, itemId } },
                }),
            ]);
            return res.status(200).json({
                count: totalLikes,
                isLiked: !!userLike,
            });
        }

        const totalLikes = await prisma.itemLike.count({ where: { itemId } });
        res.status(200).json({
            count: totalLikes,
            isLiked: false,
        });
    } catch (error) {
        console.error('Error when fetching likes:', error);
        res.status(500).json({
            message: 'Server error while fetching likes',
        });
    }
});

router.post(
    '/:id/like',
    requireAuth,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const itemId = req.params.id;
            const userId = req.user!.id;

            const item = await prisma.item.findUnique({
                where: { id: itemId },
            });
            if (!item)
                return res.status(404).json({ message: 'Item not found' });

            const existingLike = await prisma.itemLike.findUnique({
                where: { userId_itemId: { userId, itemId } },
            });

            if (existingLike) {
                await prisma.itemLike.delete({
                    where: { userId_itemId: { userId, itemId } },
                });
                return res.status(200).json({
                    message: 'Item unliked successfully',
                    isLiked: false,
                });
            } else {
                await prisma.itemLike.create({
                    data: { userId, itemId },
                });
                return res.status(200).json({
                    message: 'Item liked successfully',
                    isLiked: true,
                });
            }
        } catch (error) {
            console.error('Error when liking item:', error);
            res.status(500).json({
                message: 'Server error while liking item',
            });
        }
    },
);

export default router;
