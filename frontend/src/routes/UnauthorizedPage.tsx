import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
    const { t } = useTranslation('common');

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
            <ShieldAlert className="mb-6 h-16 w-16 text-amber-500" />
            <h2 className="text-2xl font-semibold mb-2">
                {t('unauthorized.title')}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md">
                {t('unauthorized.message')}
            </p>
            <Button asChild size="lg">
                <Link to="/">{t('common.go_back_to_main')}</Link>
            </Button>
        </div>
    );
}
