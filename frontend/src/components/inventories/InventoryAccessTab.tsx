import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/hooks/useDebounce';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import type { InventoryDetail } from '@inventory/shared';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export function InventoryAccessTab({
    inventory,
}: {
    inventory: InventoryDetail;
}) {
    const { t } = useTranslation('common');

    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'email'>('name');

    const debouncedSearch = useDebounce(searchQuery, 300);

    const togglePublicMutation = useMutation({
        mutationFn: async (isPublic: boolean) => {
            const res = await fetch(`/api/inventories/${inventory.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic, version: inventory.version }),
            });
            if (!res.ok) {
                throw new Error('Failed to update public status');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['inventory', inventory.id],
            });
        },
        onError: (error) => {
            if (error instanceof Error && error.message.includes('public')) {
                toast.error(t('errors.update_public_error'));
            } else {
                toast.error(t('errors.generic_error'));
            }
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
        onError: (error) => {
            if (
                error instanceof Error &&
                error.message.includes('add access')
            ) {
                toast.error(t('errors.add_access_error'));
            } else {
                toast.error(t('errors.generic_error'));
            }
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
        onError: (error) => {
            if (
                error instanceof Error &&
                error.message.includes('remove access')
            ) {
                toast.error(t('errors.remove_access_error'));
            } else {
                toast.error(t('errors.generic_error'));
            }
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
        <div className="space-y-6 w-full p-6 border rounded-lg bg-background">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h2 className="text-xl font-semibold mb-1">
                        {t('inventory_manage.access_tab.public_toggle')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t('inventory_manage.access_tab.public_toggle_desc')}
                    </p>
                </div>
                <Switch
                    checked={inventory.isPublic}
                    onCheckedChange={(checked) =>
                        togglePublicMutation.mutate(checked)
                    }
                    disabled={togglePublicMutation.isPending}
                />
            </div>

            <div
                className={`space-y-6 ${inventory.isPublic ? 'opacity-50 pointer-events-none' : ''}`}
            >
                <div className="relative">
                    <h3 className="text-lg font-medium mb-2">
                        {t('inventory_manage.access_tab.add_user_access')}
                    </h3>
                    <Input
                        placeholder={t('common.search_user_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {searchQuery.length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg overflow-hidden">
                            {isSearching ? (
                                <div className="p-3 text-sm text-muted-foreground text-center">
                                    {t('common.searching')}
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
                                            className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted transition-colors"
                                        >
                                            <div>
                                                <div className="font-medium text-sm">
                                                    {user.name}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {user.email ||
                                                        t(
                                                            'common.email_unknown',
                                                        )}
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
                                                    ? t(
                                                          'inventory_manage.access_tab.has_access',
                                                      )
                                                    : isCreator
                                                      ? t(
                                                            'inventory_manage.access_tab.is_creator',
                                                        )
                                                      : t(
                                                            'inventory_manage.access_tab.add_access',
                                                        )}
                                            </Button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-3 text-sm text-muted-foreground text-center">
                                    {t('common.no_users_found')}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex flex-wrap items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">
                            {t('inventory_manage.access_tab.access_list')} (
                            {inventory.accessList?.length || 0})
                        </h3>
                        <select
                            value={sortBy}
                            onChange={(e) =>
                                setSortBy(e.target.value as 'name' | 'email')
                            }
                            className="border rounded-md px-2 py-1 text-sm bg-transparent"
                        >
                            <option value="name">
                                {t('inventory_manage.access_tab.sort_by_name')}
                            </option>
                            <option value="email">
                                {t('inventory_manage.access_tab.sort_by_email')}
                            </option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        {sortedAccessList.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                                {t(
                                    'inventory_manage.access_tab.empty_access_list',
                                )}
                            </p>
                        ) : (
                            sortedAccessList.map((access: any) => (
                                <div
                                    key={access.userId}
                                    className="flex items-center justify-between p-3 bg-muted border rounded-md"
                                >
                                    <div>
                                        <div className="font-medium text-sm">
                                            {access.user?.name ||
                                                t('common.username_unknown')}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {access.user?.email ||
                                                t('common.email_unknown')}
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
                                        className="flex items-center gap-2"
                                    >
                                        <Trash2 className="size-4 shrink-0" />
                                        <span className="hidden sm:inline">
                                            {t(
                                                'inventory_manage.access_tab.revoke_access',
                                            )}
                                        </span>
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
