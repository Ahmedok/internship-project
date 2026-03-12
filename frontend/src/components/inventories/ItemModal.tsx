import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    validateCustomId,
    type CustomIdElementInput,
    type CustomFieldInput,
    type InventoryDetail,
} from '@inventory/shared';

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
    const { t } = useTranslation('common');
    const queryClient = useQueryClient();

    const [customIdConflict, setCustomIdConflict] = useState(false);
    const [manualCustomId, setManualCustomId] = useState<string>('');
    const [formatError, setFormatError] = useState(false);

    const { data: fields } = useQuery<CustomFieldInput[]>({
        queryKey: ['inventory-fields', inventory.id],
        queryFn: async () => {
            const res = await fetch(`/api/inventories/${inventory.id}/fields`);
            if (!res.ok) throw new Error('Failed to fetch fields');
            return res.json();
        },
        enabled: isOpen,
    });

    const { data: idPreview } = useQuery<{ preview: string }>({
        queryKey: ['inventory-id-preview', inventory.id],
        queryFn: async () => {
            const res = await fetch(
                `/api/inventories/${inventory.id}/id-preview`,
            );
            if (!res.ok) throw new Error('Failed to fetch ID preview');
            return res.json();
        },
        enabled: isOpen,
    });

    const { data: idElements } = useQuery<CustomIdElementInput[]>({
        queryKey: ['inventory-id-format', inventory.id],
        queryFn: async () => {
            const res = await fetch(
                `/api/inventories/${inventory.id}/id-format`,
            );
            if (!res.ok) throw new Error('Failed to fetch ID format');
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
        if (isOpen) {
            reset();
            setCustomIdConflict(false);
            setManualCustomId('');
            setFormatError(false);
        }
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

            const payload: { fields: typeof mappedFields; customId?: string } =
                { fields: mappedFields };

            if (manualCustomId.trim() !== '') {
                payload.customId = manualCustomId.trim();
            }

            const res = await fetch(`/api/inventories/${inventory.id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = (await res.json()) as {
                    message?: string;
                    code?: string;
                };
                const err = new Error(
                    errorData.message || 'Failed to create item',
                ) as Error & { code?: string };
                err.code = errorData.code;
                throw err;
            }
        },
        onSuccess: () => {
            setCustomIdConflict(false);
            setManualCustomId('');
            onClose();
            queryClient.invalidateQueries({
                queryKey: ['inventory-items', inventory.id],
            });
        },
        onError: (err: Error) => {
            if (
                (err as Error & { code?: string }).code === 'CUSTOM_ID_CONFLICT'
            ) {
                setCustomIdConflict(true);
            }
        },
    });

    const handleRegenerateId = async () => {
        setCustomIdConflict(false);
        setManualCustomId('');
        setFormatError(false);
        await queryClient.invalidateQueries({
            queryKey: ['inventory-id-preview', inventory.id],
        });
    };

    const onSubmit = (data: FormData) => {
        if (
            manualCustomId.trim() !== '' &&
            idElements &&
            idElements.length > 0
        ) {
            if (!validateCustomId(manualCustomId.trim(), idElements)) {
                setFormatError(true);
                return;
            }
        }
        setFormatError(false);
        saveMutation.mutate(data);
    };

    if (!fields) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-125">
                <DialogHeader>
                    <DialogTitle>{t('item_modal.title')}</DialogTitle>
                    <DialogDescription>
                        {t('item_modal.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-zinc-50 dark:bg-zinc-900 px-3 py-3 rounded-md text-sm border space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-medium">
                            {t('item_modal.custom_id')}
                        </span>
                        {!customIdConflict && !manualCustomId && (
                            <button
                                type="button"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                onClick={() =>
                                    setManualCustomId(idPreview?.preview || '')
                                }
                            >
                                {t('item_modal.edit_manually')}
                            </button>
                        )}
                    </div>

                    {customIdConflict || manualCustomId !== '' ? (
                        <Input
                            value={manualCustomId}
                            onChange={(e) => {
                                setManualCustomId(e.target.value);
                                setCustomIdConflict(false);
                                setFormatError(false);
                            }}
                            placeholder={t('item_modal.enter_unique_id')}
                            className={
                                customIdConflict
                                    ? 'border-red-500 bg-red-50 dark:bg-red-950'
                                    : ''
                            }
                        />
                    ) : (
                        <code className="font-mono font-bold text-zinc-800 dark:text-zinc-200 block bg-white dark:bg-zinc-950 p-2 border rounded">
                            {idPreview?.preview ?? t('item_modal.generating')}
                        </code>
                    )}

                    {customIdConflict && (
                        <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-xs mt-2">
                            <TriangleAlert className="shrink-0 w-4 h-4" />
                            <div className="flex gap-3 mt-2">
                                <p className="font-medium text-sm">
                                    {t('item_modal.id_conflict')}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleRegenerateId}
                                    className="text-blue-600 dark:text-blue-400 hover:underline mt-1 font-medium text-xs cursor-pointer"
                                >
                                    {t('item_modal.generate_new')}
                                </button>
                            </div>
                        </div>
                    )}

                    {formatError && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                            {t('item_modal.id_format_invalid')}
                        </p>
                    )}
                </div>

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
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form="item-form"
                        disabled={saveMutation.isPending || customIdConflict}
                    >
                        {saveMutation.isPending
                            ? t('common.saving')
                            : t('common.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
