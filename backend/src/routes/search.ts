import { Router, Request, Response } from 'express';
import { Prisma, PrismaClient } from '../generated/prisma/client';
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

        if (!query || query.trim().length === 0) {
            return res.status(200).json({ inventories: [], items: [] });
        }

        const formattedQuery = query
            .trim()
            .split(/\s+/)
            .map((word) => `${word}:*`)
            .join(' & ');

        const inventories = await prisma.$queryRaw`
            SELECT id, title, description, "imageUrl", "category",
                ts_rank("searchVector", to_tsquery('simple', ${formattedQuery})) AS rank
            FROM "Inventory"
            WHERE "searchVector" @@ to_tsquery('simple', ${formattedQuery})
            ORDER BY rank DESC
            LIMIT 20;
        `;

        const items = await prisma.$queryRaw`
            SELECT i.id, i."customId", i."searchText", i."inventoryId",
                inv.title AS "inventoryTitle",
                ts_rank(i."searchVector", to_tsquery('simple', ${formattedQuery})) AS rank
            FROM "Item" i
            JOIN "Inventory" inv ON i."inventoryId" = inv.id
            WHERE i."searchVector" @@ to_tsquery('simple', ${formattedQuery})
            ORDER BY rank DESC
            LIMIT 20;
        `;

        res.status(200).json({ inventories, items });
    } catch (error) {
        console.error('Global search error:', error);
        res.status(500).json({ message: 'Server error during search' });
    }
});

export default router;
