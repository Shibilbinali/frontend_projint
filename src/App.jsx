import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Eagerly load layout and login (needed immediately)
import LoginPage from './pages/Login/LoginPage';
import AppLayout from './components/Layout/AppLayout';

// Lazy load all page components for better initial load performance
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const BooksPage = lazy(() => import('./pages/Books/BooksPage'));
const InventoryPage = lazy(() => import('./pages/Inventory/InventoryPage'));
const POSPage = lazy(() => import('./pages/POS/POSPage'));
const CustomersPage = lazy(() => import('./pages/Customers/CustomersPage'));
const SalesPage = lazy(() => import('./pages/Sales/SalesPage'));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'));


// Minimal loading fallback that matches the app's visual style
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '300px',
      flexDirection: 'column',
      gap: '16px',
      color: 'var(--color-text-muted)',
      fontSize: '0.875rem',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '2px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      Loading...
    </div>
  );
}

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
          <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
          <Route path="/admin-dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
          <Route path="/pos" element={<Suspense fallback={<PageLoader />}><POSPage /></Suspense>} />
          <Route path="/cashier-dashboard" element={<Suspense fallback={<PageLoader />}><POSPage /></Suspense>} />
          <Route path="/customers" element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />

          {/* Admin only */}
          <Route path="/books" element={
            <PrivateRoute adminOnly>
              <Suspense fallback={<PageLoader />}><BooksPage /></Suspense>
            </PrivateRoute>
          } />
          <Route path="/inventory" element={
            <PrivateRoute adminOnly>
              <Suspense fallback={<PageLoader />}><InventoryPage /></Suspense>
            </PrivateRoute>
          } />
          <Route path="/sales" element={
            <PrivateRoute adminOnly>
              <Suspense fallback={<PageLoader />}><SalesPage /></Suspense>
            </PrivateRoute>
          } />
          <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />


        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
