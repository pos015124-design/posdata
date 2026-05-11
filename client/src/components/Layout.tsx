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
  Download
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useInstallPrompt } from './InstallPWA';
import Logo from './Logo';

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
        { icon: Settings, label: 'Settings', path: '/settings' },
      ]
    : [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: ShoppingCart, label: 'POS', path: '/pos' },
        { icon: Package, label: 'Inventory', path: '/inventory' },
        { icon: Users, label: 'Customers', path: '/customers' },
        { icon: FileText, label: 'Orders', path: '/orders' },
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 md:w-72 bg-gradient-to-b from-blue-900 to-purple-900 text-white fixed h-screen shadow-xl z-40 transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header — padded top on mobile so X button doesn't overlap logo */}
        <div className="pt-14 lg:pt-0 px-4 pb-2 md:p-6 shrink-0">
          <Logo variant="white" className="h-10" />
          <p className="text-xs md:text-sm text-gray-300 mt-2 truncate">{user?.email}</p>
        </div>

        {/* Nav — scrolls internally if items overflow, never expands sidebar */}
        <nav className="flex-1 overflow-y-auto mt-2 px-2 md:px-3 space-y-1 md:space-y-2 pb-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-all text-sm md:text-base ${
                  isActive
                    ? 'bg-white/20 shadow-lg'
                    : 'hover:bg-white/10'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer — always pinned to bottom */}
        <div className="shrink-0 p-3 md:p-4 space-y-2 border-t border-white/10">
          {/* Install app button — only shown when browser install prompt is available */}
          {canInstall && (
            <button
              onClick={triggerInstall}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="truncate">Install App</span>
            </button>
          )}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30 text-sm md:text-base"
          >
            <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-0 lg:ml-72">
        {/*
          Mobile: pt-3 (small top gap) + pl-14 clears the hamburger (left-3 + p-2 + icon ≈ 53px)
          Desktop (lg+): normal padding, no hamburger to worry about
        */}
        <div className="pt-3 pl-14 pr-4 pb-8 lg:pt-6 lg:pl-8 lg:pr-8 md:pr-6">
          {children}
        </div>
      </main>
    </div>
  );
}
