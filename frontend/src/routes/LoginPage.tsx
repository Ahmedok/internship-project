import { Navigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export default function LoginPage() {
    const { t } = useTranslation('common');
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) return null;
    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleGoogleLogin = () => {
        window.location.href = '/api/auth/google';
    };

    const handleFacebookLogin = () => {
        window.location.href = '/api/auth/facebook';
    };

    return (
        <div className="flex items-center justify-center p-6 space-y-6 min-h-[70vh]">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">
                        {t('login_page.title')}
                    </CardTitle>
                    <CardDescription>
                        {t('login_page.subtitle')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button
                        variant="outline"
                        onClick={handleGoogleLogin}
                        className="w-full"
                    >
                        {t('login_page.google')}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleFacebookLogin}
                        className="w-full"
                    >
                        {t('login_page.facebook')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
