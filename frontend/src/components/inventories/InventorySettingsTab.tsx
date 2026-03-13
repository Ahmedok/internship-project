import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/hooks/useDebounce';
import {
    InventorySchema,
    type InventoryDetail,
    type InventoryInput,
} from '@inventory/shared';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

export function InventorySettingsTab({
    initialData,
}: {
    initialData: InventoryDetail;
}) {
    const { t } = useTranslation('common');

    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [conflictError, setConflictError] = useState<string | null>(null);

    const handleReload = async () => {
        try {
            const res = await fetch(`/api/inventories/${initialData.id}`);
            if (!res.ok) {
                throw new Error('Failed to fetch latest inventory data');
            }
            const latestData: InventoryDetail = await res.json();

            reset({
                title: latestData.title,
                description: latestData.description || '',
                category: latestData.category,
                isPublic: latestData.isPublic,
                imageUrl: latestData.imageUrl,
                tags: latestData.tags?.map((t: any) => t.tag.name) || [],
                version: latestData.version,
            });

            setConflictError(null);
            queryClient.invalidateQueries({
                queryKey: ['inventory', initialData.id],
            });
        } catch (error) {
            console.error('Failed to reload inventory data:', error);
            toast.error(t('errors.reload_error'));
        }
    };

    const handleOverwrite = async () => {
        try {
            const res = await fetch(`/api/inventories/${initialData.id}`);
            if (!res.ok) {
                throw new Error(
                    'Failed to fetch latest inventory data version',
                );
            }
            const latestData: InventoryDetail = await res.json();

            setValue('version', latestData.version);
            setConflictError(null);
            autoSaveMutation.mutate(getValues());
        } catch (error) {
            console.error('Failed to overwrite changes:', error);
            toast.error(t('errors.overwrite_error'));
        }
    };

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
                setConflictError(t('errors.conflict_error'));
            }
            toast.error(t('errors.auto_save_error'));
        },
    });

    useEffect(() => {
        if (!isDirty) return;
        if (!isValid) {
            console.warn('Auto-save failed due to validation errors:', errors);
            return;
        }
        if (conflictError) return;

        const timer = setTimeout(() => {
            const latestData = getValues();
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
        onError: () => {
            toast.error(t('errors.cloudinary_upload_error'));
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            uploadImageMutation.mutate(e.target.files[0]);
        }
    };

    return (
        <div className="space-y-6 w-full p-6 border rounded-lg bg-background">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-4">
                <h2 className="text-xl font-semibold">
                    {t('inventory_manage.settings_tab.title')}
                </h2>
                <div className="text-sm font-medium">
                    {conflictError ? (
                        <span className="text-red-500">
                            {t('inventory_manage.save_label.conflict')}
                        </span>
                    ) : !isValid ? (
                        <span className="text-red-500">
                            {t('errors.validation_error')}
                        </span>
                    ) : autoSaveMutation.isPending ? (
                        <span className="text-amber-500 animate-pulse">
                            {t('common.saving')}
                        </span>
                    ) : isDirty ? (
                        <span className="text-muted-foreground">
                            {t('inventory_manage.save_label.waiting')}
                        </span>
                    ) : (
                        <span className="text-green-600">
                            {t('inventory_manage.save_label.saved')}
                        </span>
                    )}
                </div>
            </div>

            {conflictError && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3 shadow-sm">
                    <div className="flex items-start gap-3 text-amber-800 dark:text-amber-400">
                        <TriangleAlert />
                        <div>
                            <h4 className="font-semibold text-sm">
                                {t(
                                    'inventory_manage.settings_tab.conflict_alert_header',
                                )}
                            </h4>
                            <p className="text-sm mt-1 opacity-90">
                                {t(
                                    'inventory_manage.settings_tab.conflict_alert_message',
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2 ml-8">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReload}
                            className="px-3 py-1.5 text-sm font-medium border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                        >
                            {t('inventory_manage.settings_tab.reload_button')}
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleOverwrite}
                            className="px-3 py-1.5 text-sm font-medium bg-amber-600 dark:bg-amber-700 text-white hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors"
                        >
                            {t(
                                'inventory_manage.settings_tab.overwrite_button',
                            )}
                        </Button>
                    </div>
                </div>
            )}

            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                {/* Image */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        {t('inventories.cover_image')}
                    </label>
                    <div className="flex flex-wrap items-center gap-4">
                        {formValues.imageUrl ? (
                            <img
                                src={formValues.imageUrl}
                                alt="Cover Image"
                                className="size-24 object-cover rounded-md border"
                            />
                        ) : (
                            <div className="size-24 bg-muted rounded-md border flex items-center justify-center text-xs text-muted-foreground">
                                {t('inventories.no_image')}
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadImageMutation.isPending}
                                className="px-3 py-1.5 text-sm transition-colors"
                            >
                                {uploadImageMutation.isPending
                                    ? t(
                                          'inventory_manage.settings_tab.uploading_image',
                                      )
                                    : t(
                                          'inventory_manage.settings_tab.upload_image',
                                      )}
                            </Button>
                        </div>
                    </div>
                </div>
                {/* Title */}
                <div>
                    <label
                        htmlFor="title"
                        className="block text-sm font-medium mb-1"
                    >
                        {t('inventories.title')}
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
                        {t('inventories.category')}
                    </label>
                    <select
                        id="category"
                        {...register('category')}
                        className="flex h-10 w-full px-3 py-2 text-sm rounded-md border bg-background"
                    >
                        {InventorySchema.shape.category.options.map((cat) => (
                            <option key={cat} value={cat}>
                                {t(`inventories.categories.${cat}`)}
                            </option>
                        ))}
                    </select>
                </div>
                {/* Description */}
                <div>
                    <label
                        htmlFor="description"
                        className="block text-sm font-medium mb-1"
                    >
                        {t('inventories.description')}
                    </label>
                    <textarea
                        id="description"
                        {...register('description')}
                        rows={6}
                        className="flex w-full px-3 py-2 text-sm rounded-md border bg-background"
                        placeholder={t('inventories.description_placeholder')}
                    />
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        {t('inventories.tags')} ({t('inventories.tags_helper')})
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3 border p-3 rounded-md min-h-12.5 bg-card">
                        {formValues.tags?.map((tag: string) => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="flex items-center gap-1 px-2 py-1"
                            >
                                #{tag}
                                <Button
                                    variant="outline"
                                    size="icon-xs"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-1 rounded-full focus:outline-none hover:text-red-500"
                                >
                                    &times;
                                </Button>
                            </Badge>
                        ))}
                        {(!formValues.tags || formValues.tags.length === 0) && (
                            <span className="text-muted-foreground text-sm flex items-center">
                                {t('inventories.no_tags')}
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
                            placeholder={t('inventories.tag_placeholder')}
                            className="w-full"
                        />

                        {tagSuggestions &&
                            tagSuggestions.length > 0 &&
                            tagInput && (
                                <ul className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-auto">
                                    {tagSuggestions.map((suggestion, idx) => (
                                        <li
                                            key={idx}
                                            onClick={() =>
                                                handleAddTag(suggestion)
                                            }
                                            className="px-4 py-2 text-sm cursor-pointer hover:bg-muted hover:text-muted-foreground"
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
