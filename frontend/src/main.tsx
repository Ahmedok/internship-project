import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

import RootLayout from './routes/RootLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './routes/LoginPage';
import Dashboard from './routes/Dashboard';
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
                element: <ProtectedRoute />,
                children: [
                    {
                        path: '/',
                        element: <Dashboard />,
                    },
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
                    {
                        path: '/inventories/:id/manage',
                        element: <InventoryManagePage />,
                    },
                    {
                        path: '/search',
                        element: <SearchResultsPage />,
                    },
                    {
                        path: '/items/:id',
                        element: <ItemDetailPage />,
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
            <RouterProvider router={router} />
        </QueryClientProvider>
    </StrictMode>,
);
