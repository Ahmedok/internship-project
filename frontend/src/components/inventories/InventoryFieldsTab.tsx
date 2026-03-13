import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { Trash2, Grip, Save } from 'lucide-react';
import type { CustomFieldInput, FieldType } from '@inventory/shared';

function SortableFieldItem({
    field,
    onRemove,
    onChange,
}: {
    field: CustomFieldInput & { id: string };
    onRemove: () => void;
    onChange: (updates: Partial<CustomFieldInput>) => void;
}) {
    const { t } = useTranslation('common');

    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 mb-2 border rounded-md shadow-sm group bg-white dark:bg-zinc-900"
        >
            <div
                {...attributes}
                {...listeners}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none"
            >
                <Grip size={16} />
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                    value={field.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder={t(
                        'inventory_manage.fields_tab.input_placeholder',
                    )}
                    className="h-8"
                />
                <Input
                    value={field.description ?? ''}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder={t(
                        'inventory_manage.fields_tab.description_placeholder',
                    )}
                    className="h-8"
                />
                <div className="flex items-center text-sm font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md w-max">
                    {t('inventory_manage.fields_tab.type_label')}:{' '}
                    {t(`inventories.fields.${field.fieldType}`)}
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={field.showInTable}
                        onChange={(e) =>
                            onChange({ showInTable: e.target.checked })
                        }
                    />
                    {t('inventory_manage.fields_tab.show_label')}
                </label>
            </div>

            <Button
                variant="destructive"
                size="sm"
                onClick={onRemove}
                className="shrink-0 px-2 sm:px-3"
            >
                <Trash2 className="size-4 sm:mr-1" />
                <span className="hidden sm:inline">
                    {t('inventory_manage.fields_tab.remove_button')}
                </span>
            </Button>
        </div>
    );
}

export function InventoryFieldsTab({ inventoryId }: { inventoryId: string }) {
    const { t } = useTranslation('common');

    const queryClient = useQueryClient();
    const [localFields, setLocalFields] = useState<
        (CustomFieldInput & { id: string })[]
    >([]);

    const { data: serverFields, isLoading } = useQuery({
        queryKey: ['inventory-fields', inventoryId],
        queryFn: async () => {
            const res = await fetch(`/api/inventories/${inventoryId}/fields`);
            if (!res.ok) {
                throw new Error('Failed to fetch inventory fields');
            }
            return res.json();
        },
    });

    useEffect(() => {
        if (serverFields) {
            setLocalFields(serverFields);
        }
    }, [serverFields]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setLocalFields((items) => {
                const oldIndex = items.findIndex(
                    (item) => item.id === active.id,
                );
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addField = (type: FieldType) => {
        const newField: CustomFieldInput & { id: string } = {
            id: crypto.randomUUID(),
            fieldType: type,
            title: '',
            description: '',
            showInTable: true,
            sortOrder: localFields.length,
        };
        setLocalFields([...localFields, newField]);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = localFields.map((field, index) => ({
                id: field.id,
                fieldType: field.fieldType,
                title: field.title,
                description: field.description,
                showInTable: field.showInTable,
                sortOrder: index,
            }));

            const res = await fetch(`/api/inventories/${inventoryId}/fields`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Saving fields failed');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['inventory-fields', inventoryId],
            });
            toast.success(t('inventory_manage.fields_tab.saved_success'));
        },
        onError: (error) => {
            // TODO: Add custom message (translated)
            toast.error((error as Error).message);
        },
    });

    if (isLoading)
        return (
            <div className="p-4">{t('inventory_manage.fields_tab.loader')}</div>
        );

    return (
        <div className="space-y-6 w-full bg-white dark:bg-zinc-950 p-6 rounded-lg border">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-4">
                <div>
                    <h2 className="text-xl font-semibold">
                        {t('inventory_manage.fields_tab.tab_label')}
                    </h2>
                    <p className="text-sm text-zinc-500">
                        {t('inventory_manage.fields_tab.tab_desc')}
                    </p>
                </div>
                <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2"
                >
                    <Save className="size-4 shrink-0" />
                    <span className="hidden sm:inline">
                        {saveMutation.isPending
                            ? t('common.saving')
                            : t('common.save')}
                    </span>
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField('STRING')}
                >
                    + {t('inventories.fields.STRING')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField('TEXT')}
                >
                    + {t('inventories.fields.TEXT')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField('NUMBER')}
                >
                    + {t('inventories.fields.NUMBER')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField('DOCUMENT')}
                >
                    + {t('inventories.fields.DOCUMENT')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField('BOOLEAN')}
                >
                    + {t('inventories.fields.BOOLEAN')}
                </Button>
            </div>

            <div className="mt-6 bg-zinc-50 dark:bg-zinc-950/50 p-4 rounded-md border min-h-50">
                {localFields.length === 0 ? (
                    <p className="text-center text-zinc-500 mt-8">
                        {t('inventory_manage.fields_tab.no_custom_fields')}
                    </p>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={localFields.map((f) => f.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {localFields.map((field) => (
                                <SortableFieldItem
                                    key={field.id}
                                    field={field}
                                    onRemove={() =>
                                        setLocalFields(
                                            localFields.filter(
                                                (f) => f.id !== field.id,
                                            ),
                                        )
                                    }
                                    onChange={(updates) =>
                                        setLocalFields(
                                            localFields.map((f) =>
                                                f.id === field.id
                                                    ? { ...f, ...updates }
                                                    : f,
                                            ),
                                        )
                                    }
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
}
