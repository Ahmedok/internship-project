import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ThemeProvider } from './components/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import './i18n';

import RootLayout from './routes/RootLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import NotFoundPage from './routes/NotFoundPage';
import LoginPage from './routes/LoginPage';
import HomePage from './routes/HomePage';
import SearchResultsPage from './routes/SearchResultsPage';

const AdminPage = lazy(() => import('./routes/AdminPage'));
const PersonalPage = lazy(() => import('./routes/PersonalPage'));
const CreateInventoryPage = lazy(() => import('./routes/CreateInventoryPage'));
const InventoryManagePage = lazy(() => import('./routes/InventoryManagePage'));
const ItemDetailPage = lazy(() => import('./routes/ItemDetailPage'));

const queryClient = new QueryClient();

const PageLoader = () => (
    <div className="h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
);

const lazily = (element: React.ReactNode) => (
    <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            {
                path: '/login',
                element: <LoginPage />,
            },
            {
                path: '/',
                element: <HomePage />,
            },
            {
                path: '/search',
                element: <SearchResultsPage />,
            },
            {
                path: '/items/:id',
                element: lazily(<ItemDetailPage />),
            },
            {
                path: '/inventories/:id',
                element: lazily(<InventoryManagePage />),
            },
            {
                element: <ProtectedRoute />,
                children: [
                    {
                        path: '/personal',
                        element: lazily(<PersonalPage />),
                    },
                    {
                        path: '/inventories/new',
                        element: lazily(<CreateInventoryPage />),
                    },
                ],
            },
            {
                element: <ProtectedRoute requiredAdmin={true} />,
                children: [
                    {
                        path: '/admin',
                        element: lazily(<AdminPage />),
                    },
                ],
            },
            {
                path: '*',
                element: <NotFoundPage />,
            },
        ],
    },
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <ErrorBoundary>
                    <RouterProvider router={router} />
                </ErrorBoundary>
            </ThemeProvider>
        </QueryClientProvider>
    </StrictMode>,
);
