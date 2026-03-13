import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { GlobalSearchBar } from './GlobalSearchBar';

import { Menu } from 'lucide-react';
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
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
    SheetHeader,
    SheetClose,
} from './ui/sheet';

export function Header() {
    const { t } = useTranslation('common');
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                            >
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Open Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-75 sm:w-87.5">
                            <SheetHeader className="pb-4 border-b">
                                <SheetTitle className="text-left text-xl">
                                    {t('header.app_name')}
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col gap-6 mt-4 flex-1 overflow-y-auto">
                                <div className="w-full px-1">
                                    <GlobalSearchBar
                                        translatedPlaceholder={t(
                                            'header.search_placeholder',
                                        )}
                                    />
                                </div>
                                <nav className="flex flex-col gap-1.5">
                                    <SheetClose asChild>
                                        <Link
                                            to="/"
                                            className="flex items-center px-3 py-2.5 text-base font-medium rounded-md text-foreground transition-colors"
                                        >
                                            {t('header.home')}
                                        </Link>
                                    </SheetClose>
                                    {user && (
                                        <SheetClose asChild>
                                            <Link
                                                to="/personal"
                                                className="flex items-center px-3 py-2.5 text-base font-medium rounded-md text-foreground transition-colors"
                                            >
                                                {t('header.profile')}
                                            </Link>
                                        </SheetClose>
                                    )}
                                    {user?.role === 'ADMIN' && (
                                        <SheetClose asChild>
                                            <Link
                                                to="/admin"
                                                className="flex items-center px-3 py-2.5 text-base font-medium rounded-md text-red-600 dark:text-red-400 transition-colors"
                                            >
                                                {t('admin_panel.title')}
                                            </Link>
                                        </SheetClose>
                                    )}
                                </nav>
                            </div>
                        </SheetContent>
                    </Sheet>
                    {/* Logo */}
                    <Link to="/" className="text-xl font-bold shrink-0">
                        {t('header.app_name')}{' '}
                        {/* TODO: Replace with actual logo */}
                    </Link>
                </div>

                {/* Search Bar */}
                <div className="flex-1 hidden md:flex justify-center max-w-xl px-4">
                    <GlobalSearchBar
                        translatedPlaceholder={t('header.search_placeholder')}
                    />
                </div>

                {/* User Menu */}
                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                    <div className="hidden sm:flex items-center gap-2">
                        <ThemeToggle />
                        <LanguageSelector />
                    </div>

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
                                        <p className="text-xs leading-none text-muted-foreground font-mono">
                                            {user.role}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <div className="sm:hidden flex items-center justify-between px-2 py-1.5">
                                    <span className="text-sm">
                                        {t('header.preferences')}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <ThemeToggle />
                                        <LanguageSelector />
                                    </div>
                                </div>
                                <DropdownMenuSeparator className="sm:hidden" />

                                <DropdownMenuItem asChild>
                                    <Link
                                        to="/personal"
                                        className="cursor-pointer w-full"
                                    >
                                        {t('header.profile')}
                                    </Link>
                                </DropdownMenuItem>

                                {user.role === 'ADMIN' && (
                                    <DropdownMenuItem asChild>
                                        <Link
                                            to="/admin"
                                            className="cursor-pointer w-full text-red-600 dark:text-red-400"
                                        >
                                            {t('admin_panel.title')}
                                        </Link>
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="cursor-pointer text-muted-foreground"
                                >
                                    {t('header.logout')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button size="sm" onClick={() => navigate('/login')}>
                            {t('header.login')}
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
