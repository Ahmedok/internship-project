import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

vi.mock('../socket', () => ({
    io: { to: vi.fn().mockReturnValue({ emit: vi.fn() }) },
}));

const prismaMock = vi.hoisted(() => ({
    inventory: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    $transaction: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
    prisma: prismaMock,
}));

vi.mock('@prisma/adapter-pg', () => ({
    PrismaPg: vi.fn(),
}));

import inventoryRoutes from '../routes/inventories';

const app = express();
app.use(express.json());

let mockUser: any = null;

app.use((req: Request, res: Response, next: NextFunction) => {
    req.user = mockUser;
    req.isAuthenticated = vi.fn(() => !!mockUser) as any;
    next();
});

app.use('/api/inventories', inventoryRoutes);

// ---------------------------------------------------------------------------
// GET /api/inventories/:id — public endpoint, no auth required
// ---------------------------------------------------------------------------
describe('GET /api/inventories/:id', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = null;
    });

    it('returns 404 when the inventory does not exist', async () => {
        prismaMock.inventory.findUnique.mockResolvedValueOnce(null);

        const res = await request(app).get('/api/inventories/does-not-exist');

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Inventory not found');
    });

    it('returns an inventory to an unauthenticated user', async () => {
        prismaMock.inventory.findUnique.mockResolvedValueOnce({
            id: 'inv-public',
            isPublic: true,
            createdById: 'creator-123',
            accessList: [],
        });

        const res = await request(app).get('/api/inventories/inv-public');

        expect(res.status).toBe(200);
        expect(res.body.id).toBe('inv-public');
    });
});

// ---------------------------------------------------------------------------
// POST /api/inventories/:id/items — requires WRITE access
// ---------------------------------------------------------------------------
describe('POST /api/inventories/:id/items — write access', () => {
    const inventoryId = 'inventory-write-test';

    const privateInventory = {
        id: inventoryId,
        isPublic: false,
        createdById: 'creator-123',
        accessList: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = null;
    });

    it('returns 401 when no user is authenticated', async () => {
        const res = await request(app)
            .post(`/api/inventories/${inventoryId}/items`)
            .send({ fields: [] });

        expect(res.status).toBe(401);
    });

    it('returns 403 when the authenticated user has no write access', async () => {
        mockUser = { id: 'outsider-456', role: 'USER' };
        prismaMock.inventory.findUnique.mockResolvedValueOnce(privateInventory);

        const res = await request(app)
            .post(`/api/inventories/${inventoryId}/items`)
            .send({ fields: [] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('No access to add items');
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('creates an item and generates a customId when the owner posts', async () => {
        mockUser = { id: 'creator-123', role: 'USER' };
        prismaMock.inventory.findUnique.mockResolvedValueOnce(privateInventory);

        prismaMock.$transaction.mockImplementationOnce(async (callback) => {
            const txMock = {
                inventory: {
                    update: vi.fn().mockResolvedValue({
                        idCounter: 5,
                        customIdElements: [
                            {
                                elementType: 'FIXED_TEXT',
                                config: { value: 'ITEM-' },
                                sortOrder: 0,
                            },
                            {
                                elementType: 'SEQUENCE',
                                config: { padding: 3 },
                                sortOrder: 1,
                            },
                        ],
                    }),
                },
                item: {
                    create: vi.fn().mockResolvedValue({
                        id: 'new-item-uuid',
                        customId: 'ITEM-005',
                        fieldValues: [],
                    }),
                },
            };
            return callback(txMock);
        });

        const res = await request(app)
            .post(`/api/inventories/${inventoryId}/items`)
            .send({
                fields: [
                    {
                        customFieldId: '123e4567-e89b-12d3-a456-426614174000',
                        valueString: 'Test value',
                    },
                ],
            });

        expect(res.status).toBe(201);
        expect(res.body.customId).toBe('ITEM-005');
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// PATCH /api/inventories/:id — requires MANAGE access (owner or admin only)
// ---------------------------------------------------------------------------
describe('PATCH /api/inventories/:id — manage access', () => {
    const inventoryId = 'inventory-manage-test';

    const privateInventory = {
        id: inventoryId,
        isPublic: false,
        createdById: 'creator-123',
        version: 3,
        accessList: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = null;
    });

    it('returns 401 when no user is authenticated', async () => {
        const res = await request(app)
            .patch(`/api/inventories/${inventoryId}`)
            .send({ title: 'New title', version: 3 });

        expect(res.status).toBe(401);
    });

    it('returns 403 when an access-list member (write-only) tries to patch', async () => {
        mockUser = { id: 'collaborator-789', role: 'USER' };
        prismaMock.inventory.findUnique.mockResolvedValueOnce({
            ...privateInventory,
            accessList: [{ userId: 'collaborator-789' }],
        });

        const res = await request(app)
            .patch(`/api/inventories/${inventoryId}`)
            .send({ title: 'Sneaky rename', version: 3 });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('No management access');
        expect(prismaMock.inventory.update).not.toHaveBeenCalled();
    });

    it('updates the inventory when called by the owner', async () => {
        mockUser = { id: 'creator-123', role: 'USER' };
        prismaMock.inventory.findUnique.mockResolvedValueOnce(privateInventory);
        prismaMock.inventory.update.mockResolvedValueOnce({
            ...privateInventory,
            title: 'Updated title',
            version: 4,
            tags: [],
        });

        const res = await request(app)
            .patch(`/api/inventories/${inventoryId}`)
            .send({ title: 'Updated title', version: 3 });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Updated title');
        expect(prismaMock.inventory.update).toHaveBeenCalledTimes(1);
    });
});
