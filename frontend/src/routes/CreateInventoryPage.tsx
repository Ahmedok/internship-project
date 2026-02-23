import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InventorySchema, type InventoryInput } from '@inventory/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CreateInventoryPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<InventoryInput>({
        resolver: zodResolver(InventorySchema as any), // TODO: Fix this typing
        defaultValues: {
            title: '',
            description: '',
            category: 'OTHER',
            isPublic: true,
            tags: [],
        },
    });

    const createInventoryMutation = useMutation({
        mutationFn: async (data: InventoryInput) => {
            const res = await fetch('/api/inventories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                throw new Error('Failed to create inventory');
            }
            return res.json();
        },
        onSuccess: (newInventory) => {
            queryClient.invalidateQueries({
                queryKey: ['personal-inventories'],
            });
            navigate(`/inventories/${newInventory.id}/manage`);
        },
    });

    const onSubmit = (data: InventoryInput) => {
        createInventoryMutation.mutate(data);
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">
                Create New Inventory
            </h1>

            <div className="bg-white dark:bg-zinc-950 p-6 rounded-lg border">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Title *
                        </label>
                        <Input
                            {...register('title')}
                            placeholder="Example: My Collection"
                        />
                        {errors.title && (
                            <p className="text-sm text-red-500 mt-1">
                                {errors.title.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Category
                        </label>
                        <select
                            {...register('category')}
                            className="flex h-10 w-full px-3 py-2 text-sm rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                        >
                            <option value="COLLECTIONS">Collections</option>
                            <option value="ELECTRONICS">Electronics</option>
                            <option value="BOOKS">Books</option>
                            <option value="TOOLS">Tools</option>
                            <option value="OTHER">Other</option>
                        </select>
                        {errors.category && (
                            <p className="text-sm text-red-500 mt-1">
                                {errors.category.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Description
                        </label>
                        <textarea
                            {...register('description')}
                            rows={5}
                            className="flex w-full px-3 py-2 text-sm rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={
                            isSubmitting || createInventoryMutation.isPending
                        }
                    >
                        {createInventoryMutation.isPending
                            ? 'Creating...'
                            : 'Create Inventory'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
