import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Sellers from './pages/Sellers';
import Orders from './pages/Orders';
import Expenses from './pages/Expenses';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import BusinessManagement from './pages/BusinessManagement';
import Store from './pages/Store';
import IndividualStore from './pages/IndividualStore';
import StoreDirectory from './pages/StoreDirectory';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import LandingPage from './pages/LandingPage';
import WaitingApproval from './pages/WaitingApproval';
import SellerBilling from './pages/SellerBilling';
import { Toaster } from './components/ui/toaster';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" />;
  // Show waiting screen if not yet approved
  if (user.isApproved === false && user.role !== 'super_admin') {
    return <WaitingApproval onLogout={logout} />;
  }
  return <Layout>{children}</Layout>;
}

/** Public storefront pages: show sidebar for logged-in users */
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
          <Routes>
            {/* Default: marketplace is the first thing visitors see */}
            <Route path="/" element={<Store />} />
            <Route path="/about" element={<LandingPage />} />

            {/* Auth */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            {/* E-commerce Storefront (public) */}
            <Route path="/store" element={<StorefrontWithOptionalLayout><Store /></StorefrontWithOptionalLayout>} />
            <Route path="/stores" element={<StorefrontWithOptionalLayout><StoreDirectory /></StorefrontWithOptionalLayout>} />
            <Route path="/store/:slug" element={<StorefrontWithOptionalLayout><IndividualStore /></StorefrontWithOptionalLayout>} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />

            {/* Private Routes */}
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/pos" element={<PrivateRoute><POS /></PrivateRoute>} />
            <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
            <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
            <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
            <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
            <Route path="/sellers" element={<PrivateRoute><Sellers /></PrivateRoute>} />
            <Route path="/super-admin" element={<PrivateRoute><SuperAdminDashboard /></PrivateRoute>} />
            <Route path="/business-management" element={<PrivateRoute><BusinessManagement /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/billing" element={<PrivateRoute><SellerBilling /></PrivateRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
