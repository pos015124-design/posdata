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
  Building2
} from 'lucide-react';
import { Button } from '../components/ui/button';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        { icon: Store, label: 'Sellers', path: '/sellers' },
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 md:p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
      >
        {sidebarOpen ? <X className="w-5 h-5 md:w-6 md:h-6" /> : <Menu className="w-5 h-5 md:w-6 md:h-6" />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 md:w-72 bg-gradient-to-b from-blue-900 to-purple-900 text-white fixed h-full shadow-xl z-40 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 md:p-6">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            E-Shop
          </h1>
          <p className="text-xs md:text-sm text-gray-300 mt-1 truncate">{user?.email}</p>
        </div>

        <nav className="mt-4 md:mt-6 px-2 md:px-3 space-y-1 md:space-y-2">
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

        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
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
        <div className="px-4 py-6 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
