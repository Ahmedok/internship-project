import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { requireAuth } from '../middleware/auth';
import { UpdateItemSchema } from '@inventory/shared';

const router = Router();

const adapter = new PrismaPg({
    connectionString:
        process.env.DATABASE_URL ||
        'postgresql://user:password@localhost:5432/mydb',
});
const prisma = new PrismaClient({ adapter });

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
        const item = await prisma.item.findUnique({
            where: { id: req.params.id },
            include: {
                inventory: {
                    select: {
                        id: true,
                        isPublic: true,
                        createdById: true,
                        accessList: true,
                    },
                },
                createdBy: { select: { id: true, name: true } },
                fieldValues: true,
            },
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching item' });
    }
});
