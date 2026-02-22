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

router.get('/users', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || '';

        const skip = (page - 1) * limit;

        const whereClause = search
            ? {
                  OR: [
                      {
                          name: {
                              contains: search,
                              mode: 'insensitive' as const,
                          },
                      },
                      {
                          email: {
                              contains: search,
                              mode: 'insensitive' as const,
                          },
                      },
                  ],
              }
            : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where: whereClause }),
        ]);

        res.status(200).json({
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

router.patch(
    '/users/:id/role',
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (role !== 'USER' && role !== 'ADMIN') {
                return res.status(400).json({ message: 'Invalid role' });
            }

            const updatedUser = await prisma.user.update({
                where: { id },
                data: { role },
            });

            res.status(200).json(updatedUser);
        } catch (error) {
            res.status(500).json({ message: 'Error updating user role' });
        }
    },
);

router.patch(
    '/users/:id/block',
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const { id } = req.params;
            const { blocked } = req.body;

            if (typeof blocked !== 'boolean') {
                return res
                    .status(400)
                    .json({ message: 'Blocked parameter must be a boolean' });
            }

            const updatedUser = await prisma.user.update({
                where: { id },
                data: { blocked },
            });

            res.status(200).json(updatedUser);
        } catch (error) {
            res.status(500).json({
                message: 'Error changing user blocked status',
            });
        }
    },
);

router.delete(
    '/users/:id',
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const { id } = req.params;

            await prisma.user.delete({
                where: { id },
            });

            res.status(200).json({ message: 'User deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting user' });
        }
    },
);

export default router;
