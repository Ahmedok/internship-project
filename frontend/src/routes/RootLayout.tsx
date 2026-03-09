import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { Header } from '@/components/Header';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useTranslation } from 'react-i18next';

export default function RootLayout() {
    const { user, checkAuth } = useAuthStore();
    const { setTheme } = useThemeStore();
    const { i18n } = useTranslation();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (user) {
            if (
                user.preferedLanguage &&
                user.preferedLanguage !== i18n.language
            ) {
                i18n.changeLanguage(user.preferedLanguage);
            }
            if (user.preferedTheme) {
                setTheme(user.preferedTheme);
            }
        } else {
            setTheme('system');
            i18n.changeLanguage('en');
        }
    }, [user, setTheme, i18n]);

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            <Header />

            <main className="flex-1 container mx-auto p-4">
                <Outlet />
            </main>
        </div>
    );
}
