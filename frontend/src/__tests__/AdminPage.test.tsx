import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPage from '@/routes/AdminPage';
import type { User } from '@inventory/shared';

globalThis.fetch = vi.fn();

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

describe('AdminPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should disable buttons when no users are selected', async () => {
        const mockUsers: User[] = [
            {
                id: '1',
                name: 'John Doe',
                email: 'john.doe@example.com',
                role: 'USER',
                blocked: false,
                avatarUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];

        (globalThis.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: mockUsers, meta: { total: 1 } }),
        });

        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <AdminPage />
            </QueryClientProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        const blockButton = screen.getByRole('button', { name: /^block$/i });
        expect(blockButton).toBeDisabled();
    });

    it('should enable buttons when user rows are selected', async () => {
        const mockUsers: User[] = [
            {
                id: '1',
                name: 'Bobby',
                email: 'bobby@example.com',
                role: 'USER',
                blocked: false,
                avatarUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];

        (globalThis.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: mockUsers, meta: { total: 1 } }),
        });

        render(
            <QueryClientProvider client={createTestQueryClient()}>
                <AdminPage />
            </QueryClientProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('Bobby')).toBeInTheDocument();
        });

        const blockButton = screen.getByRole('button', { name: /^block$/i });
        expect(blockButton).toBeDisabled();

        const rowCheckbox = screen.getAllByRole('checkbox', {
            name: /select/i,
        })[1];
        await userEvent.click(rowCheckbox);

        expect(blockButton).toBeEnabled();
    });
});
