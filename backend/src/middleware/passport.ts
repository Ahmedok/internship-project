import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { prisma } from '../lib/prisma';

passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
            clientSecret:
                process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
            callbackURL: '/api/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await prisma.user.findUnique({
                    where: {
                        provider_providerId: {
                            provider: 'google',
                            providerId: profile.id,
                        },
                    },
                });

                if (!user) {
                    user = await prisma.$transaction(async (tx) => {
                        const userCount = await tx.user.count();
                        return tx.user.create({
                            data: {
                                provider: 'google',
                                providerId: profile.id,
                                name: profile.displayName,
                                email: profile.emails?.[0]?.value,
                                avatarUrl: profile.photos?.[0]?.value,
                                role: userCount === 0 ? 'ADMIN' : 'USER',
                            },
                        });
                    });
                }

                return done(null, user);
            } catch (error) {
                return done(error as Error, undefined);
            }
        },
    ),
);

passport.use(
    new FacebookStrategy(
        {
            clientID: process.env.FACEBOOK_APP_ID || 'mock_fb_app_id',
            clientSecret:
                process.env.FACEBOOK_APP_SECRET || 'mock_fb_app_secret',
            callbackURL: '/api/auth/facebook/callback',
            profileFields: ['id', 'displayName', 'photos', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await prisma.user.findUnique({
                    where: {
                        provider_providerId: {
                            provider: 'facebook',
                            providerId: profile.id,
                        },
                    },
                });

                if (!user) {
                    user = await prisma.$transaction(async (tx) => {
                        const userCount = await tx.user.count();
                        return tx.user.create({
                            data: {
                                provider: 'facebook',
                                providerId: profile.id,
                                name: profile.displayName,
                                email: profile.emails?.[0]?.value,
                                avatarUrl: profile.photos?.[0]?.value,
                                role: userCount === 0 ? 'ADMIN' : 'USER',
                            },
                        });
                    });
                }
                return done(null, user);
            } catch (error) {
                return done(error as Error, undefined);
            }
        },
    ),
);

export default passport;
