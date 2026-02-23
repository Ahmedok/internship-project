import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { InventorySettingsTab } from '@/components/inventories/InventorySettingsTab';

export default function InventoryManagePage() {
    const { id } = useParams();
    const { user } = useAuthStore();

    const {
        data: inventory,
        isLoading,
        error,
    } = useQuery({
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
        return <div className="p-8">Loading management interface...</div>;
    if (error || !inventory)
        return (
            <div className="p-8 text-red-500">
                Inventory not found or failed to load
            </div>
        );

    const isCreator = inventory.createdById === user?.id;
    const isAdmin = user?.role === 'ADMIN';

    const hasFullAccess = isCreator || isAdmin;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">
                    {inventory.title}
                </h1>
                <span className="text-sm text-zinc-500">
                    Inventory Management
                </span>
            </div>

            <Tabs defaultValue="items" className="w-full">
                <TabsList className="flex flex-wrap h-auto w-full justify-start gap-2 bg-transparent">
                    <TabsTrigger
                        value="items"
                        className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                    >
                        Items
                    </TabsTrigger>
                    <TabsTrigger
                        value="discussion"
                        className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                    >
                        Discussion
                    </TabsTrigger>

                    {hasFullAccess && (
                        <>
                            <TabsTrigger
                                value="settings"
                                className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                            >
                                Settings
                            </TabsTrigger>
                            <TabsTrigger
                                value="access"
                                className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                            >
                                Access
                            </TabsTrigger>
                            <TabsTrigger
                                value="fields"
                                className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                            >
                                Fields
                            </TabsTrigger>
                            <TabsTrigger
                                value="custom-ids"
                                className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                            >
                                Custom IDs
                            </TabsTrigger>
                            <TabsTrigger
                                value="statistics"
                                className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                            >
                                Statistics
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>

                <TabsContent
                    value="items"
                    className="p-4 border rounded-md mt-4"
                >
                    <div>TODO: Items content</div>
                </TabsContent>

                <TabsContent
                    value="discussion"
                    className="p-4 border rounded-md mt-4"
                >
                    <div>TODO: Discussion content</div>
                </TabsContent>

                {hasFullAccess && (
                    <>
                        <TabsContent value="settings" className="mt-4">
                            <InventorySettingsTab initialData={inventory} />
                        </TabsContent>

                        <TabsContent value="access" className="mt-4">
                            <div>TODO: Access management</div>
                        </TabsContent>

                        <TabsContent value="fields" className="mt-4">
                            <div>TODO: Custom fields setup</div>
                        </TabsContent>

                        <TabsContent value="custom-ids" className="mt-4">
                            <div>TODO: Custom IDs setup</div>
                        </TabsContent>

                        <TabsContent value="statistics" className="mt-4">
                            <div>TODO: Statistics</div>
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    );
}
