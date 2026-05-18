import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Package, 
  DollarSign,
  Store,
  ExternalLink,
  Copy,
  Share2,
  Bell,
  BellOff
} from 'lucide-react';
import * as salesApi from '../api/sales';
import * as customersApi from '../api/customers';
import * as productsApi from '../api/products';
import * as businessApi from '../api/business';
import { useToast } from '../hooks/useToast';
import { useSmartPolling } from '../hooks/useSmartPolling';

/** Play a short notification beep using Web Audio API — no external files needed */
function playOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* audio not available */ }
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    recentOrders: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const prevOrderCount = useRef<number | null>(null);

  const storeUrl = businessSlug
    ? `${window.location.origin}/store/${businessSlug}`
    : user?.email
      ? `${window.location.origin}/store/${user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      : null;

  useEffect(() => {
    if (user?.role === 'super_admin') {
      navigate('/super-admin', { replace: true });
    }
  }, [user?.role, navigate]);

  const fetchDashboardStats = useCallback(async (silent = false): Promise<boolean> => {
    try {
      if (!silent) setLoading(true);
      const [salesRes, customersRes, productsRes] = await Promise.all([
        salesApi.getAllSales(),
        customersApi.getCustomers(),
        productsApi.getProducts()
      ]);

      const salesArray = Array.isArray(salesRes?.sales) ? salesRes.sales
        : Array.isArray(salesRes?.data) ? salesRes.data : [];
      const productsArray = Array.isArray(productsRes?.products) ? productsRes.products
        : Array.isArray(productsRes?.data) ? productsRes.data : [];
      const customersArray = Array.isArray(customersRes?.customers) ? customersRes.customers
        : Array.isArray(customersRes?.data) ? customersRes.data : [];

      const newOrderCount = salesArray.length;
      const hasNewData = prevOrderCount.current !== null && newOrderCount !== prevOrderCount.current;

      // 🔔 New order notification
      if (prevOrderCount.current !== null && newOrderCount > prevOrderCount.current && notificationsEnabled) {
        const diff = newOrderCount - prevOrderCount.current;
        if (playOrderSound) playOrderSound();
        toast({
          title: `🛒 ${diff} new order${diff > 1 ? 's' : ''}!`,
          description: 'A customer just placed an order in your store.',
        });
        if (Notification.permission === 'granted') {
          new Notification(`E-Shop — ${diff} new order${diff > 1 ? 's' : ''}`, {
            body: 'A customer just placed an order in your store.',
            icon: '/favicon.ico',
            tag: 'new-order'
          });
        }
      }
      prevOrderCount.current = newOrderCount;

      setStats({
        totalSales: salesArray.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0),
        totalOrders: newOrderCount,
        totalCustomers: customersArray.length,
        totalProducts: productsArray.length,
        recentOrders: salesArray.slice(0, 5)
      });

      try {
        const businessRes = await businessApi.getMyBusiness();
        if (businessRes?.data?.slug) setBusinessSlug(businessRes.data.slug);
      } catch {
        if (user?.email) setBusinessSlug(user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'));
      }

      return hasNewData;
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [notificationsEnabled, toast, user?.email]);

  // Smart polling: 30s base, backs off to 5min when nothing changes,
  // pauses when tab hidden, refreshes immediately on tab focus
  const { refresh: manualRefresh } = useSmartPolling(fetchDashboardStats, {
    baseInterval: 30_000,
    maxInterval: 300_000,
    enabled: user?.role !== 'super_admin'
  });

  // Instant refresh when a sale/product fires in another tab
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sale-created' || e.key === 'product-updated' || e.key === 'customer-updated') {
        manualRefresh(true);
      }
    };
    const handleSaleCreated = () => manualRefresh(true);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('sale-created', handleSaleCreated);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sale-created', handleSaleCreated);
    };
  }, [manualRefresh]);

  const copyStoreLink = () => {
    if (storeUrl) {
      navigator.clipboard.writeText(storeUrl);
      toast({
        title: 'Link copied!',
        description: 'Your store link has been copied to clipboard',
      });
    }
  };

  const shareStore = () => {
    if (storeUrl && navigator.share) {
      navigator.share({
        title: 'My Store',
        url: storeUrl
      });
    } else {
      copyStoreLink();
    }
  };

  const statCards = [
    {
      title: 'Total Sales',
      value: `TZS ${stats.totalSales.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Customers',
      value: stats.totalCustomers.toString(),
      icon: Users,
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Products',
      value: stats.totalProducts.toString(),
      icon: Package,
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-gray-500 text-sm">Welcome back, {user?.email}</p>
        <div className="flex gap-2 shrink-0">
          {/* Notification toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!notificationsEnabled && Notification.permission === 'default') {
                Notification.requestPermission();
              }
              setNotificationsEnabled(v => !v);
            }}
            title={notificationsEnabled ? 'Mute order alerts' : 'Enable order alerts'}
            className={`h-9 w-9 p-0 ${notificationsEnabled ? 'text-blue-600 border-blue-300' : 'text-gray-400'}`}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </Button>
          {storeUrl && (
            <Button variant="outline" size="sm" onClick={shareStore} className="hidden sm:flex items-center gap-1.5 h-9">
              <Share2 className="w-4 h-4" /><span className="hidden md:inline">Share</span>
            </Button>
          )}
          <Button size="sm" onClick={() => navigate('/pos')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-9 gap-1.5">
            <Store className="w-4 h-4" /><span className="hidden sm:inline">Go to POS</span><span className="sm:hidden">POS</span>
          </Button>
        </div>
      </div>

      {/* Store Link Card */}
      {storeUrl && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="w-5 h-5 text-blue-600 shrink-0" />
                  <h3 className="text-base font-bold text-gray-900">Your Online Store</h3>
                  {stats.totalProducts > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full shrink-0">
                      {stats.totalProducts} {stats.totalProducts === 1 ? 'Product' : 'Products'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Share this link with your customers to let them browse and buy your products
                </p>
                <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border">
                  <code className="flex-1 text-xs sm:text-sm text-blue-600 break-all line-clamp-1">
                    {storeUrl}
                  </code>
                  <Button size="sm" onClick={copyStoreLink} className="shrink-0 h-8 gap-1.5">
                    <Copy className="w-3.5 h-3.5" />Copy
                  </Button>
                </div>
                {stats.totalProducts === 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>📦 Tip:</strong> Add products to your inventory and toggle "Publish to Store" ON to make them appear in your store!
                    </p>
                  </div>
                )}
              </div>
              <Button
                onClick={() => window.open(storeUrl, '_blank')}
                className="bg-blue-600 hover:bg-blue-700 gap-1.5 w-full sm:w-auto shrink-0"
                size="sm"
              >
                View Store<ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-600 truncate">{stat.title}</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 truncate">
                    {loading ? '…' : stat.value}
                  </p>
                  <div className="flex items-center mt-1 text-xs text-green-600">
                    <TrendingUp className="w-3 h-3 mr-1 shrink-0" />
                    <span>{loading ? 'Updating…' : 'Updated'}</span>
                  </div>
                </div>
                <div className={`p-2.5 sm:p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg shrink-0`}>
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recent orders</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate('/pos')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              New Sale
            </Button>
            <Button 
              onClick={() => navigate('/inventory')}
              variant="outline" 
              className="w-full"
            >
              <Package className="w-4 h-4 mr-2" />
              Add Product
            </Button>
            <Button 
              onClick={() => navigate('/customers')}
              variant="outline" 
              className="w-full"
            >
              <Users className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
