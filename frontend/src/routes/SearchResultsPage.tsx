import { useSearchParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type {
    SearchResponseDto,
    SearchInventoryDto,
    SearchItemDto,
    InventoryDetail,
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
    const { t } = useTranslation('common');
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const tag = searchParams.get('tag') || '';

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

    const { data: tagResults, isLoading: tagLoading } = useQuery<{
        data: InventoryDetail[];
    }>({
        queryKey: ['inventories', 'tag', tag],
        queryFn: async () => {
            const res = await fetch(
                `/api/inventories?tag=${encodeURIComponent(tag)}`,
            );
            if (!res.ok) {
                throw new Error('Failed to fetch inventories by tag');
            }
            return res.json();
        },
        enabled: tag.trim().length > 0,
    });

    if (!query && !tag)
        return (
            <div className="p-8 text-center text-muted-foreground">
                {t('search_results.empty_query')}
            </div>
        );
    if (isLoading)
        return (
            <div className="p-8 text-center">
                {t('search_results.searching')}
            </div>
        );
    if (error)
        return (
            <div className="p-8 text-center text-red-500">
                {(error as Error).message}
            </div>
        );

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold">
                {tag
                    ? t('search_results.tag_title', { tag })
                    : t('search_results.title', { query })}
            </h1>

            <section>
                {tag ? (
                    <>
                        <h2 className="text-xl font-semibold mb-4">
                            {t('search_results.inventories_count', {
                                count: tagResults?.data?.length || 0,
                            })}
                        </h2>
                        {tagLoading ? (
                            <p className="text-muted-foreground">
                                {t('search_results.searching')}
                            </p>
                        ) : !tagResults?.data?.length ? (
                            <p className="text-muted-foreground">
                                {t('search_results.no_tag_results')}
                            </p>
                        ) : (
                            <div className="border rounded-md overflow-hidden bg-background">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                {t('inventories.title')}
                                            </TableHead>
                                            <TableHead className="hidden md:table-cell">
                                                {t('inventories.description')}
                                            </TableHead>
                                            <TableHead>
                                                {t('inventories.category')}
                                            </TableHead>
                                            <TableHead>
                                                {t('inventories.tags')}
                                            </TableHead>
                                            <TableHead>
                                                {t('inventories.createdAt')}
                                            </TableHead>
                                            <TableHead>
                                                {t('inventories.author')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tagResults.data.map(
                                            (inv: InventoryDetail) => (
                                                <TableRow key={inv.id}>
                                                    <TableCell>
                                                        <Link
                                                            to={`/inventories/${inv.id}`}
                                                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                                        >
                                                            {inv.title}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell max-w-36 truncate text-sm text-muted-foreground">
                                                        {inv.description || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground font-mono">
                                                        {inv.category}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        <div className="flex flex-wrap gap-1">
                                                            {inv.tags.map(
                                                                (invTag) =>
                                                                    invTag.tag
                                                                        .name ===
                                                                    tag ? (
                                                                        <span
                                                                            key={
                                                                                invTag
                                                                                    .tag
                                                                                    .name
                                                                            }
                                                                            className="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                                                        >
                                                                            #
                                                                            {
                                                                                invTag
                                                                                    .tag
                                                                                    .name
                                                                            }
                                                                        </span>
                                                                    ) : (
                                                                        <span
                                                                            key={
                                                                                invTag
                                                                                    .tag
                                                                                    .name
                                                                            }
                                                                            className="px-1.5 py-0.5 rounded text-xs text-muted-foreground"
                                                                        >
                                                                            #
                                                                            {
                                                                                invTag
                                                                                    .tag
                                                                                    .name
                                                                            }
                                                                        </span>
                                                                    ),
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {format(
                                                            new Date(
                                                                inv.createdAt,
                                                            ),
                                                            'dd.MM.yyyy',
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground font-mono">
                                                        {inv.createdBy?.name ||
                                                            t('common.unknown')}
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold mb-4">
                            {t('search_results.inventories_count', {
                                count: data?.inventories.length || 0,
                            })}
                        </h2>
                        {!data?.inventories.length ? (
                            <p className="text-muted-foreground">
                                {t('search_results.no_inventories')}
                            </p>
                        ) : (
                            <div className="border rounded-md overflow-hidden bg-background">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                {t('search_results.name')}
                                            </TableHead>
                                            <TableHead className="w-32 text-right">
                                                {t('search_results.relevancy')}
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
                                                    <TableCell className="text-right text-muted-foreground font-mono">
                                                        {(
                                                            inv.rank * 100
                                                        ).toFixed(1)}
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </>
                )}
            </section>

            {!tag && (
                <section>
                    <h2 className="text-xl font-semibold mb-4">
                        {t('search_results.items_count', {
                            count: data?.items.length || 0,
                        })}
                    </h2>
                    {!data?.items.length ? (
                        <p className="text-muted-foreground">
                            {t('search_results.no_items')}
                        </p>
                    ) : (
                        <div className="border rounded-md overflow-hidden bg-background">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-48">
                                            {t('search_results.item_id')}
                                        </TableHead>
                                        <TableHead className="w-64">
                                            {t('search_results.inventory')}
                                        </TableHead>
                                        <TableHead>
                                            {t('search_results.field_matches')}
                                        </TableHead>
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
                                                    className="text-foreground hover:underline"
                                                >
                                                    {item.inventoryTitle}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="truncate max-w-xs text-sm text-muted-foreground">
                                                {item.searchText || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
