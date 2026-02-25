import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import type { InventoryDetail } from '@inventory/shared';

export function InventoryAccessTab({
    inventory,
}: {
    inventory: InventoryDetail;
}) {
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'email'>('name');

    const debouncedSearch = useDebounce(searchQuery, 300);

    const toggleVisibilityMutation = useMutation({
        mutationFn: async (isPublic: boolean) => {
            const res = await fetch(`/api/inventories/${inventory.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic, version: inventory.version }),
            });
            if (!res.ok) {
                throw new Error('Failed to update visibility');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['inventory', inventory.id],
            });
        },
    });

    const { data: searchResults, isLoading: isSearching } = useQuery({
        queryKey: ['users-search', debouncedSearch],
        queryFn: async () => {
            const res = await fetch(`/api/users/search?q=${debouncedSearch}`);
            if (!res.ok) {
                throw new Error('Failed to search users');
            }
            return res.json();
        },
        enabled: debouncedSearch.length >= 2,
    });

    const addAccessMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await fetch(`/api/inventories/${inventory.id}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) {
                throw new Error('Failed to add access');
            }
            return res.json();
        },
        onSuccess: () => {
            setSearchQuery('');
            queryClient.invalidateQueries({
                queryKey: ['inventory', inventory.id],
            });
        },
    });

    const removeAccessMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await fetch(
                `/api/inventories/${inventory.id}/access/${userId}`,
                {
                    method: 'DELETE',
                },
            );
            if (!res.ok) {
                throw new Error('Failed to remove access');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['inventory', inventory.id],
            });
        },
    });

    const sortedAccessList = [...(inventory.accessList || [])].sort((a, b) => {
        const nameA = a.user?.name || '';
        const nameB = b.user?.name || '';
        if (sortBy === 'name') return nameA.localeCompare(nameB);
        const emailA = a.user?.email || '';
        const emailB = b.user?.email || '';
        return emailA.localeCompare(emailB);
    });

    return (
        <div className="space-y-8 max-w-2xl p-6 border rounded-lg bg-white dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h2 className="text-xl font-semibold mb-1">
                        Public Access
                    </h2>
                    <p className="text-sm text-zinc-500">
                        If toggled, this inventory will be accessible
                        (read-only) to everyone.
                    </p>
                </div>
                <Switch
                    checked={inventory.isPublic}
                    onCheckedChange={(checked) =>
                        toggleVisibilityMutation.mutate(checked)
                    }
                    disabled={toggleVisibilityMutation.isPending}
                />
            </div>

            <div
                className={`space-y-6 ${inventory.isPublic ? 'opacity-50 pointer-events-none' : ''}`}
            >
                <div className="relative">
                    <h3 className="text-lg font-medium mb-2">Add User</h3>
                    <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {searchQuery.length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border rounded-md shadow-lg overflow-hidden">
                            {isSearching ? (
                                <div className="p-3 text-sm text-zinc-500 text-center">
                                    Searching...
                                </div>
                            ) : searchResults?.length > 0 ? (
                                searchResults.map((user: any) => {
                                    const alreadyHasAccess =
                                        inventory.accessList?.some(
                                            (access: any) =>
                                                access.user.id === user.id,
                                        );
                                    const isCreator =
                                        inventory.createdById === user.id;

                                    return (
                                        <div
                                            key={user.id}
                                            className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            <div>
                                                <div className="font-medium text-sm">
                                                    {user.name}
                                                </div>
                                                <div className="text-sm text-zinc-500">
                                                    {user.email || 'No email'}
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled={
                                                    alreadyHasAccess ||
                                                    isCreator ||
                                                    addAccessMutation.isPending
                                                }
                                                onClick={() =>
                                                    addAccessMutation.mutate(
                                                        user.id,
                                                    )
                                                }
                                            >
                                                {alreadyHasAccess
                                                    ? 'Has Access'
                                                    : isCreator
                                                      ? 'Creator'
                                                      : 'Add Access'}
                                            </Button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-3 text-sm text-zinc-500 text-center">
                                    No users found
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">
                            Access List ({inventory.accessList?.length || 0})
                        </h3>
                        <select
                            value={sortBy}
                            onChange={(e) =>
                                setSortBy(e.target.value as 'name' | 'email')
                            }
                            className="border rounded-md px-2 py-1 text-sm bg-transparent dark:border-zinc-800"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="email">Sort by Email</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        {sortedAccessList.length === 0 ? (
                            <p className="text-sm text-zinc-500 italic">
                                List is empty. Only you have access.
                            </p>
                        ) : (
                            sortedAccessList.map((access: any) => (
                                <div
                                    key={access.userId}
                                    className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 border rounded-md"
                                >
                                    <div>
                                        <div className="font-medium text-sm">
                                            {access.user?.name ||
                                                'Unknown User'}
                                        </div>
                                        <div className="text-sm text-zinc-500">
                                            {access.user?.email ||
                                                'Unknown Email'}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                            removeAccessMutation.mutate(
                                                access.userId,
                                            )
                                        }
                                        disabled={
                                            removeAccessMutation.isPending
                                        }
                                    >
                                        Revoke
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
