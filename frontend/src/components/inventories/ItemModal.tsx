import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import type { CustomFieldInput, InventoryDetail } from '@inventory/shared';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    inventory: InventoryDetail;
}

export function ItemModal({ isOpen, onClose, inventory }: ItemModalProps) {
    const queryClient = useQueryClient();

    const { data: fields } = useQuery<CustomFieldInput[]>({
        queryKey: ['inventory-fields', inventory.id],
        queryFn: async () => {
            const res = await fetch(`/api/inventories/${inventory.id}/fields`);
            if (!res.ok) throw new Error('Failed to fetch fields');
            return res.json();
        },
        enabled: isOpen,
    });

    const dynamicSchema = useMemo(() => {
        if (!fields) return z.object({});

        const schemaShape: Record<string, z.ZodTypeAny> = {};

        fields.forEach((field) => {
            if (
                field.fieldType === 'STRING' ||
                field.fieldType === 'TEXT' ||
                field.fieldType === 'DOCUMENT'
            ) {
                schemaShape[field.id!] = z.string().optional();
            } else if (field.fieldType === 'NUMBER') {
                schemaShape[field.id!] = z
                    .number({ invalid_type_error: 'Number is expected' })
                    .optional();
            } else if (field.fieldType === 'BOOLEAN') {
                schemaShape[field.id!] = z.boolean().optional();
            }
        });

        return z.object(schemaShape);
    }, [fields]);

    type FormData = Record<string, unknown>;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(dynamicSchema),
    });

    useEffect(() => {
        if (isOpen) reset();
    }, [isOpen, reset]);

    const saveMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const mappedFields =
                fields?.map((f) => {
                    const value = data[f.id!];
                    return {
                        customFieldId: f.id!,
                        valueString:
                            (f.fieldType === 'STRING' ||
                                f.fieldType === 'TEXT' ||
                                f.fieldType === 'DOCUMENT') &&
                            value
                                ? String(value)
                                : null,
                        valueNumber:
                            f.fieldType === 'NUMBER' &&
                            value !== undefined &&
                            value !== '' &&
                            !isNaN(Number(value))
                                ? Number(value)
                                : null,
                        valueBoolean:
                            f.fieldType === 'BOOLEAN' && value !== undefined
                                ? Boolean(value)
                                : null,
                    };
                }) || [];

            const res = await fetch(`/api/inventories/${inventory.id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: mappedFields }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create item');
            }
        },
        onSuccess: () => {
            onClose();
            queryClient.invalidateQueries({
                queryKey: ['inventory-items', inventory.id],
            });
        },
        onError: (err: Error) => {
            alert(err.message); // TODO: Replace with toast notification
        },
    });

    const onSubmit = (data: FormData) => saveMutation.mutate(data);

    if (!fields) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-125">
                <DialogHeader>
                    <DialogTitle>Add Item</DialogTitle>
                    <DialogDescription>
                        Fill out item details below. Custom ID is generated
                        automatically, but you can specify your own in the
                        settings.
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="item-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    {fields.map((field) => (
                        <div key={field.id} className="space-y-1">
                            <label className="text-sm font-medium">
                                {field.title}{' '}
                                {field.fieldType === 'DOCUMENT' && '(URL)'}
                            </label>

                            {field.fieldType === 'BOOLEAN' ? (
                                <div className="flex items-center mt-2">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4"
                                        {...register(field.id!)}
                                    />
                                    <span className="ml-2 text-sm text-zinc-500">
                                        True / False
                                    </span>
                                </div>
                            ) : (
                                <Input
                                    type={
                                        field.fieldType === 'NUMBER'
                                            ? 'number'
                                            : 'text'
                                    }
                                    step={
                                        field.fieldType === 'NUMBER'
                                            ? 'any'
                                            : undefined
                                    }
                                    placeholder={field.description || ''}
                                    {...register(field.id!, {
                                        setValueAs: (v) =>
                                            field.fieldType === 'NUMBER' &&
                                            v !== ''
                                                ? parseFloat(v)
                                                : v,
                                    })}
                                />
                            )}

                            {errors[field.id!] && (
                                <span className="text-sm text-red-500">
                                    {String(errors[field.id!]?.message)}
                                </span>
                            )}
                        </div>
                    ))}
                </form>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="item-form"
                        disabled={saveMutation.isPending}
                    >
                        {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
