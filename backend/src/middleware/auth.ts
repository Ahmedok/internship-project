import { Request, Response, NextFunction } from 'express';
import { User } from '@inventory/shared';

export const requireAuth = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized: Please log in' });
};

export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const user = req.user as User | undefined;

    if (user && user.role === 'ADMIN') {
        return next();
    }
    res.status(403).json({ message: 'Forbidden: Admins rights required' });
};
