import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from '@tanstack/react-table';

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

const columns: ColumnDef<any>[] = [
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
        header: 'Title',
    },
    {
        accessorKey: 'category',
        header: 'Category',
    },
    {
        accessorKey: 'isPublic',
        header: 'Access',
        cell: ({ row }) => (
            <span
                className={
                    row.original.isPublic ? 'text-green-600' : 'text-amber-600'
                }
            >
                {row.original.isPublic ? 'Public' : 'Private'}
            </span>
        ),
    },
    {
        accessorKey: 'updatedAt',
        header: 'Last Updated',
        cell: ({ row }) =>
            new Date(row.original.updatedAt).toLocaleDateString(),
    },
];

function InventoryTable({
    data,
    onDeleteSelected,
    isDeletable,
}: {
    data: any[];
    onDeleteSelected?: (ids: string[]) => void;
    isDeletable?: boolean;
}) {
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
                        Delete selected ({selectedIds.length})
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
                                    No inventories found.
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
        return <div className="p-8">Loading your inventories...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">
                    Personal Page
                </h1>
                <Button onClick={() => navigate('/inventories/new')}>
                    Create New Inventory
                </Button>
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">
                    My Inventories
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
                        Inventories I can access (read/edit only)
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
