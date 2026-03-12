import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
    const { t } = useTranslation('common');

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-9xl font-bold mb-4 text-zinc-200 dark:text-zinc-800">
                {t('not_found.code')}
            </h1>
            <h2 className="text-2xl font-semibold mb-2">
                {t('not_found.title')}
            </h2>
            <p className="text-zinc-500 mb-8 max-w-md">
                {t('not_found.message')}
            </p>
            <Button asChild size="lg">
                <Link to="/">{t('common.go_back_to_main')}</Link>
            </Button>
        </div>
    );
}
