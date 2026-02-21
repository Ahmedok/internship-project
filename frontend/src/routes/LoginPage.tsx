import { Navigate } from 'react-router';
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
        <div className="flex h-screen items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">System Login</CardTitle>
                    <CardDescription>Choose your login method</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button
                        variant="outline"
                        onClick={handleGoogleLogin}
                        className="w-full"
                    >
                        Continue with Google
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleFacebookLogin}
                        className="w-full"
                    >
                        Continue with Facebook
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
