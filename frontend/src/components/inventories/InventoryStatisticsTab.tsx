import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type {
    InventoryDetail,
    InventoryStatsDto,
    CustomFieldInput,
} from '@inventory/shared';

interface InventoryStatisticsTabProps {
    inventory: InventoryDetail;
}

export function InventoryStatisticsTab({
    inventory,
}: InventoryStatisticsTabProps) {
    const { t } = useTranslation('common');

    const { data: fields } = useQuery<CustomFieldInput[]>({
        queryKey: ['inventory-fields', inventory.id],
        queryFn: async () => {
            const res = await fetch(`/api/inventories/${inventory.id}/fields`);
            if (!res.ok) {
                throw new Error('Failed to fetch inventory fields');
            }
            return res.json();
        },
    });

    const { data: stats, isLoading } = useQuery<InventoryStatsDto>({
        queryKey: ['inventory-stats', inventory.id],
        queryFn: async () => {
            const res = await fetch(`/api/inventories/${inventory.id}/stats`);
            if (!res.ok) {
                throw new Error('Failed to fetch inventory statistics');
            }
            return res.json();
        },
    });

    if (isLoading || !fields)
        return (
            <div className="p-4">
                {t('inventory_manage.statistics_tab.loading')}
            </div>
        );
    if (!stats) return null;

    const getFieldName = (id: string) =>
        fields.find((f) => f.id === id)?.title ||
        t('inventory_manage.statistics_tab.unknown_field');

    const groupedStringStats = stats.stringStats.reduce(
        (acc, curr) => {
            const existing = acc[curr.customFieldId];
            if (!existing) {
                acc[curr.customFieldId] = [curr];
            } else {
                existing.push(curr);
            }
            return acc;
        },
        {} as Record<string, typeof stats.stringStats>,
    );

    return (
        <div className="space-y-8 w-full">
            <div className="bg-zinc-50 dark:bg-zinc-900 border rounded-lg p-6 flex flex-col items-center justify-center">
                <h3 className="text-lg font-medium text-zinc-500 mb-2">
                    {t('inventory_manage.statistics_tab.total_items')}
                </h3>
                <p className="text-5xl font-bold font-mono text-blue-600 dark:text-blue-400">
                    {stats.totalItems}
                </p>
            </div>

            {stats.totalItems === 0 ? (
                <p className="text-center text-zinc-500">
                    {t('inventory_manage.statistics_tab.empty_state')}
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {stats.numericStats.map((numStat) => (
                        <div
                            key={numStat.customFieldId}
                            className="border rounded-lg p-5 bg-white dark:bg-zinc-900"
                        >
                            <h4 className="font-semibold text-lg mb-4 border-b pb-2">
                                {getFieldName(numStat.customFieldId)}{' '}
                                {t(
                                    'inventory_manage.statistics_tab.numeric_label',
                                )}
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider">
                                        {t(
                                            'inventory_manage.statistics_tab.minimum',
                                        )}
                                    </div>
                                    <div className="text-xl font-mono">
                                        {Number(numStat.min_val).toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider">
                                        {t(
                                            'inventory_manage.statistics_tab.maximum',
                                        )}
                                    </div>
                                    <div className="text-xl font-mono">
                                        {Number(numStat.max_val).toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider">
                                        {t(
                                            'inventory_manage.statistics_tab.average',
                                        )}
                                    </div>
                                    <div className="text-xl font-mono">
                                        {Number(numStat.avg_val).toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider">
                                        {t(
                                            'inventory_manage.statistics_tab.filled_in',
                                        )}
                                    </div>
                                    <div className="text-xl font-mono">
                                        {t(
                                            'inventory_manage.statistics_tab.items_count',
                                            {
                                                count: Number(
                                                    numStat.count_val,
                                                ),
                                            },
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {Object.entries(groupedStringStats).map(
                        ([fieldId, values]) => (
                            <div
                                key={fieldId}
                                className="border rounded-lg p-5 bg-white dark:bg-zinc-950"
                            >
                                <h4 className="font-semibold text-lg mb-4 border-b pb-2">
                                    {getFieldName(fieldId)}{' '}
                                    {t(
                                        'inventory_manage.statistics_tab.top_values',
                                    )}
                                </h4>
                                <ul className="space-y-2">
                                    {values.map((v, idx) => (
                                        <li
                                            key={idx}
                                            className="flex justify-between items-center"
                                        >
                                            <span
                                                className="truncate pr-4 text-sm"
                                                title={v.valueString}
                                            >
                                                {v.valueString}
                                            </span>
                                            <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                                                {t(
                                                    'inventory_manage.statistics_tab.items_count',
                                                    {
                                                        count: Number(
                                                            v.frequency,
                                                        ),
                                                    },
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}
