import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
    const { checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
            <Outlet />
        </main>
    );
}
