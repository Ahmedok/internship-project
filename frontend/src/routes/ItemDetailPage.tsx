import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { InventoryItemDto, ItemFieldValueDto } from '@inventory/shared';

interface LikeData {
    count: number;
    isLiked: boolean;
}

export default function ItemDetailPage() {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();

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

    const { data: likeData } = useQuery<LikeData>({
        queryKey: ['item-like', id],
        queryFn: async () => {
            const res = await fetch(`/api/items/${id}/like`);
            if (!res.ok) throw new Error('Failed to fetch likes');
            return res.json();
        },
        enabled: !!id,
    });

    const likeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/items/${id}/like`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to toggle like');
            return res.json();
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['item-like', id] });
            const previousLikeData = queryClient.getQueryData<LikeData>([
                'item-like',
                id,
            ]);
            queryClient.setQueryData<LikeData>(['item-like', id], (old) => {
                if (!old) return { count: 1, isLiked: true };
                return {
                    isLiked: !old.isLiked,
                    count: old.isLiked
                        ? Math.max(0, old.count - 1)
                        : old.count + 1,
                };
            });
            return { previousLikeData };
        },
        onError: (_err, _newTodo, context) => {
            if (context?.previousLikeData) {
                queryClient.setQueryData<LikeData>(
                    ['item-like', id],
                    context.previousLikeData,
                );
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['item-like', id] });
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
            return fv.valueBoolean ? 'True' : 'False';
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
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-3xl font-bold">
                            Item: {item.customId}
                        </h1>
                        <button
                            onClick={() => likeMutation.mutate()}
                            disabled={likeMutation.isPending && !likeData}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                                likeData?.isLiked
                                    ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800'
                            }`}
                        >
                            Like
                            <span className="font-semibold">
                                {likeData?.count || 0}
                            </span>
                        </button>
                    </div>
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
