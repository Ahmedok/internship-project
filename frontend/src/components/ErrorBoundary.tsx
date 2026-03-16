import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
                    <TriangleAlert className="size-16 text-red-500 mb-6" />
                    <h1 className="text-3xl font-bold mb-2">
                        Something went wrong.
                    </h1>
                    <p className="text-muted-foreground max-w-md mb-6">
                        Unexpected error occured in the app interface. Please
                        try refreshing the page or contact support if the
                        problem persists.
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={() => window.location.reload()}>
                            Refresh Page
                        </Button>
                        <Button variant="outline" asChild>
                            <Link
                                to="/"
                                onClick={() =>
                                    this.setState({
                                        hasError: false,
                                        error: null,
                                    })
                                }
                            >
                                Go to Main
                            </Link>
                        </Button>
                    </div>
                    {import.meta.env.DEV && this.state.error && (
                        <pre className="mt-8 p-4 bg-muted rounded-md text-left text-xs text-red-600 dark:text-red-400 overflow-auto max-w-2xl w-full">
                            {this.state.error.message}
                        </pre>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
