import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type User } from '@inventory/shared';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
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
import { Input } from '@/components/ui/input';

const columns: ColumnDef<User>[] = [
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
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'name',
        header: 'Username',
    },
    {
        accessorKey: 'email',
        header: 'Email',
    },
    {
        accessorKey: 'role',
        header: 'Role',
    },
    {
        accessorKey: 'blocked',
        header: 'Status',
        cell: ({ row }) => {
            const isBlocked = row.getValue('blocked');
            return (
                <span
                    className={
                        isBlocked
                            ? 'text-red-500 font-medium'
                            : 'text-green-600'
                    }
                >
                    {isBlocked ? 'Blocked' : 'Active'}
                </span>
            );
        },
    },
];

export default function AdminPage() {
    const [rowSelection, setRowSelection] = useState({});
    const [searchQuery, setSearchQuery] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['users', searchQuery],
        queryFn: async () => {
            const res = await fetch(`/api/admin/users?search=${searchQuery}`);
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            const json = await res.json();
            return json.data as User[];
        },
    });

    const table = useReactTable({
        data: data || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        onRowSelectionChange: setRowSelection,
        state: {
            rowSelection,
        },
    });

    const selectedRows = table.getSelectedRowModel().rows;
    const isAnySelected = selectedRows.length > 0;

    return (
        <div className="p-8 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">
                    User Management
                </h1>
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 border rounded-md shadow-sm">
                <Input
                    placeholder="Search by name or email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm border-zinc-200"
                />

                <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={!isAnySelected}>
                        Block
                    </Button>
                    <Button variant="outline" disabled={!isAnySelected}>
                        Change Role
                    </Button>
                    <Button variant="outline" disabled={!isAnySelected}>
                        Delete
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-white dark:bg-zinc-950">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext(),
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && 'selected'
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
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
                                    Users not found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
