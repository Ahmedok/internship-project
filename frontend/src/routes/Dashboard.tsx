// Temp Dashboard (TODO: Replace with actual dashboard)
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
    const { user, logout } = useAuthStore();

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                    My Inventories
                </h1>
                <Button variant="destructive" onClick={logout}>
                    Exit
                </Button>
            </div>
            <div className="p-6 border rounded-lg bg-white dark:bg-zinc-900 shadow-sm">
                <p className="text-lg">
                    Welcome, <strong>{user?.name}</strong>!
                </p>
                <p className="text-zinc-500 mt-2">Role: {user?.role}</p>
            </div>
        </div>
    );
}
