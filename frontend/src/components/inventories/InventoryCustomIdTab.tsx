import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    DndContext,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    DragOverlay,
    useDndMonitor,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BadgeQuestionMark, Trash2, Grip, Save } from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
    type IdElementType,
    type CustomIdElementInput,
    type InventoryDetail,
    generateCustomId,
} from '@inventory/shared';
import { cn } from '@/lib/utils';

function SortableIdElement({
    element,
    onChange,
    t,
}: {
    element: CustomIdElementInput & { id: string };
    onChange: (updates: Partial<CustomIdElementInput['config']>) => void;
    t: (key: string) => string;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: element.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getHelpText = (type: IdElementType) => {
        switch (type) {
            case 'FIXED_TEXT':
                return t('inventory_manage.custom_id_tab.help_fixed_text');
            case 'DATETIME':
                return t('inventory_manage.custom_id_tab.help_datetime');
            case 'SEQUENCE':
                return t('inventory_manage.custom_id_tab.help_sequence');
            case 'RANDOM_20BIT':
                return t('inventory_manage.custom_id_tab.help_random_20bit');
            case 'RANDOM_32BIT':
                return t('inventory_manage.custom_id_tab.help_random_32bit');
            case 'RANDOM_6DIGIT':
                return t('inventory_manage.custom_id_tab.help_random_6digit');
            case 'RANDOM_9DIGIT':
                return t('inventory_manage.custom_id_tab.help_random_9digit');
            case 'GUID':
                return t('inventory_manage.custom_id_tab.help_guid');
            default:
                return '';
        }
    };

    const renderConfig = () => {
        switch (element.elementType) {
            case 'FIXED_TEXT':
                return (
                    <Input
                        value={element.config.value || ''}
                        onChange={(e) => onChange({ value: e.target.value })}
                        placeholder={t(
                            'inventory_manage.custom_id_tab.text_placeholder',
                        )}
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
                        <option value="YYYY">
                            {t('inventory_manage.custom_id_tab.year_4digit')}
                        </option>
                        <option value="MM">
                            {t('inventory_manage.custom_id_tab.month_2digit')}
                        </option>
                        <option value="DD">
                            {t('inventory_manage.custom_id_tab.day_2digit')}
                        </option>
                        <option value="YYYY-MM">
                            {t('inventory_manage.custom_id_tab.year_month')}
                        </option>
                    </select>
                );
            case 'SEQUENCE':
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500">
                            {t('inventory_manage.custom_id_tab.min_length')}
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
                        {t('inventory_manage.custom_id_tab.no_settings')}
                    </span>
                );
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="flex items-center gap-1.5 md:gap-3 p-3 mb-2 shadow-sm border rounded-md bg-white dark:bg-zinc-900 cursor-grab active:cursor-grabbing touch-none"
        >
            <div className="shrink-0 p-1 text-zinc-400 hover:text-zinc-600">
                <Grip className="size-5" />
            </div>

            <div className="grow">
                <div className="flex items-center gap-2 w-48 font-medium text-sm">
                    {element.elementType}
                    <Popover>
                        <PopoverTrigger className="text-zinc-400 hover:text-zinc-600 rounded-full focus:outline-none">
                            <BadgeQuestionMark className="size-5" />
                        </PopoverTrigger>
                        <PopoverContent className="w-64 text-sm">
                            {getHelpText(element.elementType)}
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="pt-1 flex-initial">{renderConfig()}</div>
            </div>
        </div>
    );
}

function DragMonitor({ onDragChange }: { onDragChange: (v: boolean) => void }) {
    useDndMonitor({
        onDragStart() {
            onDragChange(true);
        },
        onDragEnd() {
            onDragChange(false);
        },
        onDragCancel() {
            onDragChange(false);
        },
    });
    return null;
}

export function InventoryCustomIdTab({
    inventory,
}: {
    inventory: InventoryDetail;
}) {
    const { t } = useTranslation('common');
    const queryClient = useQueryClient();
    const [localElements, setLocalElements] = useState<
        (CustomIdElementInput & { id: string })[]
    >([]);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

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
                serverElements.map(
                    (el: CustomIdElementInput & { id?: string }) => ({
                        ...el,
                        id: el.id || crypto.randomUUID(),
                    }),
                ),
            );
        }
    }, [serverElements]);

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

    const handleDragStart = (event: DragEndEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;

        if (!over) {
            setLocalElements((items) => {
                const filtered = items.filter((item) => item.id !== active.id);
                return filtered.map((el, index) => ({
                    ...el,
                    sortOrder: index,
                }));
            });
            return;
        }

        if (active.id !== over.id) {
            setLocalElements((items) => {
                const oldIndex = items.findIndex(
                    (item) => item.id === active.id,
                );
                const newIndex = items.findIndex((item) => item.id === over.id);
                const reordered = arrayMove(items, oldIndex, newIndex);

                return reordered.map((el, index) => ({
                    ...el,
                    sortOrder: index,
                }));
            });
        }
    };

    const addElement = (type: IdElementType) => {
        if (
            type === 'SEQUENCE' &&
            localElements.some((el) => el.elementType === 'SEQUENCE')
        ) {
            toast.error(t('inventory_manage.custom_id_tab.sequence_limit'));
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

    const activeElement = useMemo(
        () => localElements.find((el) => el.id === activeId),
        [activeId, localElements],
    );

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
            toast.success(t('inventory_manage.custom_id_tab.save_success'));
        },
    });

    const previewId = useMemo(() => {
        return generateCustomId(localElements, inventory.idCounter + 1);
    }, [localElements, inventory.idCounter]);

    if (isLoading)
        return (
            <div className="p-4">
                {t('inventory_manage.custom_id_tab.loading_format')}
            </div>
        );

    return (
        <div className="space-y-6 w-full p-6 rounded-lg border bg-white dark:bg-zinc-950">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div>
                    <h2 className="text-xl font-semibold mb-1">
                        {t('inventory_manage.custom_id_tab.title')}
                    </h2>
                    <p className="text-sm text-zinc-500">
                        {t('inventory_manage.custom_id_tab.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2"
                >
                    <Save className="size-4 shrink-0" />
                    <span className="hidden md:inline">
                        {saveMutation.isPending
                            ? t('common.saving')
                            : t('inventory_manage.custom_id_tab.save_format')}
                    </span>
                </Button>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-900">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    {t('inventory_manage.custom_id_tab.live_preview')}
                </span>
                <code className="text-xl font-mono bg-white dark:bg-zinc-900 px-3 py-1 rounded shadow-sm border border-blue-200 dark:border-blue-800">
                    {previewId ||
                        t('inventory_manage.custom_id_tab.empty_format')}
                </code>
            </div>

            <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('inventory_manage.custom_id_tab.add_element')}
                </h3>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('FIXED_TEXT')}
                    >
                        {t('inventory_manage.custom_id_tab.btn_text')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('RANDOM_20BIT')}
                    >
                        {t('inventory_manage.custom_id_tab.btn_random_20bit')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('RANDOM_32BIT')}
                    >
                        {t('inventory_manage.custom_id_tab.btn_random_32bit')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('RANDOM_6DIGIT')}
                    >
                        {t('inventory_manage.custom_id_tab.btn_random_6digit')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('RANDOM_9DIGIT')}
                    >
                        {t('inventory_manage.custom_id_tab.btn_random_9digit')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('GUID')}
                    >
                        {t('inventory_manage.custom_id_tab.btn_uuid')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('DATETIME')}
                    >
                        {t('inventory_manage.custom_id_tab.btn_date')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addElement('SEQUENCE')}
                    >
                        {t('inventory_manage.custom_id_tab.btn_counter')}
                    </Button>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <DragMonitor onDragChange={setIsDragging} />
                <div
                    className={cn(
                        'mt-6 bg-zinc-50 dark:bg-zinc-950/50 p-4 rounded-md border min-h-50 transition-shadow duration-200',
                        isDragging &&
                            'relative z-10 shadow-[0_0_0_100vmax_rgba(0,0,0,0.35)] dark:shadow-[0_0_0_100vmax_rgba(0,0,0,0.6)]',
                    )}
                >
                    {isDragging && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 z-0 pointer-events-none">
                            <Trash2 className="w-12 h-12" />
                            <span className="ml-2 text-lg font-bold">
                                {t(
                                    'inventory_manage.custom_id_tab.drop_to_remove',
                                )}
                            </span>
                        </div>
                    )}
                    {localElements.length === 0 ? (
                        <p className="text-center text-zinc-500 mt-8">
                            {t('inventory_manage.custom_id_tab.empty_state')}
                        </p>
                    ) : (
                        <SortableContext
                            items={localElements.map((el) => el.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {localElements.map((element) => (
                                <SortableIdElement
                                    key={element.id}
                                    element={element}
                                    t={t}
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
                    )}
                </div>
                <DragOverlay
                    dropAnimation={{
                        duration: 200,
                        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                    }}
                >
                    {activeElement ? (
                        <div className="opacity-90 shadow-xl scale-105 transition-transform cursor-grabbing ring-2 ring-blue-500 rounded-md">
                            <SortableIdElement
                                element={activeElement}
                                t={t}
                                onChange={() => {}}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
