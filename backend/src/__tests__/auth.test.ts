import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import authRoutes from '../routes/auth';

const app = express();
app.use(express.json());

let mockIsAuthenticated = false;
let mockUser: any = null;

app.use((req: Request, res: Response, next: NextFunction) => {
    req.isAuthenticated = vi.fn(
        function(this: Request) { return mockIsAuthenticated; }
    ) as unknown as (this: Request) => this is any;

    req.user = mockUser;

    req.logout = vi.fn((callback: (err?: any) => void) => {
        mockIsAuthenticated = false;
        mockUser = null;
        callback();
    }) as any;

    req.session = {
        destroy: vi.fn((callback: () => void) => {
            callback();
        }),
    } as any;

    next();
});

app.use('/api/auth', authRoutes);

describe('Auth Routes (/api/auth)', () => {
    beforeEach(() => {
        mockIsAuthenticated = false;
        mockUser = null;
        vi.clearAllMocks();
    });

    describe('GET /me', () => {
        it('should return 401 when user is not authenticated', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(401);
            expect(res.body).toEqual({ message: 'Unauthorized' });
        });

        it('should return user data when user IS authenticated', async () => {
            mockIsAuthenticated = true;
            mockUser = { id: 'user-123', name: 'John Doe', role: 'USER' };

            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockUser);
        });
    });

    describe('POST /logout', () => {
        it('should call req.logout and destroy session', async () => {
            mockIsAuthenticated = true;
            mockUser = { id: 'user-123' };

            const res = await request(app).post('/api/auth/logout');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ message: 'Logged out successfully' });

            expect(mockIsAuthenticated).toBe(false);

            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies![0]).toMatch(/connect\.sid=;/);
        });
    });
});
