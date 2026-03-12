import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { canManage } from '@/lib/permissions';

import { InventorySettingsTab } from '@/components/inventories/InventorySettingsTab';
import { InventoryAccessTab } from '@/components/inventories/InventoryAccessTab';
import { InventoryFieldsTab } from '@/components/inventories/InventoryFieldsTab';
import { InventoryCustomIdTab } from '@/components/inventories/InventoryCustomIdTab';
import { InventoryItemsTab } from '@/components/inventories/InventoryItemsTab';
import { InventoryDiscussionTab } from '@/components/inventories/InventoryDiscussionTab';
import { InventoryStatisticsTab } from '@/components/inventories/InventoryStatisticsTab';
import { ItemModal } from '@/components/inventories/ItemModal';
import { type InventoryDetail } from '@inventory/shared';

export default function InventoryManagePage() {
    const { t } = useTranslation('common');

    const [isItemModalOpen, setIsItemModalOpen] = useState(false);

    const { id } = useParams();
    const { user } = useAuthStore();

    const handleOpenItemModal = () => {
        setIsItemModalOpen(true);
    };

    const {
        data: inventory,
        isLoading,
        error,
    } = useQuery<InventoryDetail>({
        queryKey: ['inventory', id],
        queryFn: async () => {
            const res = await fetch(`/api/inventories/${id}`);
            if (!res.ok) {
                throw new Error('Failed to fetch inventory');
            }
            return res.json();
        },
        enabled: !!id,
    });

    if (isLoading)
        return <div className="p-8">{t('inventory_manage.loader')}</div>;
    if (error || !inventory)
        return (
            <div className="p-8 text-red-500">
                {t('inventory_manage.loader_error')}
            </div>
        );

    const hasFullAccess = canManage(user, inventory);

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex items-baseline justify-between">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {inventory.title}
                </h1>
                <span className="text-sm text-zinc-500">
                    {t('inventory_manage.inventory_management')}
                </span>
            </div>

            {(inventory.imageUrl || inventory.description) && (
                <div className="flex gap-6 p-4 border rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                    {inventory.imageUrl && (
                        <img
                            src={inventory.imageUrl}
                            alt={inventory.title}
                            className="w-20 h-20 md:w-40 md:h-40 object-cover rounded-md shrink-0 border"
                        />
                    )}
                    {inventory.description && (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300">
                            <ReactMarkdown>
                                {inventory.description}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            )}

            <Tabs defaultValue="items" className="w-full">
                <TabsList className="flex flex-wrap p-0 pb-2 mb-4 border-b h-auto! w-full justify-start gap-2 bg-transparent rounded-none">
                    <TabsTrigger
                        value="items"
                        className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                    >
                        {t('inventory_manage.tab_label.items')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="discussion"
                        className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                    >
                        {t('inventory_manage.tab_label.discussion')}
                    </TabsTrigger>

                    {hasFullAccess && (
                        <>
                            <TabsTrigger
                                value="settings"
                                className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                            >
                                {t('inventory_manage.tab_label.settings')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="access"
                                className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                            >
                                {t('inventory_manage.tab_label.access')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="fields"
                                className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                            >
                                {t('inventory_manage.tab_label.fields')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="custom-ids"
                                className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                            >
                                {t('inventory_manage.tab_label.custom_ids')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="statistics"
                                className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                            >
                                {t('inventory_manage.tab_label.statistics')}
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>

                <TabsContent
                    value="items"
                    className="p-4 border rounded-md pt-2 mt-0"
                >
                    <InventoryItemsTab
                        inventory={inventory}
                        onOpenItemModal={handleOpenItemModal}
                    />
                </TabsContent>

                <TabsContent
                    value="discussion"
                    className="p-4 border rounded-md pt-2 mt-0"
                >
                    <InventoryDiscussionTab inventory={inventory} />
                </TabsContent>

                {hasFullAccess && (
                    <>
                        <TabsContent value="settings" className="pt-2 mt-0">
                            <InventorySettingsTab initialData={inventory} />
                        </TabsContent>

                        <TabsContent value="access" className="pt-2 mt-0">
                            <InventoryAccessTab inventory={inventory} />
                        </TabsContent>

                        <TabsContent value="fields" className="pt-2 mt-0">
                            <InventoryFieldsTab inventoryId={inventory.id} />
                        </TabsContent>

                        <TabsContent value="custom-ids" className="pt-2 mt-0">
                            <InventoryCustomIdTab inventory={inventory} />
                        </TabsContent>

                        <TabsContent value="statistics" className="pt-2 mt-0">
                            <InventoryStatisticsTab inventory={inventory} />
                        </TabsContent>
                    </>
                )}
            </Tabs>

            <ItemModal
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                inventory={inventory}
            />
        </div>
    );
}
