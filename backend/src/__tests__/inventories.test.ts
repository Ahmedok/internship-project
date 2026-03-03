import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

const prismaMock = vi.hoisted(() => ({
    inventory: {
        findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
}));

vi.mock('../generated/prisma/client', () => ({
    PrismaClient: vi.fn(function () {
        return prismaMock;
    }),
}));

vi.mock('@prisma/adapter-pg', () => ({
    PrismaPg: vi.fn(),
}));

import inventoryRoutes from '../routes/inventories';
import { custom } from 'zod';

const app = express();
app.use(express.json());

let mockUser: any = null;

app.use((req: Request, res: Response, next: NextFunction) => {
    req.user = mockUser;
    req.isAuthenticated = vi.fn(() => !!mockUser) as any;
    next();
});

app.use('/api/inventories', inventoryRoutes);

describe('GET /api/inventories/:id', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = null;
    });

    it('should return 404 if inventory does not exist', async () => {
        prismaMock.inventory.findUnique.mockResolvedValueOnce(null);

        const res = await request(app).get('/api/inventories/invalid-id');

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Inventory not found');
    });

    it('should return private inventory for owner', async () => {
        mockUser = { id: 'creator-123', role: 'USER' };

        const mockInventory = {
            id: 'inventory-123',
            isPublic: false,
            createdById: 'creator-123',
            accessList: [],
        };

        prismaMock.inventory.findUnique.mockResolvedValueOnce(mockInventory);

        const res = await request(app).get('/api/inventories/inventory-123');

        expect(res.status).toBe(200);
        expect(res.body.id).toBe('inventory-123');
    });

    it('should return 403 Forbidden for private inventory if user is not owner', async () => {
        mockUser = { id: 'random-user-777', role: 'USER' };

        const mockInventory = {
            id: 'inventory-123',
            isPublic: false,
            createdById: 'creator-123',
            accessList: [],
        };

        prismaMock.inventory.findUnique.mockResolvedValueOnce(mockInventory);

        const res = await request(app).get('/api/inventories/inventory-123');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Access denied');
    });

    it('should return private inventory for admin even if not owner', async () => {
        mockUser = { id: 'admin-999', role: 'ADMIN' };

        const mockInventory = {
            id: 'inventory-123',
            isPublic: false,
            createdById: 'creator-123',
            accessList: [],
        };

        prismaMock.inventory.findUnique.mockResolvedValueOnce(mockInventory);

        const res = await request(app).get('/api/inventories/inventory-123');

        expect(res.status).toBe(200);
    });
});

describe('POST /api/inventories/:id/items', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = null;
    });

    it('should block item creation if user has no access', async () => {
        mockUser = { id: 'random-user-777', role: 'USER' };

        const mockInventory = {
            id: 'inventory-123',
            isPublic: false,
            createdById: 'creator-123',
            accessList: [],
        };

        prismaMock.inventory.findUnique.mockResolvedValue(mockInventory);

        const res = await request(app)
            .post('/api/inventories/inventory-123/items')
            .send({
                fields: [],
            });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('No access to add items');
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should create item and generate customId inside transaction', async () => {
        mockUser = { id: 'creator-123', role: 'USER' };

        const mockInventory = {
            id: 'inventory-123',
            isPublic: false,
            createdById: 'creator-123',
            accessList: [],
        };

        prismaMock.inventory.findUnique.mockResolvedValue(mockInventory);

        prismaMock.$transaction.mockImplementation(async (callback) => {
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
                        id: 'item-uuid',
                        customId: 'ITEM-005',
                        fieldValues: [
                            {
                                customFieldId:
                                    '123e4567-e89b-12d3-a456-426614174000',
                                valueString: 'Test',
                            },
                        ],
                    }),
                },
            };
            return callback(txMock);
        });

        const payload = {
            fields: [
                {
                    customFieldId: '123e4567-e89b-12d3-a456-426614174000',
                    valueString: 'Test',
                },
            ],
        };

        const res = await request(app)
            .post('/api/inventories/inventory-123/items')
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.customId).toBe('ITEM-005');
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });
});
