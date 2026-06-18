import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

import LoginPage from './pages/Login/LoginPage';
import AppLayout from './components/Layout/AppLayout';
import DashboardPage from './pages/Dashboard/DashboardPage';
import BooksPage from './pages/Books/BooksPage';
import InventoryPage from './pages/Inventory/InventoryPage';
import POSPage from './pages/POS/POSPage';
import CustomersPage from './pages/Customers/CustomersPage';
import SalesPage from './pages/Sales/SalesPage';
import SettingsPage from './pages/Settings/SettingsPage';

// Route guard
function PrivateRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/cashier-dashboard" replace />;
  return children;
}

// Page titles map
const pageTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview & Analytics' },
  '/books': { title: 'Books', subtitle: 'Catalog Management' },
  '/inventory': { title: 'Inventory', subtitle: 'Stock Management' },
  '/pos': { title: 'POS Billing', subtitle: 'Point of Sale' },
  '/customers': { title: 'Customers', subtitle: 'Customer Management' },
  '/sales': { title: 'Sales Reports', subtitle: 'Revenue & Analytics' },
  '/settings': { title: 'Settings', subtitle: 'Account & Configuration' },
};

function LayoutWithTitle() {
  return <AppLayout />;
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: 'var(--color-success)', secondary: 'white' } },
          error: { iconTheme: { primary: 'var(--color-danger)', secondary: 'white' } },
        }}
      />

      <Routes>
        {/* Public */}
        <Route path="/login" element={
          isAuthenticated
            ? <Navigate to={user?.role === 'cashier' ? '/cashier-dashboard' : '/admin-dashboard'} replace />
            : <LoginPage />
        } />

        {/* Protected */}
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/admin-dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin-dashboard" element={<DashboardPage />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/cashier-dashboard" element={<POSPage />} />
          <Route path="/customers" element={<CustomersPage />} />

          {/* Admin only */}
          <Route path="/books" element={
            <PrivateRoute adminOnly>
              <BooksPage />
            </PrivateRoute>
          } />
          <Route path="/inventory" element={
            <PrivateRoute adminOnly>
              <InventoryPage />
            </PrivateRoute>
          } />
          <Route path="/sales" element={
            <PrivateRoute adminOnly>
              <SalesPage />
            </PrivateRoute>
          } />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
