import { create } from 'zustand';

interface User {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    role: 'USER' | 'ADMIN';
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isLoading: boolean;
    checkAuth: () => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    isLoading: true,

    checkAuth: async () => {
        try {
            const response = await fetch('/api/auth/me');
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
            await fetch('/api/auth/logout', { method: 'POST' });
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
}));
