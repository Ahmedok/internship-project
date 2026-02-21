import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
    connectionString:
        process.env.DATABASE_URL ||
        'postgresql://user:password@localhost:5432/mydb',
});

const prisma = new PrismaClient({ adapter });

passport.serializeUser((user: any, done) => {
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
                    user = await prisma.user.create({
                        data: {
                            provider: 'google',
                            providerId: profile.id,
                            name: profile.displayName,
                            email: profile.emails?.[0]?.value,
                            avatarUrl: profile.photos?.[0]?.value,
                        },
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
                    user = await prisma.user.create({
                        data: {
                            provider: 'facebook',
                            providerId: profile.id,
                            name: profile.displayName,
                            email: profile.emails?.[0]?.value,
                            avatarUrl: profile.photos?.[0]?.value,
                        },
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
