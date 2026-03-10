/**
 * Sanitization tests — two layers:
 * 1. Unit tests for sanitizeInput() directly.
 * 2. Integration tests verifying that XSS payloads are stripped before the
 *    data reaches Prisma.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

// ──────────
// Unit tests
// ──────────

import { sanitizeInput } from '../utils/sanitize';

describe('sanitizeInput - unit', () => {
    it('returns an empty string for null', () => {
        expect(sanitizeInput(null)).toBe('');
    });

    it('returns an empty string for undefined', () => {
        expect(sanitizeInput(undefined)).toBe('');
    });

    it('strips <script> tags and their content entirely', () => {
        const result = sanitizeInput('<script>alert("xss")</script>');
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
    });

    it('strips inline event handlers from HTML elements', () => {
        const result = sanitizeInput('<img src="x" onerror="alert(1)">');
        expect(result).not.toContain('onerror');
    });

    it('strips javascript: URIs from anchor href', () => {
        const result = sanitizeInput(
            '<a href="javascript:alert(1)">click me</a>',
        );
        expect(result).not.toContain('javascript:');
    });

    it('strips nested / obfuscated script injection', () => {
        const result = sanitizeInput(
            '<div><script>document.cookie</script></div>',
        );
        expect(result).not.toContain('script');
        expect(result).not.toContain('document.cookie');
    });

    it('preserves safe plain text unchanged', () => {
        expect(sanitizeInput('Hello, world!')).toBe('Hello, world!');
    });

    it('preserves basic safe HTML tags', () => {
        const result = sanitizeInput('<b>bold</b> and <em>italic</em>');
        expect(result).toContain('bold');
        expect(result).toContain('italic');
    });

    it('removes script when mixed with legitimate text', () => {
        const result = sanitizeInput(
            'Safe text <script>alert(1)</script> more text',
        );
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
        expect(result).toContain('Safe text');
        expect(result).toContain('more text');
    });
});

// ─────────────────
// Integration tests
// ─────────────────

vi.mock('../socket', () => ({
    io: { to: vi.fn().mockReturnValue({ emit: vi.fn() }) },
}));

const prismaMock = vi.hoisted(() => ({
    inventory: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    comment: {
        create: vi.fn(),
    },
    $transaction: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: vi.fn() }));

import type { SessionUser } from '../types/express';
import inventoryRoutes from '../routes/inventories';

const app = express();
app.use(express.json());

let mockUser: Partial<SessionUser> & Pick<SessionUser, 'id' | 'role'> | null = null;

app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = mockUser as SessionUser | undefined ?? undefined;
    req.isAuthenticated = vi.fn(() => !!mockUser) as any;
    next();
});

app.use('/api/inventories', inventoryRoutes);

// POST /api/inventories

describe('sanitization integration - POST /api/inventories', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = { id: 'user-1', role: 'USER' };
        prismaMock.inventory.create.mockResolvedValue({
            id: 'inv-1',
            title: 'Test',
            description: '',
            tags: [],
        });
    });

    it('strips <script> tags from description before writing to DB', async () => {
        const res = await request(app).post('/api/inventories').send({
            title: 'Test Inventory',
            description: 'Legit text <script>alert("xss")</script>',
            category: 'OTHER',
            isPublic: true,
        });

        expect(res.status).toBe(201);

        const [createArg] = prismaMock.inventory.create.mock.calls[0] as [
            { data: { description: string } },
        ];
        expect(createArg.data.description).not.toContain('<script>');
        expect(createArg.data.description).not.toContain('alert');
        expect(createArg.data.description).toContain('Legit text');
    });

    it('strips inline event handlers from description before writing to DB', async () => {
        const res = await request(app).post('/api/inventories').send({
            title: 'Test Inventory',
            description: '<p onmouseover="steal()">Hover me</p>',
            category: 'OTHER',
            isPublic: true,
        });

        expect(res.status).toBe(201);

        const [createArg] = prismaMock.inventory.create.mock.calls[0] as [
            { data: { description: string } },
        ];
        expect(createArg.data.description).not.toContain('onmouseover');
        expect(createArg.data.description).not.toContain('steal()');
    });
});

// PATCH /api/inventories/:id

describe('sanitization integration - PATCH /api/inventories/:id', () => {
    const inventoryId = 'inv-patch-test';

    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = { id: 'creator-1', role: 'USER' };
        prismaMock.inventory.findUnique.mockResolvedValue({
            id: inventoryId,
            isPublic: false,
            createdById: 'creator-1',
            version: 1,
            accessList: [],
        });
        prismaMock.inventory.update.mockResolvedValue({
            id: inventoryId,
            title: 'Updated',
            description: '',
            version: 2,
            tags: [],
        });
    });

    it('strips <script> tags from description before writing to DB', async () => {
        const res = await request(app)
            .patch(`/api/inventories/${inventoryId}`)
            .send({
                title: 'Updated',
                description: 'Clean <script>evil()</script> text',
                category: 'OTHER',
                isPublic: true,
                version: 1,
            });

        expect(res.status).toBe(200);

        const [updateArg] = prismaMock.inventory.update.mock.calls[0] as [
            { data: { description: string } },
        ];
        expect(updateArg.data.description).not.toContain('<script>');
        expect(updateArg.data.description).not.toContain('evil()');
        expect(updateArg.data.description).toContain('Clean');
        expect(updateArg.data.description).toContain('text');
    });

    it('strips javascript: URIs from description before writing to DB', async () => {
        const res = await request(app)
            .patch(`/api/inventories/${inventoryId}`)
            .send({
                title: 'Updated',
                description: '<a href="javascript:void(fetch(\'/steal\'))">x</a>',
                category: 'OTHER',
                isPublic: true,
                version: 1,
            });

        expect(res.status).toBe(200);

        const [updateArg] = prismaMock.inventory.update.mock.calls[0] as [
            { data: { description: string } },
        ];
        expect(updateArg.data.description).not.toContain('javascript:');
    });
});

// POST /api/inventories/:id/comments

describe('sanitization integration - POST /api/inventories/:id/comments', () => {
    const inventoryId = 'inv-comment-test';

    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = { id: 'user-1', role: 'USER' };
        prismaMock.inventory.findUnique.mockResolvedValue({
            id: inventoryId,
            isPublic: true,
            createdById: 'creator-1',
            accessList: [],
        });
        prismaMock.comment.create.mockResolvedValue({
            id: 'comment-1',
            content: '',
            inventoryId,
            authorId: 'user-1',
            author: { id: 'user-1', name: 'User', avatarUrl: null },
            createdAt: new Date().toISOString(),
        });
    });

    it('strips <script> tags from comment content before writing to DB', async () => {
        const res = await request(app)
            .post(`/api/inventories/${inventoryId}/comments`)
            .send({ content: 'Nice <script>alert(document.cookie)</script> item!' });

        expect(res.status).toBe(201);

        const [commentArg] = prismaMock.comment.create.mock.calls[0] as [
            { data: { content: string } },
        ];
        expect(commentArg.data.content).not.toContain('<script>');
        expect(commentArg.data.content).not.toContain('document.cookie');
        expect(commentArg.data.content).toContain('Nice');
        expect(commentArg.data.content).toContain('item!');
    });

    it('strips inline event handlers from comment content before writing to DB', async () => {
        const res = await request(app)
            .post(`/api/inventories/${inventoryId}/comments`)
            .send({ content: '<p onclick="stealData()">Click me</p>' });

        expect(res.status).toBe(201);

        const [commentArg] = prismaMock.comment.create.mock.calls[0] as [
            { data: { content: string } },
        ];
        expect(commentArg.data.content).not.toContain('onclick');
        expect(commentArg.data.content).not.toContain('stealData');
    });
});
