import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  Settings, 
  Store,
  LogOut,
  Menu,
  X,
  DollarSign,
  BarChart3,
  ShoppingBag,
  Building2,
  Download,
  Truck
} from 'lucide-react';
import { useInstallPrompt } from './InstallPWA';
import Logo from './Logo';
import NotificationsBell from './NotificationsBell';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { available: canInstall, trigger: triggerInstall } = useInstallPrompt();

  const isSuperAdmin = user?.role === 'super_admin';
  const menuItems = isSuperAdmin
    ? [
        { icon: LayoutDashboard, label: 'Super Admin', path: '/super-admin' },
        { icon: Store, label: 'Businesses', path: '/business-management' },
        { icon: ShoppingBag, label: 'Marketplace', path: '/store' },
        { icon: Building2, label: 'All stores', path: '/stores' },
        { icon: Truck, label: 'Delivery', path: '/delivery' },
        { icon: Settings, label: 'Settings', path: '/settings' },
      ]
    : [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: ShoppingCart, label: 'POS', path: '/pos' },
        { icon: Package, label: 'Inventory', path: '/inventory' },
        { icon: Users, label: 'Customers', path: '/customers' },
        { icon: FileText, label: 'Fulfillment', path: '/orders' },
        { icon: DollarSign, label: 'Expenses', path: '/expenses' },
        { icon: BarChart3, label: 'Reports', path: '/reports' },
        { icon: Store, label: 'Suppliers', path: '/sellers' },
        { icon: Settings, label: 'Settings', path: '/settings' },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sidebar Overlay for Mobile — with backdrop blur for depth */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed, slides in from left on mobile, always visible on desktop */}
      <aside className={`w-64 bg-[#0f172a] text-white fixed top-0 left-0 shadow-xl z-40 transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
        style={{ height: '100dvh' }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <Logo variant="white" className="h-9" />
            {/* Close button — mobile only */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-300 mt-1.5 truncate">{user?.email}</p>
        </div>

        {/* Nav — scrolls internally, never pushes footer off screen */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  isActive
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
              </button>
            );
          })}
        </nav>

        {/* Footer — always visible, never scrolled away */}
        <div className="shrink-0 px-2 pb-4 pt-2 space-y-1 border-t border-white/10">
          <div className="flex items-center justify-between px-1">
            <NotificationsBell placement="sidebar" />
            <span className="text-[11px] text-white/40 truncate">Notifications</span>
          </div>
          {canInstall && (
            <button
              onClick={triggerInstall}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-sm font-medium transition-all"
            >
              <Download className="w-[18px] h-[18px] shrink-0" />
              <span className="truncate">Install App</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-red-500/30 text-white/80 hover:text-white text-sm font-medium transition-all"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span className="truncate">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content — full width on mobile, offset by sidebar on desktop */}
      <main className="block w-full lg:pl-64">
        {/* Mobile top bar — FIXED so it's always visible regardless of scroll position */}
        <div className="lg:hidden fixed top-0 left-0 right-0 flex items-center h-14 px-4 bg-white border-b border-gray-100 z-20 shadow-sm gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 bg-blue-600 text-white rounded-xl shadow-sm shrink-0"
            aria-label="Toggle menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <span className="text-base font-semibold text-gray-900 truncate flex-1">
            {menuItems.find(m => m.path === location.pathname)?.label ?? 'E-Shop'}
          </span>
          {/* Notifications bell — opens the system notifications dropdown */}
          <NotificationsBell />
        </div>

        {/* Page content — pt-16 on mobile clears the fixed h-14 top bar with a small gap */}
        <div className="px-4 pt-16 pb-8 lg:pt-6 lg:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
