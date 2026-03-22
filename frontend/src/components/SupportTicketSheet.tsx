import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    SupportTicketSchema,
    type SupportTicketInput,
    type InventoryDetail,
} from '@inventory/shared';
import { LifeBuoy } from 'lucide-react';

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from './ui/sheet';
import { Button } from './ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from './ui/form';
import { Textarea } from './ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

export function SupportTicketSheet() {
    const { t } = useTranslation('common');
    const { pathname } = useLocation();
    const queryClient = useQueryClient();
    const { user, isAuthenticated } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);

    const { data: adminEmails } = useQuery({
        queryKey: ['adminEmails'],
        queryFn: async () => {
            const res = await fetch('/api/users/admins/emails');
            if (!res.ok) {
                throw new Error('Failed to fetch admin emails');
            }
            return res.json();
        },
        enabled: isOpen && isAuthenticated,
    });

    const inventoryMatch = pathname.match(/\/inventories\/([^/]+)/);
    const inventoryId = inventoryMatch?.[1];
    const inventoryData = inventoryId
        ? queryClient.getQueryData<InventoryDetail>(['inventory', inventoryId])
        : null;
    const inventoryTitle = inventoryData?.title || null;

    const form = useForm<SupportTicketInput>({
        resolver: zodResolver(SupportTicketSchema),
        defaultValues: {
            summary: '',
            priority: 'Average',
            inventory: null,
            link: window.location.href,
            adminEmails: [],
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                summary: form.getValues('summary'),
                priority: form.getValues('priority'),
                inventory: inventoryTitle,
                link: window.location.href,
            });
        }
    }, [isOpen, inventoryTitle, form]);

    const mutation = useMutation({
        mutationFn: async (data: SupportTicketInput) => {
            const payload = {
                ...data,
                adminEmails: adminEmails || [],
            };

            const res = await fetch('/api/support/ticket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                throw new Error('Failed to submit support ticket');
            }
            return res.json();
        },
        onSuccess: () => {
            setIsOpen(false);
            form.reset();
            toast.success(t('support.success'));
        },
        onError: () => {
            toast.error(t('support.error'));
        },
    });

    if (!isAuthenticated) return null;

    return (
        <>
            <Button
                size="icon"
                className="fixed bottom-20 right-20 z-40 rounded-full size-12 shadow-lg"
                onClick={() => setIsOpen(true)}
            >
                <LifeBuoy className="size-6" />
            </Button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild></SheetTrigger>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-md overflow-y-auto"
                >
                    <SheetHeader>
                        <SheetTitle>{t('support.create_ticket')}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-8 px-1 pb-12">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit((d) =>
                                    mutation.mutate(d),
                                )}
                                className="space-y-6"
                            >
                                <div className="space-y-2.5 text-sm text-muted-foreground bg-secondary/40 p-4 rounded-lg border border-border/50 shadow-sm">
                                    <p>
                                        <strong>
                                            {t('support.reported_by')}:
                                        </strong>{' '}
                                        {user?.name || user?.email}
                                    </p>
                                    <p>
                                        <strong>
                                            {t('support.current_page')}:
                                        </strong>{' '}
                                        <span className="break-all">
                                            {window.location.href}
                                        </span>
                                    </p>
                                    {inventoryTitle && (
                                        <p>
                                            <strong>
                                                {t('support.inventory_context')}
                                                :
                                            </strong>{' '}
                                            {inventoryTitle}
                                        </p>
                                    )}
                                </div>

                                <FormField
                                    control={form.control}
                                    name="priority"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t('support.priority')}
                                            </FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue
                                                            placeholder={t(
                                                                'support.priority',
                                                            )}
                                                        />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="High">
                                                        {t('support.high')}
                                                    </SelectItem>
                                                    <SelectItem value="Average">
                                                        {t('support.average')}
                                                    </SelectItem>
                                                    <SelectItem value="Low">
                                                        {t('support.low')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="summary"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t('support.summary')}
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder={t(
                                                        'support.summary_placeholder',
                                                    )}
                                                    className="resize-none min-h-40 bg-background"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={mutation.isPending}
                                >
                                    {mutation.isPending
                                        ? t('support.submitting')
                                        : t('support.submit')}
                                </Button>
                            </form>
                        </Form>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
