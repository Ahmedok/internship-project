import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function LanguageSelector() {
    const { i18n } = useTranslation();

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        // TODO: Send PATCH request to backend to save user preference
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 px-0">
                    {i18n.resolvedLanguage === 'ru' ? 'RU' : 'EN'}
                    <span className="sr-only">Переключить язык</span>
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
