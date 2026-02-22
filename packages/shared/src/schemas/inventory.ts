import { z } from 'zod';

export const InventorySchema = z.object({
    title: z
        .string()
        .min(3, 'Title must be at least 3 characters long')
        .max(100, 'Title must be at most 100 characters long'),
    description: z.string().optional(),
    category: z.enum(['COLLECTIONS', 'ELECTRONICS', 'BOOKS', 'TOOLS', 'OTHER']),
    isPublic: z.boolean().default(true),
    tags: z
        .array(z.string())
        .max(10, 'You can specify up to 10 tags')
        .optional(),
    version: z.number().int().positive().optional(),
});

export type InventoryInput = z.infer<typeof InventorySchema>;
