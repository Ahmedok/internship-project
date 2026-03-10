import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-9xl font-bold mb-4 text-zinc-200 dark:text-zinc-800">
                404
            </h1>
            <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
            <p className="text-zinc-500 mb-8 max-w-md">
                Possibly, item or inventory you were looking for was deleted.
            </p>
            <Button asChild size="lg">
                <Link to="/">Go Back to Main</Link>
            </Button>
        </div>
    );
}
