import { useEffect } from 'react';
import { Outlet, Link } from 'react-router';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
    const { checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-zinc-950/95 backdrop-blur supports-backdrop-filter:bg-white/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <Link to="/" className="text-xl font-bold shrink-0">
                        Logo {/* TODO: Replace with actual logo */}
                    </Link>

                    <div className="flex-1 flex justify-center">
                        <GlobalSearchBar />
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        {/* TODO: Dropdown settings, profile buttons here */}
                    </div>
                </div>
            </header>
            <main className="flex-1 container mx-auto p-4">
                <Outlet />
            </main>
        </div>
    );
}
