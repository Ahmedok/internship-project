import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { GlobalSearchBar } from './GlobalSearchBar';

import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from './ui/dropdown-menu';

export function Header() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-zinc-950/95 backdrop-blur supports-backdrop-filter:bg-white/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                {/* Logo */}
                <Link to="/" className="text-xl font-bold shrink-0">
                    InventoryApp {/* TODO: Replace with actual logo */}
                </Link>

                {/* Search Bar */}
                <div className="flex-1 flex justify-center">
                    <GlobalSearchBar />
                </div>

                {/* User Menu */}
                <div className="flex items-center gap-4 shrink-0">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="relative h-8 w-8 rounded-full"
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage
                                            src={user.avatarUrl || undefined}
                                            alt={user.name}
                                        />
                                        <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                            {user.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56"
                                align="end"
                                forceMount
                            >
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {user.name}
                                        </p>
                                        <p className="text-xs leading-none text-zinc-500 font-mono">
                                            {user.role}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem asChild>
                                    <Link
                                        to="/personal"
                                        className="cursor-pointer w-full"
                                    >
                                        Personal Profile
                                    </Link>
                                </DropdownMenuItem>

                                {user.role === 'ADMIN' && (
                                    <DropdownMenuItem asChild>
                                        <Link
                                            to="/admin"
                                            className="cursor-pointer w-full text-red-600 dark:text-red-400"
                                        >
                                            Admin Panel
                                        </Link>
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="cursor-pointer text-zinc-500"
                                >
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button size="sm" onClick={() => navigate('/login')}>
                            Login
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
