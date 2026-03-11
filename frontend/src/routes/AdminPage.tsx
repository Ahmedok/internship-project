import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type User } from '@inventory/shared';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslation } from 'react-i18next';
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

export default function AdminPage() {
    const { t } = useTranslation('common');

    const columns = useMemo<ColumnDef<User>[]>(
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
                        aria-label="Select row"
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: 'name',
                header: t('admin_panel.username'),
            },
            {
                accessorKey: 'email',
                header: t('admin_panel.email'),
            },
            {
                accessorKey: 'role',
                header: t('admin_panel.role'),
            },
            {
                accessorKey: 'blocked',
                header: t('admin_panel.status'),
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
                            {isBlocked
                                ? t('admin_panel.status_blocked')
                                : t('admin_panel.status_active')}
                        </span>
                    );
                },
            },
        ],
        [t],
    );

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
                    {t('admin_panel.title')}
                </h1>
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 border rounded-md shadow-sm">
                <Input
                    placeholder={t('admin_panel.search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm border-zinc-200"
                />

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={!isAnyUserSelected}
                        onClick={() => handleBulkAction('block')}
                    >
                        {t('admin_panel.block')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={!isAnyUserSelected}
                        onClick={() => handleBulkAction('unblock')}
                    >
                        {t('admin_panel.unblock')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={!isAnyUserSelected}
                        onClick={() => handleBulkAction('promote')}
                    >
                        {t('admin_panel.promote')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={!isAnyUserSelected}
                        onClick={() => handleBulkAction('demote')}
                    >
                        {t('admin_panel.demote')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={!isAnyUserSelected}
                        onClick={() => handleBulkAction('delete')}
                    >
                        {t('admin_panel.delete')}
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
                                    {t('admin_panel.no_users_found')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
