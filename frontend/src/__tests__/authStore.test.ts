import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import { type User } from '@inventory/shared';

const initialState = useAuthStore.getState();

describe('Auth Store (Zustand)', () => {
    beforeEach(() => {
        useAuthStore.setState(initialState, true);

        globalThis.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should have correct initial state', () => {
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.isAdmin).toBe(false);
        expect(state.isLoading).toBe(true);
    });

    it('should handle successful checkAuth for regular USER', async () => {
        const mockUser: User = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'John Doe',
            email: 'john.doe@example.com',
            avatarUrl: null,
            role: 'USER',
            blocked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => mockUser,
        });

        await useAuthStore.getState().checkAuth();

        const state = useAuthStore.getState();
        expect(state.user).toEqual(mockUser);
        expect(state.isAuthenticated).toBe(true);
        expect(state.isAdmin).toBe(false);
        expect(state.isLoading).toBe(false);

        expect(globalThis.fetch).toHaveBeenCalledWith('/api/auth/me');
    });

    it('should handle successful checkAuth for ADMIN', async () => {
        const mockAdmin: User = {
            id: 'admin-uuid',
            name: 'Admin User',
            email: null,
            avatarUrl: null,
            role: 'ADMIN',
            blocked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => mockAdmin,
        });

        await useAuthStore.getState().checkAuth();

        const state = useAuthStore.getState();
        expect(state.isAdmin).toBe(true);
    });

    it('should handle failed checkAuth (401 Unauthorized)', async () => {
        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            status: 401,
        });

        await useAuthStore.getState().checkAuth();

        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.isAdmin).toBe(false);
        expect(state.isLoading).toBe(false);
    });

    it('should clear state on logout', async () => {
        useAuthStore.setState({
            user: { id: '123', name: 'Test', role: 'USER' } as User,
            isAuthenticated: true,
            isLoading: false,
        });

        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
        });

        await useAuthStore.getState().logout();

        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(globalThis.fetch).toHaveBeenCalledWith('/api/auth/logout', {
            method: 'POST',
        });
    });
});
