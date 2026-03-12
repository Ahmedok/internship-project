import { Router } from 'express';
import passport from 'passport';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authLimiter);

const frontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login',
    }),
    (req, res) => {
        res.redirect(frontendUrl());
    },
);

router.get(
    '/facebook',
    passport.authenticate('facebook', { scope: ['email'] }),
);

router.get(
    '/facebook/callback',
    passport.authenticate('facebook', {
        failureRedirect: '/login',
    }),
    (req, res) => {
        res.redirect(frontendUrl());
    },
);

router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.status(200).json(req.user);
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});

router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.status(200).json({ message: 'Logged out successfully' });
        });
    });
});

export default router;
