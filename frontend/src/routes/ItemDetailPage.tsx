import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { TriangleAlert } from 'lucide-react';
import type {
    InventoryItemDto,
    ItemFieldValueDto,
    CustomFieldInput,
    InventoryDetail,
} from '@inventory/shared';
import { useAuthStore } from '@/stores/authStore';
import { canWrite } from '@/lib/permissions';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface LikeData {
    count: number;
    isLiked: boolean;
}

type FormData = Record<string, unknown>;

export default function ItemDetailPage() {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [conflictType, setConflictType] = useState<
        'version' | 'custom_id' | null
    >(null);
    const [customIdInput, setCustomIdInput] = useState('');
    const editVersionRef = useRef<number | null>(null);
    const versionOverrideRef = useRef<number | null>(null);
    const lastFormDataRef = useRef<FormData | null>(null);
    const formInitializedRef = useRef(false);

    const {
        data: item,
        isLoading,
        error,
    } = useQuery<InventoryItemDto>({
        queryKey: ['item-detail', id],
        queryFn: async () => {
            const res = await fetch(`/api/items/${id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Item not found');
                throw new Error('Data fetch failed');
            }
            return res.json();
        },
    });

    const { data: inventory } = useQuery<InventoryDetail>({
        queryKey: ['inventory', item?.inventoryId],
        queryFn: async () => {
            const res = await fetch(`/api/inventories/${item!.inventoryId}`);
            if (!res.ok) throw new Error('Failed to fetch inventory');
            return res.json();
        },
        enabled: !!item?.inventoryId,
    });

    const { data: fields } = useQuery<CustomFieldInput[]>({
        queryKey: ['inventory-fields', item?.inventoryId],
        queryFn: async () => {
            const res = await fetch(
                `/api/inventories/${item!.inventoryId}/fields`,
            );
            if (!res.ok) throw new Error('Failed to fetch fields');
            return res.json();
        },
        enabled: isEditing && !!item?.inventoryId,
    });

    const { data: likeData } = useQuery<LikeData>({
        queryKey: ['item-like', id],
        queryFn: async () => {
            const res = await fetch(`/api/items/${id}/like`);
            if (!res.ok) throw new Error('Failed to fetch likes');
            return res.json();
        },
        enabled: !!id,
    });

    const likeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/items/${id}/like`, {
                method: 'POST',
            });
            if (res.status === 401) {
                throw new Error('401 Unauthorized');
            }
            if (!res.ok) throw new Error('Failed to toggle like');
            return res.json();
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['item-like', id] });
            const previousLikeData = queryClient.getQueryData<LikeData>([
                'item-like',
                id,
            ]);
            queryClient.setQueryData<LikeData>(['item-like', id], (old) => {
                if (!old) return { count: 1, isLiked: true };
                return {
                    isLiked: !old.isLiked,
                    count: old.isLiked
                        ? Math.max(0, old.count - 1)
                        : old.count + 1,
                };
            });
            return { previousLikeData };
        },
        onError: (err: Error, _newTodo, context) => {
            if (err.message.includes('401')) {
                toast.error('You must be logged in to like items');
            }
            if (context?.previousLikeData) {
                queryClient.setQueryData<LikeData>(
                    ['item-like', id],
                    context.previousLikeData,
                );
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['item-like', id] });
        },
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

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(dynamicSchema),
    });

    useEffect(() => {
        if (isEditing && fields && item && !formInitializedRef.current) {
            setCustomIdInput(item.customId);
            item.fieldValues.forEach((fv) => {
                const fieldDef = fields.find((f) => f.id === fv.customFieldId);
                if (!fieldDef) return;
                if (fieldDef.fieldType === 'NUMBER')
                    setValue(fv.customFieldId, fv.valueNumber ?? undefined);
                else if (fieldDef.fieldType === 'BOOLEAN')
                    setValue(fv.customFieldId, fv.valueBoolean ?? false);
                else setValue(fv.customFieldId, fv.valueString ?? '');
            });
            formInitializedRef.current = true;
        }
    }, [isEditing, fields, item, setValue]);

    const saveMutation = useMutation({
        mutationFn: async (data: FormData) => {
            if (!item || !fields) return;
            const mappedFields = fields.map((f) => {
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
            });
            const versionToSend =
                versionOverrideRef.current ??
                editVersionRef.current ??
                item.version;
            const res = await fetch(`/api/items/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: mappedFields,
                    customId: customIdInput,
                    version: versionToSend,
                }),
            });
            if (!res.ok) {
                const errorData = (await res.json()) as {
                    message?: string;
                    code?: string;
                };
                const err = new Error(
                    errorData.message || 'Failed to save item',
                ) as Error & { code?: string };
                err.code = errorData.code;
                throw err;
            }
            return res.json();
        },
        onSuccess: () => {
            versionOverrideRef.current = null;
            editVersionRef.current = null;
            formInitializedRef.current = false;
            setConflictType(null);
            queryClient.invalidateQueries({ queryKey: ['item-detail', id] });
            setIsEditing(false);
        },
        onError: (err: Error) => {
            const code = (err as Error & { code?: string }).code;
            if (code === 'VERSION_CONFLICT') {
                setConflictType('version');
            } else if (code === 'CUSTOM_ID_CONFLICT') {
                setConflictType('custom_id');
            }
        },
    });

    const onSubmit = (data: FormData) => {
        lastFormDataRef.current = data;
        saveMutation.mutate(data);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setConflictType(null);
        editVersionRef.current = null;
        versionOverrideRef.current = null;
        formInitializedRef.current = false;
        reset();
    };

    const handleReload = async () => {
        try {
            const res = await fetch(`/api/items/${id}`);
            if (!res.ok) throw new Error('Failed to reload item');
            const freshItem: InventoryItemDto = await res.json();
            const newFormValues: FormData = {};
            freshItem.fieldValues.forEach((fv) => {
                const fieldDef = fields?.find((f) => f.id === fv.customFieldId);
                if (!fieldDef) return;
                if (fieldDef.fieldType === 'NUMBER')
                    newFormValues[fv.customFieldId] =
                        fv.valueNumber ?? undefined;
                else if (fieldDef.fieldType === 'BOOLEAN')
                    newFormValues[fv.customFieldId] = fv.valueBoolean ?? false;
                else newFormValues[fv.customFieldId] = fv.valueString ?? '';
            });
            reset(newFormValues);
            setCustomIdInput(freshItem.customId);
            setConflictType(null);
            queryClient.setQueryData<InventoryItemDto>(
                ['item-detail', id],
                freshItem,
            );
        } catch (error) {
            console.error('Failed to reload item:', error);
        }
    };

    const handleOverwrite = async () => {
        try {
            const res = await fetch(`/api/items/${id}`);
            if (!res.ok) throw new Error('Failed to fetch latest version');
            const freshItem: InventoryItemDto = await res.json();
            versionOverrideRef.current = freshItem.version;
            setConflictType(null);
            if (lastFormDataRef.current) {
                saveMutation.mutate(lastFormDataRef.current);
            }
        } catch (error) {
            console.error('Failed to overwrite item:', error);
        }
    };

    const handleResetCustomId = () => {
        if (item) setCustomIdInput(item.customId);
        setConflictType(null);
    };

    if (isLoading)
        return <div className="p-8 text-center">Loading item...</div>;
    if (error)
        return (
            <div className="p-8 text-center text-red-500">
                {(error as Error).message}
            </div>
        );
    if (!item) return null;

    const userCanWrite = inventory ? canWrite(user, inventory) : false;

    const renderFieldValue = (fv: ItemFieldValueDto) => {
        const fieldType = fv.customField?.fieldType;

        if (fieldType === 'BOOLEAN') {
            return fv.valueBoolean ? 'True' : 'False';
        }
        if (fieldType === 'NUMBER') {
            return fv.valueNumber !== null ? String(fv.valueNumber) : '-';
        }
        if (fieldType === 'DOCUMENT' && fv.valueString) {
            return (
                <a
                    href={fv.valueString}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline break-all"
                >
                    {fv.valueString}
                </a>
            );
        }
        return fv.valueString || '-';
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-start border-b pb-4">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-3xl font-bold">
                            Item: {item.customId}
                        </h1>
                        <button
                            onClick={() => likeMutation.mutate()}
                            disabled={likeMutation.isPending && !likeData}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                                likeData?.isLiked
                                    ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800'
                            }`}
                        >
                            Like
                            <span className="font-semibold">
                                {likeData?.count || 0}
                            </span>
                        </button>
                    </div>
                    <p className="text-zinc-500">
                        Inventory:{' '}
                        <Link
                            to={`/inventories/${item.inventoryId}`}
                            className="text-blue-600 hover:underline"
                        >
                            {item.inventory?.title || 'Go to Inventory'}
                        </Link>
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="text-right text-sm text-zinc-500">
                        <p>
                            Created at:{' '}
                            {format(
                                new Date(item.createdAt),
                                'dd.MM.yyyy HH:mm',
                            )}
                        </p>
                        <p>
                            Updated at:{' '}
                            {format(
                                new Date(item.updatedAt),
                                'dd.MM.yyyy HH:mm',
                            )}
                        </p>
                        <p>Author: {item.createdBy?.name || 'Unknown'}</p>
                    </div>
                    {userCanWrite && !isEditing && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                editVersionRef.current = item.version;
                                setIsEditing(true);
                            }}
                        >
                            Edit
                        </Button>
                    )}
                    {isEditing && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                type="submit"
                                form="item-edit-form"
                                disabled={
                                    saveMutation.isPending ||
                                    conflictType === 'version'
                                }
                            >
                                {saveMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {!isEditing ? (
                <Tabs defaultValue="table" className="w-full">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">
                            Item Properties
                        </h2>
                        <TabsList>
                            <TabsTrigger value="table">Table</TabsTrigger>
                            <TabsTrigger value="grid">Grid</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="table" className="mt-0">
                        <div className="border rounded-md overflow-hidden bg-white dark:bg-zinc-950">
                            <Table>
                                <TableBody>
                                    {item.fieldValues.map((fv) => (
                                        <TableRow
                                            key={fv.id}
                                            className="hover:bg-transparent"
                                        >
                                            <TableCell className="w-1/3 font-medium text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 border-r">
                                                {fv.customField?.title ||
                                                    'Unknown Field'}
                                            </TableCell>
                                            <TableCell className="text-zinc-900 dark:text-zinc-100">
                                                {renderFieldValue(fv)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {item.fieldValues.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={2}
                                                className="text-center text-zinc-500 py-8"
                                            >
                                                This item has no fields.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="grid" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {item.fieldValues.map((fv) => (
                                <div
                                    key={fv.id}
                                    className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border"
                                >
                                    <div className="text-sm font-medium text-zinc-500 mb-1">
                                        {fv.customField?.title ||
                                            'Unknown Field'}
                                    </div>
                                    <div className="text-lg text-zinc-900 dark:text-zinc-100">
                                        {renderFieldValue(fv)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            ) : (
                <div>
                    <h2 className="text-xl font-semibold mb-4">
                        Edit Item Properties
                    </h2>
                    {conflictType === 'version' && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3 shadow-sm mb-4">
                            <div className="flex items-start gap-3 text-amber-800 dark:text-amber-400">
                                <TriangleAlert
                                    className="mt-0.5 shrink-0"
                                    size={20}
                                />
                                <div>
                                    <h4 className="font-semibold text-sm">
                                        Version Conflict
                                    </h4>
                                    <p className="text-sm mt-1 opacity-90">
                                        This item was modified by someone else
                                        while you were editing it.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3 pt-2 ml-8">
                                <button
                                    type="button"
                                    onClick={handleReload}
                                    className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-zinc-950 border border-amber-300 dark:border-amber-700 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
                                >
                                    Reload (lose your changes)
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOverwrite}
                                    className="px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
                                >
                                    Overwrite (force save your version)
                                </button>
                            </div>
                        </div>
                    )}
                    {!fields ? (
                        <div className="text-center py-8 text-zinc-500">
                            Loading fields...
                        </div>
                    ) : (
                        <form
                            id="item-edit-form"
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-4"
                        >
                            <div className="space-y-1">
                                <label className="text-sm font-medium">
                                    Custom ID
                                </label>
                                <Input
                                    value={customIdInput}
                                    onChange={(e) => {
                                        setCustomIdInput(e.target.value);
                                        if (conflictType === 'custom_id')
                                            setConflictType(null);
                                    }}
                                />
                                {conflictType === 'custom_id' && (
                                    <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-sm">
                                        <span className="text-amber-800 dark:text-amber-400">
                                            This ID already exists in the
                                            inventory.
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleResetCustomId}
                                            className="ml-2 px-2 py-1 text-xs font-medium bg-white dark:bg-zinc-950 border border-amber-300 dark:border-amber-700 rounded hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors whitespace-nowrap"
                                        >
                                            Reset to original
                                        </button>
                                    </div>
                                )}
                            </div>
                            {fields.map((field) => (
                                <div key={field.id} className="space-y-1">
                                    <label className="text-sm font-medium">
                                        {field.title}{' '}
                                        {field.fieldType === 'DOCUMENT' &&
                                            '(URL)'}
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
                                            placeholder={
                                                field.description || ''
                                            }
                                            {...register(field.id!, {
                                                setValueAs: (v) =>
                                                    field.fieldType ===
                                                        'NUMBER' && v !== ''
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
                    )}
                </div>
            )}
        </div>
    );
}
