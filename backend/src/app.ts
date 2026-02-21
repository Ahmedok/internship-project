import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import pg from 'pg';
import connectPgSimple from 'connect-pg-simple';
import './middleware/passport';
import authRoutes from './routes/auth';

const pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

const PostgresqlStore = connectPgSimple(session);

const app = express();

app.use(helmet());

app.use(
    cors({
        origin: 'http://localhost:3000',
        credentials: true,
    }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(
    session({
        store: new PostgresqlStore({
            pool: pgPool,
            tableName: 'Session',
            createTableIfMissing: false,
        }),
        secret: process.env.SESSION_SECRET || 'dev_secret_key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24,
        },
    }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
