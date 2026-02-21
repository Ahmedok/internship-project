import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';

function App() {
    const { checkAuth, isLoading, isAuthenticated, user } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                Loading session...
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">
                Inventory Management System
            </h1>

            {isAuthenticated ? (
                <div className="p-4 border rounded bg-zinc-50 dark:bg-zinc-900">
                    <p>
                        Welcome, <strong>{user?.name}</strong>!
                    </p>
                    <p>Your role: {user?.role}</p>
                </div>
            ) : (
                <div className="p-4 border rounded border-red-200 bg-red-50 text-red-800">
                    <p>
                        You are not authenticated. Please, log in to the system.
                    </p>
                </div>
            )}
        </div>
    );
}

export default App;
