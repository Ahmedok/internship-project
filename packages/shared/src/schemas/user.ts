import { z } from 'zod';

export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email().nullable(),
    name: z.string().min(1, 'Name can not be empty'),
    avatarUrl: z.string().url().nullable(),
    role: z.enum(['USER', 'ADMIN']),
    blocked: z.boolean().default(false),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export const UpdatePreferenceSchema = z.object({
    preferedLanguage: z.enum(['en', 'ru']).optional(),
    preferedTheme: z.enum(['light', 'dark', 'system']).optional(),
});

export type User = z.infer<typeof UserSchema>;
export type UpdatePreferenceInput = z.infer<typeof UpdatePreferenceSchema>;
