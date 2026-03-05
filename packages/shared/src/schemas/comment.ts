import { z } from 'zod';

export const CreateCommentSchema = z.object({
    content: z
        .string()
        .min(1, 'Comment cannot be empty')
        .max(5000, 'Comment cannot exceed 5000 characters'),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

export interface CommentAuthorDto {
    id: string;
    name: string;
    avatarUrl: string | null;
}

export interface CommentDto {
    id: string;
    inventoryId: string;
    authorId: string;
    content: string;
    createdAt: string;
    author: CommentAuthorDto;
}
