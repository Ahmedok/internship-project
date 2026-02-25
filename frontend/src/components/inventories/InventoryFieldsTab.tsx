import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
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
                className="cursor-grab p-1 text-zinc-400 hover:text-zinc-600"
            >
                Handle
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                    value={field.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder="Field Title (e.g. Author)"
                    className="h-8"
                />
                <div className="flex items-center text-sm font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md w-max">
                    Type: {field.fieldType}
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={field.showInTable}
                        onChange={(e) =>
                            onChange({ showInTable: e.target.checked })
                        }
                    />
                    Show in Table
                </label>
            </div>

            <Button variant="destructive" size="sm" onClick={onRemove}>
                Remove
            </Button>
        </div>
    );
}

export function InventoryFieldsTab({ inventoryId }: { inventoryId: string }) {
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
            setLocalFields(
                serverFields.map((field: any) => ({
                    ...field,
                    id: field.id || crypto.randomUUID(),
                })),
            );
        }
    }, [serverFields]);

    const sensors = useSensors(
        useSensor(PointerSensor),
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
        const count = localFields.filter(
            (field) => field.fieldType === type,
        ).length;
        if (count >= 3) {
            alert(`You can only have up to 3 fields of type ${type}`);
            return;
        }

        const newField: CustomFieldInput & { id: string } = {
            id: crypto.randomUUID(),
            fieldType: type,
            title: `New field (${type})`,
            description: '',
            showInTable: true,
            sortOrder: localFields.length,
        };
        setLocalFields([...localFields, newField]);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = localFields.map((field, index) => ({
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
            alert('Field structure saved successfully');
        },
        onError: (error) => alert(error.message),
    });

    if (isLoading) return <div className="p-4">Loading structure...</div>;

    return (
        <div className="space-y-6 max-w-4xl bg-white dark:bg-zinc-950 p-6 rounded-lg border">
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h2 className="text-xl font-semibold">Field Constructor</h2>
                    <p className="text-sm text-zinc-500">
                        Determine the data structure for inventory items.
                        Maximum of 3 fields per type.
                    </p>
                </div>
                <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                >
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField('STRING')}
                >
                    + String
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField('TEXT')}
                >
                    + Text
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField('NUMBER')}
                >
                    + Number
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField('DOCUMENT')}
                >
                    + Document
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField('BOOLEAN')}
                >
                    + Boolean
                </Button>
            </div>

            <div className="mt-6 bg-zinc-50 dark:bg-zinc-950/50 p-4 rounded-md border min-h-50">
                {localFields.length === 0 ? (
                    <p className="text-center text-zinc-500 mt-8">
                        No custom fields. Add new ones using the buttons above.
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
