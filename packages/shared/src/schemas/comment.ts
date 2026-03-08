import { z } from 'zod';
import { User } from './user';

export const CreateCommentSchema = z.object({
    content: z
        .string()
        .min(1, 'Comment cannot be empty')
        .max(5000, 'Comment cannot exceed 5000 characters'),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

export type CommentAuthorDto = Pick<User, 'id' | 'name' | 'avatarUrl'>;

export interface CommentDto {
    id: string;
    inventoryId: string;
    authorId: string;
    content: string;
    createdAt: string;
    author: CommentAuthorDto;
}
