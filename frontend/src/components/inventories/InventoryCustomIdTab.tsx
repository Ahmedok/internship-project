import { useState, useEffect, useMemo } from 'react';
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
import {
    type IdElementType,
    type CustomIdElementInput,
    type InventoryDetail,
    generateCustomId,
} from '@inventory/shared';

function SortableIdElement({
    element,
    onRemove,
    onChange,
}: {
    element: CustomIdElementInput & { id: string };
    onRemove: () => void;
    onChange: (updates: Partial<CustomIdElementInput['config']>) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id: element.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const renderConfig = () => {
        switch (element.elementType) {
            case 'FIXED_TEXT':
                return (
                    <Input
                        value={element.config.value || ''}
                        onChange={(e) => onChange({ value: e.target.value })}
                        placeholder="Enter text (e.g. INV-)"
                        className="h-8 max-w-50"
                    />
                );
            case 'DATETIME':
                return (
                    <select
                        value={element.config.format || 'YYYY'}
                        onChange={(e) => onChange({ format: e.target.value })}
                        className="h-8 rounded-md border px-2 text-sm border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                        <option value="YYYY">Year (4 digit)</option>
                        <option value="MM">Month (2 digit)</option>
                        <option value="DD">Day (2 digit)</option>
                        <option value="YYYY-MM">Year-Month</option>
                    </select>
                );
            case 'SEQUENCE':
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500">
                            Min length (zeroes):
                        </span>
                        <Input
                            type="number"
                            min="1"
                            max="10"
                            value={element.config.padding || 1}
                            onChange={(e) =>
                                onChange({
                                    padding: parseInt(e.target.value) || 1,
                                })
                            }
                            className="h-8 w-20"
                        />
                    </div>
                );
            default:
                return (
                    <span className="text-sm text-zinc-400 italic">
                        Settings are not required
                    </span>
                );
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 mb-2 shadow-sm border rounded-md bg-white dark:bg-zinc-900"
        >
            {/* TODO: Use proper icons for handle */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab p-1 text-zinc-400 hover:text-zinc-600"
            >
                Handle
            </div>
            <div className="flex items-center w-40 font-medium text-sm">
                {element.elementType}
            </div>
            <div className="flex-1">{renderConfig()}</div>
            <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
            >
                Delete
            </Button>
        </div>
    );
}

export function InventoryCustomIdTab({
    inventory,
}: {
    inventory: InventoryDetail;
}) {
    const queryClient = useQueryClient();
    const [localElements, setLocalElements] = useState<
        (CustomIdElementInput & { id: string })[]
    >([]);

    const { data: serverElements, isLoading } = useQuery({
        queryKey: ['inventory-id-format', inventory.id],
        queryFn: async () => {
            const res = await fetch(
                `/api/inventories/${inventory.id}/id-format`,
            );
            if (!res.ok) {
                throw new Error('Failed to fetch ID format');
            }
            return res.json();
        },
    });

    useEffect(() => {
        if (serverElements) {
            setLocalElements(
                serverElements.map((el: any) => ({
                    ...el,
                    id: crypto.randomUUID(),
                })),
            );
        }
    }, [serverElements]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setLocalElements((items) => {
                const oldIndex = items.findIndex(
                    (item) => item.id === active.id,
                );
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addElement = (type: IdElementType) => {
        if (
            type === 'SEQUENCE' &&
            localElements.some((el) => el.elementType === 'SEQUENCE')
        ) {
            alert('Only one sequence element is allowed');
            return;
        }

        const newElement: CustomIdElementInput & { id: string } = {
            id: crypto.randomUUID(),
            elementType: type,
            config:
                type === 'SEQUENCE'
                    ? { padding: 4 }
                    : type === 'DATETIME'
                      ? { format: 'YYYY' }
                      : {},
            sortOrder: localElements.length,
        };
        setLocalElements([...localElements, newElement]);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = localElements.map((el, index) => ({
                elementType: el.elementType,
                config: el.config,
                sortOrder: index,
            }));

            const res = await fetch(
                `/api/inventories/${inventory.id}/id-format`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
            );

            if (!res.ok) {
                throw new Error('Failed to save ID format');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['inventory-id-format', inventory.id],
            });
            alert('ID format saved successfully');
        },
    });

    const previewId = useMemo(() => {
        return generateCustomId(localElements, inventory.idCounter + 1);
    }, [localElements, inventory.idCounter]);

    if (isLoading) return <div className="p-4">Loading format...</div>;

    return (
        <div className="space-y-6 max-w-4xl p-6 rounded-lg border bg-white dark:bg-zinc-950">
            <div className="flex justify-between items-start border-b pb-4">
                <div>
                    <h2 className="text-xl font-semibold mb-1">
                        Item ID Format
                    </h2>
                    <p className="text-sm text-zinc-500">
                        Please setup your custom item ID format below.
                    </p>
                </div>
                <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                >
                    {saveMutation.isPending ? 'Saving...' : 'Save Format'}
                </Button>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-900">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Next ID Live Preview:
                </span>
                <code className="text-xl font-mono bg-white dark:bg-zinc-900 px-3 py-1 rounded shadow-sm border border-blue-200 dark:border-blue-800">
                    {previewId || 'EMPTY FORMAT'}
                </code>
            </div>

            <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Add Element:
                </h3>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('FIXED_TEXT')}
                    >
                        Text
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('RANDOM_20BIT')}
                    >
                        Random 5 hex symbols
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('RANDOM_32BIT')}
                    >
                        Random 8 hex symbols
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('RANDOM_6DIGIT')}
                    >
                        Random 6-digit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('RANDOM_9DIGIT')}
                    >
                        Random 9-digit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('GUID')}
                    >
                        UUID
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('DATETIME')}
                    >
                        Date
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('SEQUENCE')}
                    >
                        Counter
                    </Button>
                </div>
            </div>

            <div className="mt-6 bg-zinc-50 dark:bg-zinc-950/50 p-4 rounded-md border min-h-50">
                {localElements.length === 0 ? (
                    <p className="text-center text-zinc-500 mt-8">
                        Format not found. Default UUID will be used.
                    </p>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={localElements.map((el) => el.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {localElements.map((element) => (
                                <SortableIdElement
                                    key={element.id}
                                    element={element}
                                    onRemove={() =>
                                        setLocalElements(
                                            localElements.filter(
                                                (el) => el.id !== element.id,
                                            ),
                                        )
                                    }
                                    onChange={(updates) =>
                                        setLocalElements(
                                            localElements.map((el) =>
                                                el.id === element.id
                                                    ? {
                                                          ...el,
                                                          config: {
                                                              ...el.config,
                                                              ...updates,
                                                          },
                                                      }
                                                    : el,
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
