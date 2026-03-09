import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import type {
    InventoryDetail,
    CustomFieldInput,
    InventoryItemDto,
    PaginatedItemsDto,
} from '@inventory/shared';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';

interface InventoryItemsTabProps {
    inventory: InventoryDetail;
    onOpenItemModal: () => void;
}

export function InventoryItemsTab({
    inventory,
    onOpenItemModal,
}: InventoryItemsTabProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);

    const { data: fields } = useQuery<CustomFieldInput[]>({
        queryKey: ['inventory-fields', inventory.id],
        queryFn: async () => {
            const res = await fetch(`/api/inventories/${inventory.id}/fields`);
            if (!res.ok) throw new Error('Failed to fetch fields');
            return res.json();
        },
    });

    const { data: itemsData, isLoading } = useQuery<PaginatedItemsDto>({
        queryKey: ['inventory-items', inventory.id, page],
        queryFn: async () => {
            const res = await fetch(
                `/api/inventories/${inventory.id}/items?page=${page}&limit=20`,
            );
            if (!res.ok) throw new Error('Failed to fetch items');
            return res.json();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (idsToDelete: string[]) => {
            const res = await fetch(
                `/api/inventories/${inventory.id}/items/bulk-delete`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: idsToDelete }),
                },
            );
            if (!res.ok) throw new Error('Failed to delete items');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['inventory-items', inventory.id],
            });
            setSelectedIds(new Set());
        },
    });

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (!itemsData?.items) return;
        if (selectedIds.size === itemsData.items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(
                new Set(itemsData.items.map((i: InventoryItemDto) => i.id)),
            );
        }
    };

    const handleDeleteSelected = () => {
        // TODO: Replace with a nicer confirmation dialog
        if (confirm(`Delete ${selectedIds.size} selected items?`)) {
            deleteMutation.mutate(Array.from(selectedIds));
        }
    };

    const visibleCustomFields = fields?.filter((f) => f.showInTable) || [];

    const getFieldValue = (item: InventoryItemDto, fieldId: string) => {
        const valueObj = item.fieldValues.find(
            (fv) => fv.customFieldId === fieldId,
        );
        if (!valueObj) return '-';

        if (valueObj.valueString !== null) return valueObj.valueString;
        if (valueObj.valueNumber !== null) return valueObj.valueNumber;
        if (valueObj.valueBoolean !== null)
            return valueObj.valueBoolean ? 'True' : 'False';
        return '-';
    };

    if (isLoading) return <div className="p-4">Loading items...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center p-2 rounded-md border bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                    <Button onClick={() => onOpenItemModal()} variant="default">
                        + Add Item
                    </Button>

                    {selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            onClick={handleDeleteSelected}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending
                                ? 'Deleting...'
                                : `Delete (${selectedIds.size})`}
                        </Button>
                    )}
                </div>
                <div className="text-sm text-zinc-500 px-2">
                    Total Items: {itemsData?.total || 0}
                </div>
            </div>

            <div className="border rounded-md bg-white dark:bg-zinc-950 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 cursor-pointer"
                                    checked={
                                        itemsData &&
                                        itemsData.items.length > 0 &&
                                        selectedIds.size ===
                                            itemsData.items.length
                                    }
                                    onChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Item ID</TableHead>

                            {visibleCustomFields.map((field) => (
                                <TableHead key={field.id}>
                                    {field.title}
                                </TableHead>
                            ))}

                            <TableHead>Author</TableHead>
                            <TableHead>Creation Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!itemsData || itemsData.items.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={4 + visibleCustomFields.length}
                                    className="text-center py-8 text-zinc-500"
                                >
                                    There are no items in this inventory yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            itemsData.items.map((item: InventoryItemDto) => (
                                <TableRow
                                    key={item.id}
                                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                                    onClick={() =>
                                        navigate(`/items/${item.id}`)
                                    }
                                >
                                    <TableCell
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 cursor-pointer"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() =>
                                                toggleSelect(item.id)
                                            }
                                        />
                                    </TableCell>
                                    <TableCell className="font-mono font-medium">
                                        {item.customId}
                                    </TableCell>

                                    {visibleCustomFields.map((field) => (
                                        <TableCell
                                            key={field.id}
                                            className="truncate max-w-50"
                                        >
                                            {getFieldValue(
                                                item,
                                                field.id as string,
                                            )}
                                        </TableCell>
                                    ))}

                                    <TableCell>
                                        {item.createdBy?.name || 'Unknown'}
                                    </TableCell>
                                    <TableCell>
                                        {format(
                                            new Date(item.createdAt),
                                            'dd.MM.yyyy HH:mm',
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {itemsData && itemsData.totalPages > 1 && (
                <div className="flex justify-end gap-2 mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center text-sm px-2">
                        Page {page} of {itemsData.totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= itemsData.totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
