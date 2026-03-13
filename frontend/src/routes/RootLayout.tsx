import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { Header } from '@/components/Header';
import { useAuthStore } from '@/stores/authStore';
import { useSessionHydration } from '@/hooks/useSessionHydration';
import { Toaster } from '@/components/ui/sonner';

export default function RootLayout() {
    const { checkAuth } = useAuthStore();
    useSessionHydration();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <div className="flex flex-col min-h-dvh bg-background text-foreground">
            <Header />

            <main className="flex-1 container mx-auto p-4">
                <Outlet />
            </main>
            <Toaster richColors position="bottom-right" />
        </div>
    );
}
