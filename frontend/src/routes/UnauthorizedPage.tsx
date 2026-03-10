import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
            <ShieldAlert className="mb-6 h-16 w-16 text-amber-500" />
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-zinc-500 mb-8 max-w-md">
                You do not have permission to access this page.
            </p>
            <Button asChild size="lg">
                <Link to="/">Go Back to Main</Link>
            </Button>
        </div>
    );
}
