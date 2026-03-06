import { useQuery } from '@tanstack/react-query';
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
        return <div className="p-4">Loading statistics...</div>;
    if (!stats) return null;

    const getFieldName = (id: string) =>
        fields.find((f) => f.id === id)?.title || 'Unknown Field';

    const groupedStringStats = stats.stringStats.reduce(
        (acc, curr) => {
            if (!acc[curr.customFieldId]) acc[curr.customFieldId] = [];
            acc[curr.customFieldId].push(curr);
            return acc;
        },
        {} as Record<string, typeof stats.stringStats>,
    );

    return (
        <div className="space-y-8">
            <div className="bg-zinc-50 dark:bg-zinc-900 border rounded-lg p-6 flex flex-col items-center justify-center">
                <h3 className="text-lg font-medium text-zinc-500 mb-2">
                    Total Items
                </h3>
                <p className="text-5xl font-bold font-mono text-blue-600 dark:text-blue-400">
                    {stats.totalItems}
                </p>
            </div>

            {stats.totalItems === 0 ? (
                <p className="text-center text-zinc-500">
                    Add Items to see statistics
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {stats.numericStats.map((numStat) => (
                        <div
                            key={numStat.customFieldId}
                            className="border rounded-lg p-5 bg-white dark:bg-zinc-900"
                        >
                            <h4 className="font-semibold text-lg mb-4 border-b pb-2">
                                {getFieldName(numStat.customFieldId)} (Numeric)
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider">
                                        Minimum
                                    </div>
                                    <div className="text-xl font-mono">
                                        {Number(numStat.min_val).toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider">
                                        Maximum
                                    </div>
                                    <div className="text-xl font-mono">
                                        {Number(numStat.max_val).toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider">
                                        Average
                                    </div>
                                    <div className="text-xl font-mono">
                                        {Number(numStat.avg_val).toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider">
                                        Filled in
                                    </div>
                                    <div className="text-xl font-mono">
                                        {numStat.count_val} items
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
                                    {getFieldName(fieldId)} (Top-5 Values)
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
                                                {v.frequency} items
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
