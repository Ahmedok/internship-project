import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { UpdatePreferenceSchema } from '@inventory/shared';

const router = Router();

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

router.patch(
    '/me/preferences',
    requireAuth,
    async (req: Request, res: Response) => {
        try {
            const parsed = UpdatePreferenceSchema.safeParse(req.body);

            if (!parsed.success) {
                return res.status(400).json({ errors: parsed.error.errors });
            }

            const { preferedLanguage, preferedTheme } = parsed.data;

            if (!preferedLanguage && !preferedTheme) {
                return res
                    .status(400)
                    .json({ error: 'No valid preferences provided' });
            }

            const updatedUser = await prisma.user.update({
                where: { id: req.user!.id },
                data: {
                    ...(preferedLanguage && { preferedLanguage }),
                    ...(preferedTheme && { preferedTheme }),
                },
                select: {
                    preferedLanguage: true,
                    preferedTheme: true,
                },
            });

            res.status(200).json(updatedUser);
        } catch (error) {
            console.error('Error updating user preferences:', error);
            res.status(500).json({
                error: 'Server error when updating preferences',
            });
        }
    },
);

router.get(
    '/admins/emails',
    requireAuth,
    async (req: Request, res: Response) => {
        try {
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { email: true },
            });

            const adminEmails = admins
                .filter((a) => a.email)
                .map((a) => a.email);

            return res.status(200).json(adminEmails);
        } catch (error) {
            console.error('Error fetching admin emails:', error);
            res.status(500).json({
                error: 'Server error when fetching admin emails',
            });
        }
    },
);

export default router;
