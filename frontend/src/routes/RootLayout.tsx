import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { Header } from '@/components/Header';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
    const { checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            <Header />

            <main className="flex-1 container mx-auto p-4">
                <Outlet />
            </main>
        </div>
    );
}
