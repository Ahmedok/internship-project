import { z } from 'zod';

export const CreateCommentSchema = z.object({
    content: z
        .string()
        .min(1, 'Comment cannot be empty')
        .max(5000, 'Comment cannot exceed 5000 characters'),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
