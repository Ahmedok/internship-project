import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { InventoryItemDto, ItemFieldValueDto } from '@inventory/shared';

export function ItemDetailPage() {
    const { id } = useParams<{ id: string }>();

    const {
        data: item,
        isLoading,
        error,
    } = useQuery<InventoryItemDto>({
        queryKey: ['item-detail', id],
        queryFn: async () => {
            const res = await fetch(`/api/items/${id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Item not found');
                throw new Error('Data fetch failed');
            }
            return res.json();
        },
    });

    if (isLoading)
        return <div className="p-8 text-center">Loading item...</div>;
    if (error)
        return (
            <div className="p-8 text-center text-red-500">
                {(error as Error).message}
            </div>
        );
    if (!item) return null;

    const renderFieldValue = (fv: ItemFieldValueDto) => {
        const fieldType = fv.customField?.fieldType;

        if (fieldType === 'BOOLEAN') {
            return fv.valueBoolean ? 'Yes' : 'No';
        }
        if (fieldType === 'NUMBER') {
            return fv.valueNumber !== null ? String(fv.valueNumber) : '-';
        }
        if (fieldType === 'DOCUMENT' && fv.valueString) {
            return (
                <a
                    href={fv.valueString}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline break-all"
                >
                    {fv.valueString}
                </a>
            );
        }
        return fv.valueString || '-';
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-start border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">
                        Item: {item.customId}
                    </h1>
                    <p className="text-zinc-500">
                        Inventory:{' '}
                        <Link
                            to={`/inventories/${item.inventoryId}`}
                            className="text-blue-600 hover:underline"
                        >
                            {item.inventory?.title || 'Go to Inventory'}
                        </Link>
                    </p>
                </div>
                <div className="text-right text-sm text-zinc-500">
                    <p>
                        Created at:{' '}
                        {format(new Date(item.createdAt), 'dd.MM.yyyy HH:mm')}
                    </p>
                    <p>
                        Updated at:{' '}
                        {format(new Date(item.updatedAt), 'dd.MM.yyyy HH:mm')}
                    </p>
                    <p>Author: {item.createdBy?.name || 'Unknown'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {item.fieldValues.map((fv) => (
                    <div
                        key={fv.id}
                        className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border"
                    >
                        <div className="text-sm font-medium text-zinc-500 mb-1">
                            {fv.customField?.title || 'Unknown Field'}
                        </div>
                        <div className="text-lg text-zinc-900 dark:text-zinc-100">
                            {renderFieldValue(fv)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
