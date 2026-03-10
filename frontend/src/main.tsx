import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ThemeProvider } from './components/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import './i18n';

import RootLayout from './routes/RootLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './routes/LoginPage';
import HomePage from './routes/HomePage';
import AdminPage from './routes/AdminPage';
import PersonalPage from './routes/PersonalPage';
import CreateInventoryPage from './routes/CreateInventoryPage';
import InventoryManagePage from './routes/InventoryManagePage';
import SearchResultsPage from './routes/SearchResultsPage';
import ItemDetailPage from './routes/ItemDetailPage';

const queryClient = new QueryClient();

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
                element: <ItemDetailPage />,
            },
            {
                path: '/inventories/:id',
                element: <InventoryManagePage />,
            },
            {
                element: <ProtectedRoute />,
                children: [
                    {
                        path: '/admin',
                        element: <AdminPage />,
                    },
                    {
                        path: '/personal',
                        element: <PersonalPage />,
                    },
                    {
                        path: '/inventories/new',
                        element: <CreateInventoryPage />,
                    },
                    // TODO: Add other routes
                ],
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
