import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

const prismaMock = vi.hoisted(() => ({
    inventory: {
        findUnique: vi.fn(),
    },
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
