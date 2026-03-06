import { useSearchParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type {
    SearchResponseDto,
    SearchInventoryDto,
    SearchItemDto,
} from '@inventory/shared';

import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
    TableCell,
} from '../components/ui/table';

export default function SearchResultsPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';

    const { data, isLoading, error } = useQuery<SearchResponseDto>({
        queryKey: ['search', query],
        queryFn: async () => {
            if (!query) return { inventories: [], items: [] };
            const res = await fetch(
                `/api/search?q=${encodeURIComponent(query)}`,
            );
            if (!res.ok) {
                throw new Error('Search request failed');
            }
            return res.json();
        },
        enabled: query.trim().length > 0,
    });

    if (!query)
        return (
            <div className="p-8 text-center text-zinc-500">
                Please enter a search query.
            </div>
        );
    if (isLoading) return <div className="p-8 text-center">Searching...</div>;
    if (error)
        return (
            <div className="p-8 text-center text-red-500">
                {(error as Error).message}
            </div>
        );

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold">Search Results: "{query}"</h1>

            <section>
                <h2 className="text-xl font-semibold mb-4">
                    Inventories ({data?.inventories.length || 0})
                </h2>
                {!data?.inventories.length ? (
                    <p className="text-zinc-500">Inventories not found.</p>
                ) : (
                    <div className="border rounded-md overflow-hidden bg-white dark:bg-zinc-950">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="w-32 text-right">
                                        Relevancy
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.inventories.map(
                                    (inv: SearchInventoryDto) => (
                                        <TableRow key={inv.id}>
                                            <TableCell>
                                                <Link
                                                    to={`/inventories/${inv.id}`}
                                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                                >
                                                    {inv.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-right text-zinc-500 font-mono">
                                                {(inv.rank * 100).toFixed(1)}
                                            </TableCell>
                                        </TableRow>
                                    ),
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4">
                    Items ({data?.items.length || 0})
                </h2>
                {!data?.items.length ? (
                    <p className="text-zinc-500">Items not found.</p>
                ) : (
                    <div className="border rounded-md overflow-hidden bg-white dark:bg-zinc-950">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-48">
                                        Item ID
                                    </TableHead>
                                    <TableHead className="w-64">
                                        Inventory
                                    </TableHead>
                                    <TableHead>Field Matches</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.map((item: SearchItemDto) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Link
                                                to={`/items/${item.id}`}
                                                className="text-blue-600 dark:text-blue-400 hover:underline font-mono font-medium"
                                            >
                                                {item.customId}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                to={`/inventories/${item.inventoryId}`}
                                                className="text-zinc-700 dark:text-zinc-300 hover:underline"
                                            >
                                                {item.inventoryTitle}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="truncate max-w-xs text-sm text-zinc-500">
                                            {item.searchText || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </section>
        </div>
    );
}
