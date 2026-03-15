import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Plus, Trash2, Download } from 'lucide-react';

interface InventoryItemsTabProps {
    inventory: InventoryDetail;
    onOpenItemModal: () => void;
}

export function InventoryItemsTab({
    inventory,
    onOpenItemModal,
}: InventoryItemsTabProps) {
    const { t } = useTranslation('common');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const limit = 10;

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
                `/api/inventories/${inventory.id}/items?page=${page}&limit=${limit}`,
            );
            if (!res.ok) throw new Error('Failed to fetch items');
            return res.json();
        },
        placeholderData: keepPreviousData,
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
        deleteMutation.mutate(Array.from(selectedIds));
    };

    const handleExport = (format: 'csv' | 'xlsx') => {
        const url = `/api/inventories/${inventory.id}/items/export?format=${format}`;
        window.open(url, '_blank');
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
            return (
                <Checkbox
                    checked={valueObj.valueBoolean}
                    disabled
                    aria-label={valueObj.valueBoolean ? 'true' : 'false'}
                />
            );
        return '-';
    };

    if (isLoading)
        return (
            <div className="p-4">{t('inventory_manage.items_tab.loading')}</div>
        );

    return (
        <div className="space-y-6 w-full p-6 border rounded-lg bg-background">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2 border rounded-md">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => onOpenItemModal()}
                        variant="default"
                        className="flex items-center gap-2"
                    >
                        <Plus className="size-4 shrink-0" />
                        <span className="hidden md:inline">
                            {t('inventory_manage.items_tab.add_item')}
                        </span>
                    </Button>

                    {selectedIds.size > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    disabled={deleteMutation.isPending}
                                    className="flex items-center gap-2"
                                >
                                    <Trash2 className="size-4 shrink-0" />
                                    <span className="hidden md:inline">
                                        {deleteMutation.isPending
                                            ? t('common.deleting')
                                            : t(
                                                  'inventory_manage.items_tab.delete_count',
                                                  { count: selectedIds.size },
                                              )}
                                    </span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {t('common.confirm_delete')}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t('common.confirm_delete_message', {
                                            count: selectedIds.size,
                                        })}{' '}
                                        {t('common.confirm_delete_description')}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        {t('common.cancel')}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteSelected}
                                    >
                                        {t('common.delete')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Download className="size-4 shrink-0" />
                                <span className="hidden md:inline">
                                    {t('inventory_manage.items_tab.export')}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem
                                onClick={() => handleExport('csv')}
                            >
                                {t('inventory_manage.items_tab.export_csv')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleExport('xlsx')}
                            >
                                {t('inventory_manage.items_tab.export_xlsx')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <span className="text-sm text-muted-foreground px-2">
                        {t('inventory_manage.items_tab.total_items', {
                            count: itemsData?.total || 0,
                        })}
                    </span>
                </div>
            </div>

            <div className="border rounded-md bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <input
                                    type="checkbox"
                                    className="size-4 cursor-pointer"
                                    checked={
                                        itemsData &&
                                        itemsData.items.length > 0 &&
                                        selectedIds.size ===
                                            itemsData.items.length
                                    }
                                    onChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead>
                                {t('inventory_manage.items_tab.item_id')}
                            </TableHead>

                            {visibleCustomFields.map((field) => (
                                <TableHead key={field.id}>
                                    {field.title}
                                </TableHead>
                            ))}

                            <TableHead>
                                {t('inventory_manage.items_tab.author')}
                            </TableHead>
                            <TableHead>
                                {t('inventory_manage.items_tab.creation_date')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!itemsData || itemsData.items.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={4 + visibleCustomFields.length}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    {t(
                                        'inventory_manage.items_tab.empty_state',
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            itemsData.items.map((item: InventoryItemDto) => (
                                <TableRow
                                    key={item.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() =>
                                        navigate(`/items/${item.id}`)
                                    }
                                >
                                    <TableCell
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            className="size-4 cursor-pointer"
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
                                        {item.createdBy?.name ||
                                            t('common.unknown')}
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
                        {t('common.previous')}
                    </Button>
                    <span className="flex items-center text-sm px-2">
                        {t('common.page_of', {
                            page,
                            totalPages: itemsData.totalPages,
                        })}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= itemsData.totalPages}
                    >
                        {t('common.next')}
                    </Button>
                </div>
            )}
        </div>
    );
}
