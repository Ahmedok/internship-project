import { z } from 'zod';
import { User } from './user';

export const InventorySchema = z.object({
    title: z
        .string()
        .min(3, 'Title must be at least 3 characters long')
        .max(100, 'Title must be at most 100 characters long'),
    description: z.string().optional(),
    category: z.enum(['COLLECTIONS', 'ELECTRONICS', 'BOOKS', 'TOOLS', 'OTHER']),
    imageUrl: z.url().nullable().optional(),
    isPublic: z.boolean().default(true),
    tags: z
        .array(z.string())
        .max(10, 'You can specify up to 10 tags')
        .optional(),
    version: z.number().int().positive().optional(),
});

export type InventoryInput = z.infer<typeof InventorySchema>;

export interface Tag {
    id: string;
    name: string;
}

export interface InventoryAccessRecord {
    inventoryId: string;
    userId: string;
    user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface InventoryDetail {
    id: string;
    title: string;
    description: string | null;
    category: 'COLLECTIONS' | 'ELECTRONICS' | 'BOOKS' | 'TOOLS' | 'OTHER';
    imageUrl: string | null;
    isPublic: boolean;
    version: number;
    createdById: string;
    createdAt: string | Date;
    updatedAt: string | Date;

    idCounter: number;

    createdBy?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
    tags: { tag: Tag }[];
    accessList: InventoryAccessRecord[];
}

export const FieldTypeEnum = z.enum([
    'STRING',
    'TEXT',
    'NUMBER',
    'DOCUMENT',
    'BOOLEAN',
]);

export const CustomFieldSchema = z.object({
    id: z.uuid().optional(),
    fieldType: FieldTypeEnum,
    title: z.string().min(1, 'Field title is required').max(50),
    description: z.string().nullable().optional(),
    showInTable: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
});

export const CustomFieldUpdateSchema = z.array(CustomFieldSchema);

export type FieldType = z.infer<typeof FieldTypeEnum>;
export type CustomFieldInput = z.infer<typeof CustomFieldSchema>;
