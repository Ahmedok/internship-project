import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { requireAuth } from '../middleware/auth';

const router = Router();

const adapter = new PrismaPg({
    connectionString:
        process.env.DATABASE_URL ||
        'postgresql://user:password@localhost:5432/mydb',
});
const prisma = new PrismaClient({ adapter });

router.get('/search', requireAuth, async (req: Request, res: Response) => {
    try {
        const query = (req.query.q as string) || '';
        if (query.length < 2) {
            return res.status(200).json([]);
        }

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: 5,
            select: { id: true, name: true, email: true, avatarUrl: true },
        });

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error when searching users' });
    }
});

export default router;
