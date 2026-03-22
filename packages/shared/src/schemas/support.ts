import { z } from 'zod';

export const SupportTicketSchema = z.object({
    summary: z
        .string()
        .min(1, 'support.validation.required')
        .max(500, 'support.validation.max_length'),
    priority: z.enum(['Low', 'Average', 'High']),
    inventory: z.string().nullable().optional(),
    link: z.string().url(),
    adminEmails: z.array(z.string().email()).optional(),
});

export type SupportTicketInput = z.infer<typeof SupportTicketSchema>;
