import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type User } from '@inventory/shared';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/stores/authStore';

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
    const debouncedSearch = useDebounce(searchQuery, 300);

    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['users', debouncedSearch],
        queryFn: async () => {
            const res = await fetch(
                `/api/admin/users?search=${debouncedSearch}`,
            );
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            const json = await res.json();
            return json.data as User[];
        },
    });

    const blockMutation = useMutation({
        mutationFn: async ({
            id,
            blocked,
        }: {
            id: string;
            blocked: boolean;
        }) => {
            const res = await fetch(`/api/admin/users/${id}/block`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocked }),
            });
            if (!res.ok) {
                throw new Error('Error while blocking user');
            }
        },
    });

    const roleMutation = useMutation({
        mutationFn: async ({
            id,
            role,
        }: {
            id: string;
            role: 'USER' | 'ADMIN';
        }) => {
            const res = await fetch(`/api/admin/users/${id}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            });
            if (!res.ok) {
                throw new Error('Error while changing user role');
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                throw new Error('Error while deleting user');
            }
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

    const selectedUsers = table
        .getFilteredSelectedRowModel()
        .rows.map((row) => row.original);
    const isAnyUserSelected = selectedUsers.length > 0;

    const { user, checkAuth } = useAuthStore();

    const handleBulkAction = async (
        actionType: 'block' | 'unblock' | 'promote' | 'demote' | 'delete',
    ) => {
        try {
            const promises = selectedUsers.map((user) => {
                if (actionType === 'block')
                    return blockMutation.mutateAsync({
                        id: user.id,
                        blocked: true,
                    });
                if (actionType === 'unblock')
                    return blockMutation.mutateAsync({
                        id: user.id,
                        blocked: false,
                    });
                if (actionType === 'promote')
                    return roleMutation.mutateAsync({
                        id: user.id,
                        role: 'ADMIN',
                    });
                if (actionType === 'demote')
                    return roleMutation.mutateAsync({
                        id: user.id,
                        role: 'USER',
                    });
                if (actionType === 'delete')
                    return deleteMutation.mutateAsync(user.id);
            });

            await Promise.all(promises);
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            setRowSelection({});

            const isSelfAffected = selectedUsers.some((u) => u.id === user?.id);
            if (isSelfAffected) {
                await checkAuth();
            }
        } catch (error) {
            console.error('Error performing bulk action:', error);
            // TODO: Show error toast to user
        }
    };

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
                    <Button
                        variant="outline"
                        disabled={!isAnyUserSelected}
                        onClick={() => handleBulkAction('block')}
                    >
                        Block
                    </Button>
                    <Button
                        variant="outline"
                        disabled={!isAnyUserSelected}
                        onClick={() => handleBulkAction('unblock')}
                    >
                        Unblock
                    </Button>
                    <Button
                        variant="outline"
                        disabled={!isAnyUserSelected}
                        onClick={() => handleBulkAction('promote')}
                    >
                        Promote Admin
                    </Button>
                    <Button
                        variant="outline"
                        disabled={!isAnyUserSelected}
                        onClick={() => handleBulkAction('demote')}
                    >
                        Demote Admin
                    </Button>
                    <Button
                        variant="outline"
                        disabled={!isAnyUserSelected}
                        onClick={() => handleBulkAction('delete')}
                    >
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
