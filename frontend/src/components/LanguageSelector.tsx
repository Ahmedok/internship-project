import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { syncUserPreferences } from '@/api/preferences';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function LanguageSelector() {
    const { i18n } = useTranslation();
    const { user, setUserPreference } = useAuthStore();

    const handleLanguageChange = (lang: 'en' | 'ru') => {
        i18n.changeLanguage(lang);
        if (user) {
            syncUserPreferences({ preferedLanguage: lang })
                .then(() => setUserPreference({ preferedLanguage: lang }))
                .catch((err) => {
                    console.error('Failed to sync language preference:', err);
                });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 px-0">
                    {i18n.resolvedLanguage === 'ru' ? 'RU' : 'EN'}
                    <span className="sr-only">Toggle Language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => handleLanguageChange('en')}
                    className={
                        i18n.resolvedLanguage === 'en' ? 'font-bold' : ''
                    }
                >
                    English
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleLanguageChange('ru')}
                    className={
                        i18n.resolvedLanguage === 'ru' ? 'font-bold' : ''
                    }
                >
                    Русский
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
