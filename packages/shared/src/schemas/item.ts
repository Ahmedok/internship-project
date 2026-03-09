import { z } from 'zod';
import type { FieldType } from './inventory';

export const ItemFieldValueInputSchema = z.object({
    customFieldId: z.string().uuid(),
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

export const BulkDeleteItemsSchema = z.object({
    ids: z.array(z.string().uuid()),
});

export type ItemFieldValueInput = z.infer<typeof ItemFieldValueInputSchema>;
export type CreateItemInput = z.infer<typeof CreateItemSchema>;
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;

export interface ItemFieldValueDto {
    id: string;
    customFieldId: string;
    valueString: string | null;
    valueNumber: number | null;
    valueBoolean: boolean | null;
    customField?: {
        title: string;
        fieldType: FieldType;
    };
}

export interface InventoryItemDto {
    id: string;
    customId: string;
    inventoryId: string;
    version: number;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    createdBy: {
        id: string;
        name: string;
        avatarUrl: string | null;
    };
    fieldValues: ItemFieldValueDto[];
    inventory?: {
        title: string;
    };
}

export interface PaginatedItemsDto {
    items: InventoryItemDto[];
    total: number;
    page: number;
    totalPages: number;
}
