import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/stores/authStore';

export default function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="animate-pulse text-lg font-medium text-zinc-500">
                    Checking session...
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
