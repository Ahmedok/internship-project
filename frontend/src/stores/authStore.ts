import { create } from 'zustand';
import type { User } from '@inventory/shared';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isLoading: boolean;
    checkAuth: () => Promise<void>;
    logout: () => Promise<void>;
    setUserPreference: (
        prefs: Partial<Pick<User, 'preferedLanguage' | 'preferedTheme'>>,
    ) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    isLoading: true,

    checkAuth: async () => {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include',
            });
            if (response.ok) {
                const user: User = await response.json();
                set({
                    user,
                    isAuthenticated: true,
                    isAdmin: user.role === 'ADMIN',
                    isLoading: false,
                });
            } else {
                set({
                    user: null,
                    isAuthenticated: false,
                    isAdmin: false,
                    isLoading: false,
                });
            }
        } catch (error) {
            console.error('Failed to fetch user session:', error);
            set({
                user: null,
                isAuthenticated: false,
                isAdmin: false,
                isLoading: false,
            });
        }
    },

    logout: async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
            set({
                user: null,
                isAuthenticated: false,
                isAdmin: false,
                isLoading: false,
            });
        } catch (error) {
            console.error('Logout failed:', error);
        }
    },

    setUserPreference: (prefs) =>
        set((state) => ({
            user: state.user ? { ...state.user, ...prefs } : null,
        })),
}));
