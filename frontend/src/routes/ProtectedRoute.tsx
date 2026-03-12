import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import UnauthorizedPage from './UnauthorizedPage';

interface ProtectedRouteProps {
    requiredAdmin?: boolean;
}

export default function ProtectedRoute({
    requiredAdmin = false,
}: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuthStore();

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center">
                <div className="animate-pulse text-lg font-medium text-zinc-500">
                    Checking session...
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredAdmin && user?.role !== 'ADMIN') {
        return <UnauthorizedPage />;
    }

    return <Outlet />;
}
