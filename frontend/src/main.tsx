import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import './index.css';

import RootLayout from './routes/RootLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './routes/LoginPage';
import Dashboard from './routes/Dashboard';

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
                    // TODO: Add other routes here
                ],
            },
        ],
    },
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
);
