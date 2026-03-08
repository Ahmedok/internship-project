import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
    connectionString:
        process.env.DATABASE_URL ||
        'postgresql://user:password@localhost:5432/mydb',
});

export const prisma = new PrismaClient({ adapter });
