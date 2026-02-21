import { z } from 'zod';

export const UserSchema = z.object({
    id: z.uuid(),
    email: z.email().nullable(),
    name: z.string().min(1, 'Name can not be empty'),
    avatarUrl: z.url().nullable(),
    role: z.enum(['USER', 'ADMIN']),
    blocked: z.boolean().default(false),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;
