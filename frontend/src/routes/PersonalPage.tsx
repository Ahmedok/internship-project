import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from '@tanstack/react-table';
import type { InventoryDetail } from '@inventory/shared';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

function InventoryTable({
    data,
    onDeleteSelected,
    isDeletable,
}: {
    data: InventoryDetail[];
    onDeleteSelected?: (ids: string[]) => void;
    isDeletable?: boolean;
}) {
    const { t } = useTranslation('common');

    const columns = useMemo<ColumnDef<InventoryDetail>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        onCheckedChange={(value) =>
                            table.toggleAllPageRowsSelected(!!value)
                        }
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label={`Select row ${row.index + 1}`}
                    />
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'title',
                header: t('inventories.title'),
            },
            {
                accessorKey: 'category',
                header: t('inventories.category'),
            },
            {
                accessorKey: 'isPublic',
                header: t('inventories.access'),
                cell: ({ row }) => (
                    <span
                        className={
                            row.original.isPublic
                                ? 'text-green-600'
                                : 'text-amber-600'
                        }
                    >
                        {row.original.isPublic
                            ? t('inventories.access_public')
                            : t('inventories.access_private')}
                    </span>
                ),
            },
            {
                accessorKey: 'updatedAt',
                header: t('inventories.last_updated'),
                cell: ({ row }) =>
                    new Date(row.original.updatedAt).toLocaleDateString(),
            },
        ],
        [t],
    );

    const navigate = useNavigate();
    const [rowSelection, setRowSelection] = useState({});
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        state: { rowSelection, sorting },
    });

    const selectedIds = table
        .getFilteredSelectedRowModel()
        .rows.map((row) => row.original.id);
    const isAnySelected = selectedIds.length > 0;

    const handleDelete = () => {
        if (onDeleteSelected && selectedIds.length > 0) {
            onDeleteSelected(selectedIds);
            setRowSelection({});
        }
    };

    return (
        <div className="space-y-3">
            {isDeletable && (
                <div className="flex justify-end mb-2">
                    <Button
                        variant="destructive"
                        size="sm"
                        disabled={!isAnySelected}
                        onClick={handleDelete}
                    >
                        {t('inventories.delete_selected')} ({selectedIds.length}
                        )
                    </Button>
                </div>
            )}

            <div className="rounded-md border bg-white dark:bg-zinc-950">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={
                                            header.column.getCanSort()
                                                ? 'cursor-pointer select-none'
                                                : ''
                                        }
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext(),
                                        )}
                                        {{ asc: ' ^', desc: ' v' }[
                                            header.column.getIsSorted() as string
                                        ] ?? null}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && 'selected'
                                    }
                                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                    onClick={() =>
                                        navigate(
                                            `/inventories/${row.original.id}`,
                                        )
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            onClick={(e) => {
                                                if (cell.column.id === 'select')
                                                    e.stopPropagation();
                                            }}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-zinc-500"
                                >
                                    {t('inventories.empty_message')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default function PersonalPage() {
    const { t } = useTranslation('common');
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: inventories, isLoading } = useQuery({
        queryKey: ['personal-inventories'],
        queryFn: async () => {
            const res = await fetch('/api/inventories');
            if (!res.ok) {
                throw new Error('Failed to fetch inventories');
            }
            const json = await res.json();
            return json.data;
        },
    });

    const myInventories = useMemo(
        () =>
            inventories?.filter((inv: any) => inv.createdById === user?.id) ||
            [],
        [inventories, user?.id],
    );
    const accesibleInventories = useMemo(
        () =>
            inventories?.filter((inv: any) => inv.createdById !== user?.id) ||
            [],
        [inventories, user?.id],
    );

    const deleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const promises = ids.map((id) =>
                fetch(`/api/inventories/${id}`, { method: 'DELETE' }),
            );
            const responses = await Promise.all(promises);

            const hasErrors = responses.some((res) => !res.ok);
            if (hasErrors) {
                throw new Error('Failed to delete some inventories');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['personal-inventories'],
            });
        },
    });

    if (isLoading)
        return <div className="p-8">{t('personal_page.loader')}</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">
                    {t('personal_page.title')}
                </h1>
                <Button onClick={() => navigate('/inventories/new')}>
                    {t('personal_page.create_inventory')}
                </Button>
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">
                    {t('personal_page.my_inventories')}
                </h2>
                <InventoryTable
                    data={myInventories}
                    isDeletable={true}
                    onDeleteSelected={(ids) => deleteMutation.mutate(ids)}
                />
            </section>

            {accesibleInventories.length > 0 && (
                <section className="space-y-4 mt-12">
                    <h2 className="text-xl font-semibold border-b pb-2">
                        {t('personal_page.accessible_inventories')}
                    </h2>
                    <InventoryTable
                        data={accesibleInventories}
                        isDeletable={false}
                    />
                </section>
            )}
        </div>
    );
}
