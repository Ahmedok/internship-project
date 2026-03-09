import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

export function useSessionHydration() {
    const user = useAuthStore((s) => s.user);
    const setTheme = useThemeStore((s) => s.setTheme);
    const { i18n } = useTranslation();

    useEffect(() => {
        if (!user) {
            setTheme('system');
            void i18n.changeLanguage('en');
            return;
        }
        if (user.preferedTheme) {
            setTheme(user.preferedTheme);
        }
        if (user.preferedLanguage && user.preferedLanguage !== i18n.language) {
            void i18n.changeLanguage(user.preferedLanguage);
        }
    }, [user?.id, user?.preferedTheme, user?.preferedLanguage]);
}
