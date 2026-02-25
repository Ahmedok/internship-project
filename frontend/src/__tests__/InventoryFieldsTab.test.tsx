import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryFieldsTab } from '@/components/inventories/InventoryFieldsTab';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
            mutations: {
                retry: false,
            },
        },
    });

describe('InventoryFieldsTab (Business Logic)', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockFetch.mockImplementation(async (url) => {
            if (url.includes('/fields') && !url.includes('PUT')) {
                return { ok: true, json: async () => [] };
            }
            return { ok: true, json: async () => ({ message: 'Success' }) };
        });
    });

    afterEach(() => {
        mockAlert.mockClear();
    });

    it('should block adding more than 3 fields of the same type', async () => {
        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <InventoryFieldsTab inventoryId="test-inventory" />
            </QueryClientProvider>,
        );

        await waitFor(() => {
            expect(
                screen.queryByText(/Loading structure/),
            ).not.toBeInTheDocument();
        });

        const addStringBtn = screen.getByText('+ String');
        fireEvent.click(addStringBtn);
        fireEvent.click(addStringBtn);
        fireEvent.click(addStringBtn);
        fireEvent.click(addStringBtn); // 4th click should trigger alert

        expect(mockAlert).toHaveBeenCalledWith(
            'You can only have up to 3 fields of type STRING',
        );

        const inputs = screen.getAllByDisplayValue(/New field \(STRING\)/i);
        expect(inputs).toHaveLength(3);
    });

    it('should form correct payload with sortOrder on save', async () => {
        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <InventoryFieldsTab inventoryId="test-inventory" />
            </QueryClientProvider>,
        );

        await waitFor(() => {
            expect(
                screen.queryByText(/Loading structure/),
            ).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('+ String'));
        fireEvent.click(screen.getByText('+ Number'));

        const stringInput = screen.getByDisplayValue('New field (STRING)');
        fireEvent.change(stringInput, { target: { value: 'Book Title' } });

        const saveBtn = screen.getByText('Save');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            const putCall = mockFetch.mock.calls.find(
                (call) => call[1]?.method === 'PUT',
            );
            expect(putCall).toBeDefined();

            const payload = JSON.parse(putCall![1].body);

            expect(payload).toHaveLength(2);
            expect(payload[0]).toMatchObject({
                title: 'Book Title',
                fieldType: 'STRING',
                sortOrder: 0,
            });
            expect(payload[1]).toMatchObject({
                fieldType: 'NUMBER',
                sortOrder: 1,
            });
        });
    });
});
