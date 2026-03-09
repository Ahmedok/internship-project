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
    preferedLanguage: z.enum(['en', 'ru']).default('en'),
    preferedTheme: z.enum(['light', 'dark', 'system']).default('system'),
});

export const UpdatePreferenceSchema = UserSchema.pick({
    preferedLanguage: true,
    preferedTheme: true,
}).partial();

export type User = z.infer<typeof UserSchema>;
export type UpdatePreferenceInput = z.infer<typeof UpdatePreferenceSchema>;
