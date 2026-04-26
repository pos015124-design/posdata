import { useState, useEffect } from 'react';
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
  Share2
} from 'lucide-react';
import * as salesApi from '../api/sales';
import * as customersApi from '../api/customers';
import * as productsApi from '../api/products';
import { useToast } from '../hooks/useToast';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const storeUrl = businessSlug ? `${window.location.origin}/store/${businessSlug}` : null;

  useEffect(() => {
    fetchDashboardStats();
    
    // Listen for updates from other pages
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'product-updated' || e.key === 'sale-created' || e.key === 'customer-updated') {
        fetchDashboardStats(); // Refresh dashboard stats
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Auto-refresh every 15 seconds for real-time updates
    const refreshInterval = setInterval(fetchDashboardStats, 15000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const [salesRes, customersRes, productsRes] = await Promise.all([
        salesApi.getAllSales(),
        customersApi.getCustomers(),
        productsApi.getProducts()
      ]);

      console.log('Dashboard Data:', { salesRes, customersRes, productsRes });

      setStats({
        totalSales: salesRes?.sales?.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0) || 0,
        totalOrders: salesRes?.sales?.length || 0,
        totalCustomers: customersRes?.customers?.length || 0,
        totalProducts: productsRes?.products?.length || 0,
        recentOrders: salesRes?.sales?.slice(0, 5) || []
      });

      // Get business slug from localStorage or use default
      const storedBusiness = localStorage.getItem('business');
      if (storedBusiness) {
        try {
          const business = JSON.parse(storedBusiness);
          setBusinessSlug(business.slug || null);
        } catch (e) {
          console.error('Failed to parse business data');
        }
      }
      
      // Fallback: generate from user email
      if (!businessSlug && user?.email) {
        const slug = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
        setBusinessSlug(slug);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center md:text-left">Dashboard</h1>
          <p className="text-gray-600 mt-1 text-center md:text-left">Welcome back, {user?.email}!</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {storeUrl && (
            <Button 
              variant="outline"
              onClick={shareStore}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share Store
            </Button>
          )}
          <Button 
            onClick={() => navigate('/pos')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
          >
            <Store className="w-4 h-4" />
            Go to POS
          </Button>
        </div>
      </div>

      {/* Store Link Card */}
      {storeUrl && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Your Online Store</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Share this link with your customers to let them browse and buy your products
                </p>
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                  <code className="flex-1 text-sm text-blue-600 break-all">
                    {storeUrl}
                  </code>
                  <Button size="sm" onClick={copyStoreLink} className="flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>
              </div>
              <Button 
                onClick={() => window.open(storeUrl, '_blank')}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                View Store
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {loading ? '...' : stat.value}
                  </p>
                  <div className="flex items-center mt-2 text-sm text-green-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span>{loading ? 'Updating...' : 'Updated'}</span>
                  </div>
                </div>
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
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
