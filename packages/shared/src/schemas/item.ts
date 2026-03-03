import { z } from 'zod';

export const ItemFieldValueInputSchema = z.object({
    customFieldId: z.uuid(),
    valueString: z.string().nullable().optional(),
    valueNumber: z.number().nullable().optional(),
    valueBoolean: z.boolean().nullable().optional(),
});

export const CreateItemSchema = z.object({
    fields: z.array(ItemFieldValueInputSchema),
});

export const UpdateItemSchema = z.object({
    customId: z.string().min(1).optional(),
    fields: z.array(ItemFieldValueInputSchema).optional(),
    version: z.number().int(),
});

export type ItemFieldValueInput = z.infer<typeof ItemFieldValueInputSchema>;
export type CreateItemInput = z.infer<typeof CreateItemSchema>;
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;
