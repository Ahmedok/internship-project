import { Router, Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { accessPolicy } from '../utils/permissions';
import {
    InventorySchema,
    CustomFieldUpdateSchema,
    CustomIdElementSchema,
    generateCustomId,
    CreateItemSchema,
    BulkDeleteItemsSchema,
    CreateCommentSchema,
} from '@inventory/shared';
import { z } from 'zod';
import { io } from '../socket';

const router = Router();

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

router.get('/latest', async (_req: Request, res: Response) => {
    try {
        const latest = await prisma.inventory.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                createdBy: {
                    select: { name: true, avatarUrl: true },
                },
                _count: { select: { items: true } },
            },
        });
        res.status(200).json(latest);
    } catch (error) {
        res.status(500).json({
            message: 'Server error while fetching latest inventories',
        });
    }
});

router.get('/popular', async (_req: Request, res: Response) => {
    try {
        const popular = await prisma.inventory.findMany({
            orderBy: { items: { _count: 'desc' } },
            take: 5,
            include: {
                createdBy: {
                    select: { name: true, avatarUrl: true },
                },
                _count: { select: { items: true } },
            },
        });
        res.status(200).json(popular);
    } catch (error) {
        res.status(500).json({
            message: 'Server error while fetching popular inventories',
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

            if (!accessPolicy.canManage(req.user, inventory)) {
                return res
                    .status(403)
                    .json({ message: 'No management access' });
            }

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
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                return res.status(409).json({
                    message:
                        'Conflict: Inventory was modified by another user. Refresh and try again.',
                });
            }
            console.error('Critical error:', error);
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

        // TODO: Rethink visibility permissions
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
            const user = req.user;

            const inventory = await prisma.inventory.findUnique({
                where: { id: inventoryId },
                include: { createdBy: true, accessList: true },
            });

            if (!inventory) {
                return res.status(404).json({ message: 'Inventory not found' });
            }

            if (!accessPolicy.canManage(user, inventory)) {
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
                include: { createdBy: true, accessList: true },
            });
            if (!inventory) {
                return res.status(404).json({ message: 'Inventory not found' });
            }

            if (!accessPolicy.canManage(req.user, inventory)) {
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
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                return res
                    .status(400)
                    .json({ message: 'User already has access' });
            }
            console.error('Critical error:', error);
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
                include: { createdBy: true, accessList: true },
            });
            if (!inventory) {
                return res.status(404).json({ message: 'Inventory not found' });
            }

            if (!accessPolicy.canManage(req.user, inventory)) {
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

router.get(
    '/:id/fields',
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const fields = await prisma.customField.findMany({
                where: { inventoryId: req.params.id },
                orderBy: { sortOrder: 'asc' },
            });
            res.status(200).json(fields);
        } catch (error) {
            res.status(500).json({
                message: 'Server error while fetching custom fields',
            });
        }
    },
);

router.put(
    '/:id/fields',
    requireAuth,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const inventoryId = req.params.id;

            const inventory = await prisma.inventory.findUnique({
                where: { id: inventoryId },
                include: { createdBy: true, accessList: true },
            });
            if (!inventory)
                return res.status(404).json({ message: 'Inventory not found' });

            if (!accessPolicy.canManage(req.user, inventory)) {
                return res.status(403).json({
                    message: 'No permission to update field structure',
                });
            }

            const parsed = CustomFieldUpdateSchema.safeParse(req.body);
            if (!parsed.success) {
                console.error('ZOD validation error:', parsed.error.issues); // TODO: Delete this after debugging
                return res.status(400).json({ errors: parsed.error.issues });
            }
            const incomingFields = parsed.data;

            const typeCounts: Record<string, number> = {};
            for (const field of incomingFields) {
                typeCounts[field.fieldType] =
                    (typeCounts[field.fieldType] || 0) + 1;
                if ((typeCounts[field.fieldType] ?? 0) > 3) {
                    return res.status(400).json({
                        message: `You can only have up to 3 fields of type ${field.fieldType}`,
                    });
                }
            }

            const titles = incomingFields.map((field) =>
                field.title.toLowerCase().trim(),
            );
            if (new Set(titles).size !== titles.length) {
                return res.status(400).json({
                    message: 'Field titles must be unique',
                });
            }

            await prisma.$transaction(async (tx) => {
                const existingFields = await tx.customField.findMany({
                    where: { inventoryId },
                });
                const incomingIds = incomingFields
                    .map((f) => f.id)
                    .filter(Boolean);

                const fieldsToDelete = existingFields.filter(
                    (f) => !incomingIds.includes(f.id),
                );
                if (fieldsToDelete.length > 0) {
                    await tx.customField.deleteMany({
                        where: { id: { in: fieldsToDelete.map((f) => f.id) } },
                    });
                }

                for (const [i, field] of incomingFields.entries()) {
                    const isExisting =
                        field.id &&
                        existingFields.some((f) => f.id === field.id);
                    if (isExisting) {
                        await tx.customField.update({
                            where: { id: field.id },
                            data: {
                                fieldType: field.fieldType,
                                title: field.title.trim(),
                                description: field.description,
                                showInTable: field.showInTable,
                                sortOrder: i,
                            },
                        });
                    } else {
                        await tx.customField.create({
                            data: {
                                inventoryId,
                                fieldType: field.fieldType,
                                title: field.title.trim(),
                                description: field.description,
                                showInTable: field.showInTable,
                                sortOrder: i,
                            },
                        });
                    }
                }
            });

            res.status(200).json({
                message: 'Custom field structure updated successfully',
            });
        } catch (error) {
            console.error('Error updating custom fields:', error);
            res.status(500).json({
                message: 'Server error while updating custom field structure',
            });
        }
    },
);

// --- Items APIs ---

router.post(
    '/:id/items',
    requireAuth,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const inventoryId = req.params.id;
            const userId = req.user!.id;

            const parsed = CreateItemSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ errors: parsed.error.issues });
            }
            const incomingFields = parsed.data.fields;

            const aggregatedSearchText = incomingFields
                .map((f) => {
                    const parts = [];
                    if (f.valueString) parts.push(f.valueString);
                    if (f.valueNumber !== null && f.valueNumber !== undefined)
                        parts.push(String(f.valueNumber));
                    if (f.valueBoolean !== null && f.valueBoolean !== undefined)
                        parts.push(f.valueBoolean ? 'true' : 'false');
                    return parts.join(' ');
                })
                .filter(Boolean)
                .join(' ');

            const inventory = await prisma.inventory.findUnique({
                where: { id: inventoryId },
                include: { accessList: true },
            });

            if (!inventory)
                return res.status(404).json({ message: 'Inventory not found' });

            if (!accessPolicy.canWrite(req.user, inventory)) {
                return res.status(403).json({
                    message: 'No access to add items',
                });
            }

            // ACID
            const newItem = await prisma.$transaction(async (tx) => {
                const updatedInv = await tx.inventory.update({
                    where: { id: inventoryId },
                    data: { idCounter: { increment: 1 } },
                    include: {
                        customIdElements: { orderBy: { sortOrder: 'asc' } },
                    },
                });

                const idElements = z
                    .array(CustomIdElementSchema)
                    .parse(updatedInv.customIdElements);
                const customId = generateCustomId(
                    idElements,
                    updatedInv.idCounter,
                );

                return tx.item.create({
                    data: {
                        inventoryId,
                        customId,
                        createdById: userId,
                        searchText: aggregatedSearchText,
                        fieldValues: {
                            create: incomingFields.map((field) => ({
                                customFieldId: field.customFieldId,
                                valueString: field.valueString,
                                valueNumber: field.valueNumber,
                                valueBoolean: field.valueBoolean,
                            })),
                        },
                    },
                    include: {
                        fieldValues: true,
                        createdBy: { select: { name: true, email: true } },
                    },
                });
            });

            res.status(201).json(newItem);
        } catch (error: any) {
            // TODO: Refine error typing here
            console.error('Error creating item:', error);

            if (
                error.code === 'P2002' &&
                error.meta?.target?.includes('customId')
            ) {
                return res.status(409).json({
                    code: 'CUSTOM_ID_CONFLICT',
                    message:
                        'Custom ID conflict: The generated ID already exists.',
                });
            }

            res.status(500).json({
                message: 'Server error while creating item',
            });
        }
    },
);

router.get(
    '/:id/items',
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;

            const [items, total] = await Promise.all([
                prisma.item.findMany({
                    where: { inventoryId: req.params.id },
                    include: {
                        createdBy: {
                            select: { id: true, name: true, avatarUrl: true },
                        },
                        fieldValues: {
                            include: {
                                customField: {
                                    select: {
                                        title: true,
                                        fieldType: true,
                                        showInTable: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.item.count({ where: { inventoryId: req.params.id } }),
            ]);

            res.status(200).json({
                items,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            });
        } catch (error) {
            res.status(500).json({
                message: 'Server error while fetching items',
            });
        }
    },
);

router.post(
    '/:id/items/bulk-delete',
    requireAuth,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const inventoryId = req.params.id;

            const parsed = BulkDeleteItemsSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ errors: parsed.error.issues });
            }
            const { ids } = parsed.data;
            if (ids.length === 0) {
                return res.status(200).json({ message: 'No items to delete' });
            }

            const inventory = await prisma.inventory.findUnique({
                where: { id: inventoryId },
                include: { accessList: true },
            });

            if (!inventory)
                return res.status(404).json({ message: 'Inventory not found' });

            if (!accessPolicy.canWrite(req.user, inventory)) {
                return res.status(403).json({
                    message: 'No access to delete items',
                });
            }

            const result = await prisma.item.deleteMany({
                where: {
                    id: { in: ids },
                    inventoryId: inventoryId,
                },
            });

            res.status(200).json({
                message: `Deleted ${result.count} items successfully`,
            });
        } catch (error) {
            console.error('Error in bulk delete:', error);
            res.status(500).json({
                message: 'Server error while deleting items',
            });
        }
    },
);

// --- Custom ID APIs ---

router.get(
    '/:id/id-format',
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const elements = await prisma.customIdElement.findMany({
                where: { inventoryId: req.params.id },
                orderBy: { sortOrder: 'asc' },
            });
            res.status(200).json(elements);
        } catch (error) {
            res.status(500).json({
                message: 'Server error while fetching custom ID format',
            });
        }
    },
);

router.get(
    '/:id/id-preview',
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const inventory = await prisma.inventory.findUnique({
                where: { id: req.params.id },
                include: {
                    customIdElements: { orderBy: { sortOrder: 'asc' } },
                },
            });
            if (!inventory) {
                return res.status(404).json({ message: 'Inventory not found' });
            }
            const parsedElements = z
                .array(CustomIdElementSchema)
                .parse(inventory.customIdElements);
            const previewId = generateCustomId(
                parsedElements,
                inventory.idCounter + 1,
            );
            res.status(200).json({ preview: previewId });
        } catch (error) {
            res.status(500).json({
                message: 'Server error while generating custom ID preview',
            });
        }
    },
);

router.put(
    '/:id/id-format',
    requireAuth,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const inventoryId = req.params.id;

            const inventory = await prisma.inventory.findUnique({
                where: { id: inventoryId },
                include: { createdBy: true, accessList: true },
            });
            if (!inventory)
                return res.status(404).json({ message: 'Inventory not found' });

            if (!accessPolicy.canManage(req.user, inventory)) {
                return res.status(403).json({
                    message: 'No permissions to update custom ID format',
                });
            }

            const parsed = z.array(CustomIdElementSchema).safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ errors: parsed.error.issues });
            }

            const incomingElements = parsed.data;

            await prisma.$transaction(async (tx) => {
                await tx.customIdElement.deleteMany({
                    where: { inventoryId },
                });

                if (incomingElements.length > 0) {
                    await tx.customIdElement.createMany({
                        data: incomingElements.map((elem, index) => ({
                            inventoryId,
                            elementType: elem.elementType,
                            config: elem.config,
                            sortOrder: index,
                        })),
                    });
                }
            });

            res.status(200).json({
                message: 'Custom ID format updated successfully',
            });
        } catch (error) {
            console.error('Error updating custom ID format:', error);
            res.status(500).json({
                message: 'Server error while updating custom ID format',
            });
        }
    },
);

// --- Discussion APIs ---

router.get(
    '/:id/comments',
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            // TODO: Standardize pagination approach across endpoints
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;

            const comments = await prisma.comment.findMany({
                where: { inventoryId: req.params.id },
                include: {
                    author: {
                        select: { id: true, name: true, avatarUrl: true },
                    },
                },
                orderBy: { createdAt: 'asc' },
                skip,
                take: limit,
            });

            res.status(200).json(comments);
        } catch (error) {
            res.status(500).json({
                message: 'Server error while fetching comments',
            });
        }
    },
);

router.post(
    '/:id/comments',
    requireAuth,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const parsed = CreateCommentSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ errors: parsed.error.issues });
            }

            const inventoryId = req.params.id;
            const userId = req.user!.id;

            const inventory = await prisma.inventory.findUnique({
                where: { id: inventoryId },
                include: { accessList: true },
            });

            if (!inventory)
                return res.status(404).json({ message: 'Inventory not found' });

            if (!accessPolicy.canWrite(req.user, inventory)) {
                return res.status(403).json({
                    message: 'No access to leave comments',
                });
            }

            const newComment = await prisma.comment.create({
                data: {
                    inventoryId,
                    authorId: userId,
                    content: parsed.data.content,
                },
                include: {
                    author: {
                        select: { id: true, name: true, avatarUrl: true },
                    },
                },
            });

            io.to(`inventory:${inventoryId}`).emit('newComment', newComment);

            res.status(201).json(newComment);
        } catch (error) {
            res.status(500).json({
                message: 'Server error while posting comment',
            });
        }
    },
);

// --- Statistics APIs ---

router.get(
    '/:id/stats',
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const inventoryId = req.params.id;

            const totalItems = await prisma.item.count({
                where: { inventoryId },
            });
            if (totalItems === 0) {
                return res.status(200).json({
                    totalItems: 0,
                    numericStats: [],
                    stringStats: [],
                });
            }

            const numericStats = await prisma.$queryRaw`
                SELECT
                    ifv."customFieldId",
                    MIN(ifv."valueNumber") AS min_val,
                    MAX(ifv."valueNumber") AS max_val,
                    AVG(ifv."valueNumber") AS avg_val,
                    CAST(COUNT(ifv.id) AS INTEGER) AS count_val
                FROM "ItemFieldValue" ifv
                JOIN "Item" i ON i.id = ifv."itemId"
                WHERE i."inventoryId" = ${inventoryId} AND ifv."valueNumber" IS NOT NULL
                GROUP BY ifv."customFieldId"
            `;

            const stringStats = await prisma.$queryRaw`
                WITH RankedValues AS (
                    SELECT
                        ifv."customFieldId",
                        ifv."valueString",
                        CAST(COUNT(ifv.id) AS INTEGER) AS frequency,
                        ROW_NUMBER() OVER(
                            PARTITION BY ifv."customFieldId"
                            ORDER BY COUNT(ifv.id) DESC
                        ) AS rank
                    FROM "ItemFieldValue" ifv
                    JOIN "Item" i ON i.id = ifv."itemId"
                    WHERE i."inventoryId" = ${inventoryId}
                        AND ifv."valueString" IS NOT NULL
                        AND ifv."valueString" != ''
                    GROUP BY ifv."customFieldId", ifv."valueString"
                )
                SELECT "customFieldId", "valueString", frequency
                FROM RankedValues
                WHERE rank <= 5
            `;

            res.status(200).json({
                totalItems,
                numericStats: JSON.parse(
                    JSON.stringify(numericStats, (_key, value) =>
                        typeof value === 'bigint' ? value.toString() : value,
                    ),
                ),
                stringStats: JSON.parse(
                    JSON.stringify(stringStats, (_key, value) =>
                        typeof value === 'bigint' ? value.toString() : value,
                    ),
                ),
            });
        } catch (error) {
            console.error('Error fetching inventory stats:', error);
            res.status(500).json({
                message: 'Server error while fetching inventory statistics',
            });
        }
    },
);

export default router;
