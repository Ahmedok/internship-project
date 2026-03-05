import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import {
    type InventoryDetail,
    type CreateCommentInput,
    CreateCommentSchema,
} from '@inventory/shared';

import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface InventoryDiscussionTabProps {
    inventory: InventoryDetail;
}

let socket: Socket | null = null;

export function InventoryDiscussionTab({
    inventory,
}: InventoryDiscussionTabProps) {
    const queryClient = useQueryClient();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: comments, isLoading } = useQuery({
        queryKey: ['inventory-comments', inventory.id],
        queryFn: async () => {
            const res = await fetch(
                `/api/inventories/${inventory.id}/comments?limit=100`,
            );
            if (!res.ok) {
                throw new Error('Failed to fetch comments');
            }
            return res.json();
        },
    });

    useEffect(() => {
        socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            withCredentials: true,
        });

        socket.emit('joinInventory', inventory.id);

        socket.on('newComment', (newComment) => {
            queryClient.setQueryData(
                ['inventory-comments', inventory.id],
                (oldData: any) => {
                    if (!oldData) return [newComment];
                    if (oldData.some((c: any) => c.id === newComment.id))
                        return oldData;
                    return [...oldData, newComment];
                },
            );
        });

        return () => {
            if (socket) {
                socket.emit('leaveInventory', inventory.id);
                socket.disconnect();
            }
        };
    }, [inventory.id, queryClient]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateCommentInput>({
        resolver: zodResolver(CreateCommentSchema),
    });

    const postMutation = useMutation({
        mutationFn: async (data: CreateCommentInput) => {
            const res = await fetch(
                `/api/inventories/${inventory.id}/comments`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                },
            );
            if (!res.ok) {
                throw new Error('Failed to post comment');
            }
            return res.json();
        },
        onSuccess: () => {
            reset();
        },
    });

    if (isLoading) return <div className="p-4">Loading discussion...</div>;

    return (
        <div className="flex flex-col h-150 border rounded-md bg-white dark:bg-zinc-950 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900/50">
                {!comments || comments.length === 0 ? (
                    <div className="text-center text-zinc-500 mt-10">
                        No comments yet. Be the first to start the discussion!
                    </div>
                ) : (
                    comments.map((comment: any) => (
                        <div
                            key={comment.id}
                            className="flex gap-3 bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-800"
                        >
                            <div className="w-10 h-10 shrink-0 flex items-center justify-center font-bold text-zinc-500 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                                {comment.author?.avatarUrl ? (
                                    <img
                                        src={comment.author.avatarUrl}
                                        alt="avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    comment.author?.name
                                        ?.charAt(0)
                                        .toUpperCase() || 'U'
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-semibold text-sm">
                                        {comment.author?.name || 'User'}
                                    </span>
                                    <span className="text-xs text-zinc-400">
                                        {format(
                                            new Date(comment.createdAt),
                                            'dd.MM.yyyy HH:mm',
                                        )}
                                    </span>
                                </div>
                                <div className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>
                                        {comment.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-zinc-950 border-t">
                <form
                    onSubmit={handleSubmit((data) => postMutation.mutate(data))}
                    className="flex gap-2 items-start"
                >
                    <div className="flex-1">
                        <Textarea
                            {...register('content')}
                            placeholder="Write a comment (Markdown supported)..."
                            className="resize-none h-20"
                            onKeyDown={(e) => {
                                if (
                                    e.key === 'Enter' &&
                                    (e.ctrlKey || e.metaKey)
                                ) {
                                    handleSubmit((data) =>
                                        postMutation.mutate(data),
                                    )();
                                }
                            }}
                        />
                        {errors.content && (
                            <span className="text-xs text-red-500 mt-1 inline-block">
                                {String(errors.content.message)}
                            </span>
                        )}
                    </div>
                    <Button
                        type="submit"
                        disabled={postMutation.isPending}
                        className="h-20 px-8"
                    >
                        {postMutation.isPending ? '...' : 'Send'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
