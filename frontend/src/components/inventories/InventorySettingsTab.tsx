import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    InventorySchema,
    type InventoryDetail,
    type InventoryInput,
} from '@inventory/shared';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

export function InventorySettingsTab({
    initialData,
}: {
    initialData: InventoryDetail;
}) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [conflictError, setConflictError] = useState<string | null>(null);

    const {
        register,
        watch,
        setValue,
        getValues,
        formState: { errors, isDirty, isValid },
        reset,
    } = useForm<InventoryInput>({
        resolver: zodResolver(InventorySchema as any), // TODO: Fix this typing
        defaultValues: {
            title: initialData.title,
            description: initialData.description || '',
            category: initialData.category,
            isPublic: initialData.isPublic,
            imageUrl: initialData.imageUrl,
            tags: initialData.tags?.map((t: any) => t.tag.name) || [],
            version: initialData.version,
        },
        mode: 'onChange',
    });

    const formValues = watch();

    const autoSaveMutation = useMutation({
        mutationFn: async (data: Partial<InventoryInput>) => {
            console.log('Sending PATCH with data:', data); // TODO: Delete this after debugging

            const res = await fetch(`/api/inventories/${initialData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                if (res.status === 409) throw new Error('CONFLICT');
                throw new Error('Failed to auto-save inventory');
            }
            return res.json();
        },
        onSuccess: (updatedInventory) => {
            const currentInputs = getValues();
            reset({
                ...currentInputs,
                version: updatedInventory.version,
            });
            setConflictError(null);
            queryClient.invalidateQueries({
                queryKey: ['inventory', initialData.id],
            });
        },
        onError: (error) => {
            if (error.message === 'CONFLICT') {
                setConflictError(
                    'This inventory has been modified elsewhere. Please refresh to get the latest version.',
                );
            }
        },
    });

    useEffect(() => {
        // TODO: Delete this after debugging
        console.log('--- FORM REACTION ---');
        console.log('Dirty (isDirty):', isDirty);
        console.log('Valid (isValid):', isValid);
        console.log('Zod Errors (errors):', errors);

        if (!isDirty) return;

        if (!isValid) {
            console.warn('Auto-save failed due to validation errors:', errors);
            return;
        }

        if (conflictError) return;

        const timer = setTimeout(() => {
            const latestData = getValues();
            console.log('TIMER TRIGGERED. SENDING:', latestData);
            autoSaveMutation.mutate(latestData);
        }, 7000);

        return () => clearTimeout(timer);
    }, [formValues, isDirty, isValid, conflictError, errors]);

    const uploadImageMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload/image', {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const errorData = await res
                    .json()
                    .catch(() => ({ message: res.statusText }));
                throw new Error(errorData.message || 'Image upload failed');
            }
            return res.json();
        },
        onSuccess: (data) => {
            setValue('imageUrl', data.imageUrl, {
                shouldDirty: true,
                shouldValidate: true,
            });
        },
        onError: (err) => {
            alert(`Cloudinary upload failed: ${err.message}`); // TODO: Delete this after debugging
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            uploadImageMutation.mutate(e.target.files[0]);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl bg-white dark:bg-zinc-950 p-6 rounded-lg border">
            <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-semibold">Inventory Settings</h2>
                <div className="text-sm font-medium">
                    {conflictError ? (
                        <span className="text-red-500">Stopped (conflict)</span>
                    ) : !isValid ? (
                        <span className="text-red-500">
                            Auto-save failed due to validation errors
                        </span>
                    ) : autoSaveMutation.isPending ? (
                        <span className="text-amber-500 animate-pulse">
                            Saving...
                        </span>
                    ) : isDirty ? (
                        <span className="text-zinc-400">
                            Waiting for changes...
                        </span>
                    ) : (
                        <span className="text-green-600">
                            All changes saved!
                        </span>
                    )}
                </div>
            </div>

            {conflictError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md text-sm">
                    {conflictError}
                </div>
            )}

            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                {/* Image */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Cover Image
                    </label>
                    <div className="flex items-center gap-4">
                        {formValues.imageUrl ? (
                            <img
                                src={formValues.imageUrl}
                                alt="Cover Image"
                                className="w-24 h-24 object-cover rounded-md border"
                            />
                        ) : (
                            <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-md border flex items-center justify-center text-xs text-zinc-500">
                                No Image
                            </div>
                        )}
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadImageMutation.isPending}
                                className="px-3 py-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md transition-colors"
                            >
                                {uploadImageMutation.isPending
                                    ? 'Uploading...'
                                    : 'Upload New Image'}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Title */}
                <div>
                    <label
                        htmlFor="title"
                        className="block text-sm font-medium mb-1"
                    >
                        Title
                    </label>
                    <Input id="title" {...register('title')} />
                    {errors.title && (
                        <p className="text-sm text-red-500 mt-1">
                            {errors.title.message}
                        </p>
                    )}
                </div>
                {/* Category */}
                <div>
                    <label
                        htmlFor="category"
                        className="block text-sm font-medium mb-1"
                    >
                        Category
                    </label>
                    <select
                        id="category"
                        {...register('category')}
                        className="flex h-10 w-full px-3 py-2 text-sm rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                    >
                        <option value="COLLECTIONS">Collections</option>
                        <option value="ELECTRONICS">Electronics</option>
                        <option value="BOOKS">Books</option>
                        <option value="TOOLS">Tools</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>
                {/* Description */}
                <div>
                    <label
                        htmlFor="description"
                        className="block text-sm font-medium mb-1"
                    >
                        Description (Markdown)
                    </label>
                    <textarea
                        id="description"
                        {...register('description')}
                        rows={6}
                        className="flex w-full px-3 py-2 text-sm rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                        placeholder="Markdown markup supported..."
                    />
                </div>

                {/* Tags (TODO: Proper tags) */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Tags (TEMP readonly)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {formValues.tags?.map((tag: string) => (
                            <Badge key={tag} variant="secondary">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                        TODO: Tag editing with autocomplete
                    </p>
                </div>
            </form>
        </div>
    );
}
