import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import {
    type InventoryDetail,
    type CreateCommentInput,
    CreateCommentSchema,
    type CommentDto,
} from '@inventory/shared';

import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface InventoryDiscussionTabProps {
    inventory: InventoryDetail;
}

export function InventoryDiscussionTab({
    inventory,
}: InventoryDiscussionTabProps) {
    const { t } = useTranslation('common');
    const queryClient = useQueryClient();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: comments, isLoading } = useQuery<CommentDto[]>({
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
        const socketInstance = io({
            path: '/socket.io',
        });

        socketInstance.on('connect', () => {
            socketInstance.emit('joinInventory', inventory.id);
        });

        socketInstance.on('newComment', (newComment: CommentDto) => {
            queryClient.setQueryData<CommentDto[]>(
                ['inventory-comments', inventory.id],
                (oldData) => {
                    if (!oldData) return [newComment];
                    if (oldData.some((c) => c.id === newComment.id))
                        return oldData;
                    return [...oldData, newComment];
                },
            );
        });

        return () => {
            socketInstance.emit('leaveInventory', inventory.id);
            socketInstance.disconnect();
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

    if (isLoading)
        return (
            <div className="p-4">
                {t('inventory_manage.discussion_tab.loading')}
            </div>
        );

    return (
        <div className="flex flex-col w-full h-dvh max-h-180 rounded-lg bg-background">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
                {!comments || comments.length === 0 ? (
                    <div className="text-center text-muted-foreground mt-10">
                        {t('inventory_manage.discussion_tab.empty_state')}
                    </div>
                ) : (
                    comments.map((comment: CommentDto) => (
                        <div
                            key={comment.id}
                            className="flex gap-3 bg-muted p-3 rounded-lg shadow-sm border"
                        >
                            <div className="size-10 shrink-0 flex items-center justify-center font-bold text-muted-foreground overflow-hidden rounded-full bg-muted">
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
                                    <span className="text-xs text-muted-foreground">
                                        {format(
                                            new Date(comment.createdAt),
                                            'dd.MM.yyyy HH:mm',
                                        )}
                                    </span>
                                </div>
                                <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
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

            <div className="p-4 bg-background border-t">
                <form
                    onSubmit={handleSubmit((data) => postMutation.mutate(data))}
                    className="flex gap-2 items-start"
                >
                    <div className="flex-1">
                        <Textarea
                            {...register('content')}
                            placeholder={t(
                                'inventory_manage.discussion_tab.placeholder',
                            )}
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
                        {postMutation.isPending
                            ? '...'
                            : t('inventory_manage.discussion_tab.send')}
                    </Button>
                </form>
            </div>
        </div>
    );
}
