import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import { Toaster } from './components/ui/toaster';

// ── Eagerly loaded — needed on first paint for every user ──────────────────
// These are small and always needed, so no benefit to lazy-loading them.
import Login from './pages/Login';
import Register from './pages/Register';
import WaitingApproval from './pages/WaitingApproval';
import Store from './pages/Store';
import InstallPWA from './components/InstallPWA';

// ── Lazy loaded — only downloaded when the user navigates to that route ────
// Each becomes its own JS chunk. Buyers never download seller/admin code.
// Sellers never download super-admin code.
const Dashboard         = lazy(() => import('./pages/Dashboard'));
const POS               = lazy(() => import('./pages/POS'));
const Inventory         = lazy(() => import('./pages/Inventory'));
const Customers         = lazy(() => import('./pages/Customers'));
const Reports           = lazy(() => import('./pages/Reports'));
const Settings          = lazy(() => import('./pages/Settings'));
const Sellers           = lazy(() => import('./pages/Sellers'));
const Orders            = lazy(() => import('./pages/Orders'));
const Expenses          = lazy(() => import('./pages/Expenses'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const BusinessManagement  = lazy(() => import('./pages/BusinessManagement'));
const StoreDirectory    = lazy(() => import('./pages/StoreDirectory'));
const IndividualStore   = lazy(() => import('./pages/IndividualStore'));
const Cart              = lazy(() => import('./pages/Cart'));
const Checkout          = lazy(() => import('./pages/Checkout'));
const LandingPage       = lazy(() => import('./pages/LandingPage'));
const SellerBilling     = lazy(() => import('./pages/SellerBilling'));
const DeliveryManagement = lazy(() => import('./pages/DeliveryManagement'));

// ── Page loading fallback ──────────────────────────────────────────────────
// Minimal skeleton — shows instantly while the chunk downloads.
// Matches the app background so there's no flash.
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.isApproved === false && user.role !== 'super_admin') {
    return <WaitingApproval onLogout={logout} />;
  }
  return <Layout>{children}</Layout>;
}

function StorefrontWithOptionalLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user) return <Layout>{children}</Layout>;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" /> : <>{children}</>;
}

function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          {/* Suspense wraps all routes — lazy chunks show PageLoader while downloading */}
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Default: marketplace */}
              <Route path="/" element={<Store />} />
              <Route path="/about" element={<LandingPage />} />

              {/* Auth */}
              <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

              {/* Public storefront */}
              <Route path="/store"        element={<StorefrontWithOptionalLayout><Store /></StorefrontWithOptionalLayout>} />
              <Route path="/stores"       element={<StorefrontWithOptionalLayout><StoreDirectory /></StorefrontWithOptionalLayout>} />
              <Route path="/store/:slug"  element={<StorefrontWithOptionalLayout><IndividualStore /></StorefrontWithOptionalLayout>} />
              <Route path="/cart"         element={<Cart />} />
              <Route path="/checkout"     element={<Checkout />} />

              {/* Private — seller */}
              <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/pos"        element={<PrivateRoute><POS /></PrivateRoute>} />
              <Route path="/inventory"  element={<PrivateRoute><Inventory /></PrivateRoute>} />
              <Route path="/customers"  element={<PrivateRoute><Customers /></PrivateRoute>} />
              <Route path="/orders"     element={<PrivateRoute><Orders /></PrivateRoute>} />
              <Route path="/expenses"   element={<PrivateRoute><Expenses /></PrivateRoute>} />
              <Route path="/reports"    element={<PrivateRoute><Reports /></PrivateRoute>} />
              <Route path="/sellers"    element={<PrivateRoute><Sellers /></PrivateRoute>} />
              <Route path="/settings"   element={<PrivateRoute><Settings /></PrivateRoute>} />
              <Route path="/billing"    element={<PrivateRoute><SellerBilling /></PrivateRoute>} />

              {/* Private — super admin */}
              <Route path="/super-admin"          element={<PrivateRoute><SuperAdminDashboard /></PrivateRoute>} />
              <Route path="/business-management"  element={<PrivateRoute><BusinessManagement /></PrivateRoute>} />
              <Route path="/delivery"             element={<PrivateRoute><DeliveryManagement /></PrivateRoute>} />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
          <Toaster />
          <InstallPWA />
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
