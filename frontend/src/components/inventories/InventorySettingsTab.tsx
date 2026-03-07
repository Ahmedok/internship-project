import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
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

    const [tagInput, setTagInput] = useState('');

    const debouncedTag = useDebounce(tagInput, 300);

    const { data: tagSuggestions } = useQuery({
        queryKey: ['tag-autocomplete', debouncedTag],
        queryFn: async () => {
            if (!debouncedTag.trim()) return [];
            const res = await fetch(
                `/api/tags?q=${encodeURIComponent(debouncedTag)}`,
            );
            if (!res.ok) return [];
            return res.json() as Promise<string[]>;
        },
        enabled: debouncedTag.length > 0,
    });

    const {
        register,
        watch,
        setValue,
        getValues,
        formState: { errors, isDirty, isValid },
        reset,
    } = useForm<InventoryInput>({
        resolver: zodResolver(InventorySchema),
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

    const handleAddTag = (tagToAdd: string) => {
        const cleanedTag = tagToAdd.trim().toLowerCase();
        if (!cleanedTag) return;

        const currentTags = getValues('tags') || [];
        if (!currentTags.includes(cleanedTag)) {
            setValue('tags', [...currentTags, cleanedTag], {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
        setTagInput('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const currentTags = getValues('tags') || [];
        setValue(
            'tags',
            currentTags.filter((t) => t !== tagToRemove),
            { shouldDirty: true, shouldValidate: true },
        );
    };

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

                {/* Tags */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Tags (press Enter to add)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3 border p-3 rounded-md min-h-12.5 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                        {formValues.tags?.map((tag: string) => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="flex items-center gap-1 px-2 py-1"
                            >
                                #{tag}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-1 rounded-full focus:outline-none text-zinc-500 hover:text-red-500"
                                >
                                    &times;
                                </button>
                            </Badge>
                        ))}
                        {(!formValues.tags || formValues.tags.length === 0) && (
                            <span className="text-zinc-400 text-sm flex items-center">
                                No tags
                            </span>
                        )}
                    </div>

                    <div className="relative">
                        <Input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTag(tagInput);
                                }
                            }}
                            placeholder="Start entering a tag..."
                            className="w-full"
                        />

                        {tagSuggestions &&
                            tagSuggestions.length > 0 &&
                            tagInput && (
                                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg max-h-48 overflow-auto">
                                    {tagSuggestions.map((suggestion, idx) => (
                                        <li
                                            key={idx}
                                            onClick={() =>
                                                handleAddTag(suggestion)
                                            }
                                            className="px-4 py-2 text-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                            #{suggestion}
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </div>
                </div>
            </form>
        </div>
    );
}
