import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { InventorySummaryDto, TagCloudDto } from '@inventory/shared';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';

export default function HomePage() {
    const navigate = useNavigate();

    const { data: latest, isLoading: loadingLatest } = useQuery<
        InventorySummaryDto[]
    >({
        queryKey: ['inventories', 'latest'],
        queryFn: async () => {
            const res = await fetch('/api/inventories/latest');
            if (!res.ok) {
                throw new Error('Failed to fetch latest inventories');
            }
            return res.json();
        },
    });

    const { data: popular, isLoading: loadingPopular } = useQuery<
        InventorySummaryDto[]
    >({
        queryKey: ['inventories', 'popular'],
        queryFn: async () => {
            const res = await fetch('/api/inventories/popular');
            if (!res.ok) {
                throw new Error('Failed to fetch popular inventories');
            }
            return res.json();
        },
    });

    const { data: tags, isLoading: loadingTags } = useQuery<TagCloudDto[]>({
        queryKey: ['tags', 'cloud'],
        queryFn: async () => {
            const res = await fetch('/api/tags/cloud');
            if (!res.ok) {
                throw new Error('Failed to fetch tag cloud');
            }
            return res.json();
        },
    });

    const getTagStyle = (count: number, allTags: TagCloudDto[]) => {
        if (!allTags.length) return {};
        const maxCount = Math.max(...allTags.map((t) => t.count));
        const minCount = Math.min(...allTags.map((t) => t.count));
        const ratio =
            maxCount === minCount
                ? 0.5
                : (count - minCount) / (maxCount - minCount);
        const fontSize = 0.8 + ratio * 1.2;
        const fontWeight = 400 + Math.round(ratio * 4) * 100;
        return { fontSize: `${fontSize}em`, fontWeight };
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-12">
            <section className="bg-zinc-50 dark:bg-zinc-900/50 p-8 rounded-xl border text-center">
                <h2 className="text-2xl font-bold mb-6">Popular Tags</h2>
                {loadingTags ? (
                    <div className="text-zinc-500">Loading tags...</div>
                ) : (
                    <div className="flex flex-wrap justify-center items-center gap-4">
                        {tags?.map((tag) => (
                            <button
                                key={tag.id}
                                onClick={() =>
                                    navigate(
                                        `/search?q=${encodeURIComponent(tag.name)}`,
                                    )
                                }
                                style={getTagStyle(tag.count, tags)}
                                title={`${tag.count} inventories`}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer"
                            >
                                #{tag.name}
                            </button>
                        ))}
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Latest Inventories */}
                <section>
                    <h2 className="text-xl font-bold mb-4">
                        Latest Inventories
                    </h2>
                    <div className="border rounded-md bg-white dark:bg-zinc-950 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead className="text-right">
                                        Items
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingLatest ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="text-center py-4"
                                        >
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    latest?.map((inv) => (
                                        <TableRow key={inv.id}>
                                            <TableCell>
                                                <Link
                                                    to={`/inventories/${inv.id}`}
                                                    className="font-medium text-blue-600 hover:underline"
                                                >
                                                    {inv.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                {inv.createdBy.name}
                                            </TableCell>
                                            <TableCell>
                                                {format(
                                                    new Date(inv.createdAt),
                                                    'dd.MM.yyyy HH:mm',
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {inv._count.items}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </section>

                {/* Popular Inventories */}
                <section>
                    <h2 className="text-xl font-bold mb-4">
                        Popular Inventories
                    </h2>
                    <div className="border rounded-md bg-white dark:bg-zinc-950 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Updated At</TableHead>
                                    <TableHead className="text-right">
                                        Items
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingPopular ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="text-center py-4"
                                        >
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    popular?.map((inv) => (
                                        <TableRow key={inv.id}>
                                            <TableCell>
                                                <Link
                                                    to={`/inventories/${inv.id}`}
                                                    className="font-medium text-blue-600 hover:underline"
                                                >
                                                    {inv.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                {inv.createdBy.name}
                                            </TableCell>
                                            <TableCell>
                                                {format(
                                                    new Date(inv.updatedAt),
                                                    'dd.MM.yyyy HH:mm',
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {inv._count.items}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </div>
        </div>
    );
}
