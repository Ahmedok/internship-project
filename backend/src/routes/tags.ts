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

export default router;
