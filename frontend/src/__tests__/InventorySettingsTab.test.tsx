import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventorySettingsTab } from '@/components/inventories/InventorySettingsTab';

vi.mock('@/hooks/useDebounce', () => ({
    useDebounce: (value: any) => value,
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const createTestQueryCLient = () =>
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

const initialMockData = {
    id: 'test-inventory-1',
    title: 'Old Title',
    description: '',
    imageUrl: null,
    createdById: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: 'OTHER' as const,
    isPublic: true,
    tags: [],
    accessList: [],
    version: 1,
};

describe('InventorySettingsTab (optimistic blocking)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should intercept error 409 and show conflict message', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 409,
        });

        render(
            <QueryClientProvider client={createTestQueryCLient()}>
                <InventorySettingsTab initialData={initialMockData} />
            </QueryClientProvider>,
        );

        const titleInput = await screen.findByLabelText(/title/i);
        fireEvent.change(titleInput, { target: { value: 'New Title' } });

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/inventories/test-inventory-1',
                expect.objectContaining({
                    method: 'PATCH',
                    body: expect.stringContaining('"version":1'),
                }),
            );
        });

        await waitFor(() => {
            expect(
                screen.getByText(
                    /This inventory has been modified elsewhere\. Please refresh to get the latest version\./i,
                ),
            ).toBeInTheDocument();
            expect(
                screen.getByText(/Stopped \(conflict\)/i),
            ).toBeInTheDocument();
        });
    });
});
