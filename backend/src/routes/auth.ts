import { Router } from 'express';
import passport from 'passport';

const router = Router();

router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: 'http://localhost:3000/login',
    }),
    (req, res) => {
        res.redirect('http://localhost:3000/');
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
