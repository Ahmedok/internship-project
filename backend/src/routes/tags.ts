import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const router = Router();

const adapter = new PrismaPg({
    connectionString:
        process.env.DATABASE_URL ||
        'postgresql://user:password@localhost:5432/mydb',
});
const prisma = new PrismaClient({ adapter });

router.get('/', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;

        if (!query || query.trim() === '') {
            return res.status(200).json([]);
        }

        const tags = await prisma.tag.findMany({
            where: {
                name: {
                    contains: query.toLowerCase(),
                },
            },
            take: 10,
            select: { name: true },
        });

        res.status(200).json(tags.map((tag) => tag.name));
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Server error while fetching tags' });
    }
});

router.get('/cloud', async (_req: Request, res: Response) => {
    try {
        const tags = await prisma.tag.findMany({
            select: {
                id: true,
                name: true,
                _count: {
                    select: { inventories: true },
                },
            },
            orderBy: {
                inventories: {
                    _count: 'desc',
                },
            },
            take: 50,
        });

        const formattedTags = tags
            .map((tag) => ({
                id: tag.id,
                name: tag.name,
                count: tag._count.inventories,
            }))
            .filter((tag) => tag.count > 0);

        res.status(200).json(formattedTags);
    } catch (error) {
        console.error('Error fetching tag cloud:', error);
        res.status(500).json({
            error: 'Server error while fetching tag cloud',
        });
    }
});

export default router;
