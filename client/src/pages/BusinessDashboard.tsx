import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign, 
  Clock,
  AlertCircle,
  Store,
  Globe,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface BusinessAnalytics {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    totalProducts: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    orderDate: string;
  }>;
  topProducts: Array<{
    _id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  salesData: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  categoryData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

interface BusinessProfile {
  _id: string;
  name: string;
  slug: string;
  status: string;
  isPublic: boolean;
  analytics: {
    views: number;
    orders: number;
    revenue: number;
  };
  ecommerce: {
    enabled: boolean;
    currency: string;
  };
}

const BusinessDashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'business_admin' && user?.businessId) {
      fetchBusinessData();
    }
  }, [user]);

  const fetchBusinessData = async () => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

      // Fetch business profile and this business's real orders
      const [businessResponse, ordersResponse] = await Promise.all([
        fetch(`/api/business/${user?.businessId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/orders/business/${user?.businessId}?limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (businessResponse.ok) {
        const businessData = await businessResponse.json();
        setBusiness(businessData.data);
      }

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const data = ordersData.data || {};
        const orders: any[] = Array.isArray(data.orders) ? data.orders : [];
        const totalOrders: number = data.pagination?.total ?? orders.length;
        const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);

        // Derive top products from real order items
        const productMap = new Map<string, { sales: number; revenue: number }>();
        orders.forEach((order: any) => {
          const items = Array.isArray(order.items) ? order.items : [];
          items.forEach((item: any) => {
            const key = item.productName || item.name || 'Unknown';
            const prev = productMap.get(key) || { sales: 0, revenue: 0 };
            productMap.set(key, {
              sales: prev.sales + (item.quantity || 0),
              revenue: prev.revenue + ((item.price || 0) * (item.quantity || 0))
            });
          });
        });
        const topProducts = Array.from(productMap.entries())
          .map(([name, v]) => ({ _id: name, name, sales: v.sales, revenue: v.revenue }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);

        // Approximate unique customers from order contact info
        const customerKeys = new Set(orders.map((o: any) => o.customerEmail || o.customerPhone || o.customerName || '').filter(Boolean));

        setAnalytics({
          overview: {
            totalOrders,
            totalRevenue,
            totalCustomers: customerKeys.size,
            totalProducts: topProducts.length,
            conversionRate: 0, // no funnel data available for this business — shown as "—" in the UI
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
          },
          recentOrders: orders.slice(0, 5),
          topProducts,
          salesData: [],
          categoryData: []
        });
      }
    } catch (err) {
      setError('Failed to load business data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `TZS ${Number(amount ?? 0).toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      confirmed: 'default',
      processing: 'default',
      shipped: 'default',
      delivered: 'default',
      completed: 'default',
      cancelled: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (user?.role !== 'business_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">You don't have access to this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{business?.name} Dashboard</h1>
          <p className="text-gray-600">Manage your e-commerce business</p>
        </div>
        <div className="flex items-center space-x-4">
          {business?.isPublic && (
            <Button variant="outline" size="sm">
              <Globe className="w-4 h-4 mr-2" />
              View Store
            </Button>
          )}
          <div className="flex items-center space-x-2">
            <Store className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Business Admin</span>
          </div>
        </div>
      </div>

      {/* Business Status Alert */}
      {business?.status === 'pending' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-600 mr-2" />
              <div>
                <p className="font-medium text-yellow-800">Business Approval Pending</p>
                <p className="text-sm text-yellow-700">
                  Your business registration is under review. You'll receive an email once approved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                Live from your store
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.overview.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Live from your store
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                From your orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                With sales recorded
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Conversion Rate</span>
                  <span className="text-sm font-bold">{analytics?.overview.conversionRate ? `${analytics.overview.conversionRate}%` : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Order Value</span>
                  <span className="text-sm font-bold">{formatCurrency(analytics?.overview.averageOrderValue || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Store Views</span>
                  <span className="text-sm font-bold">{business?.analytics.views}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start">
                  <Package className="w-4 h-4 mr-2" />
                  Add New Product
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Customers
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Store className="w-4 h-4 mr-2" />
                  Store Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recent Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                Latest orders from your customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.recentOrders.length ? (
                <div className="space-y-4">
                  {analytics.recentOrders.map((order) => (
                    <div key={order._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">#{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(order.total)}</p>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">
                    View All Orders
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No orders yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>
                Your best performing products
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.topProducts.length ? (
                <div className="space-y-4">
                  {analytics.topProducts.map((product, index) => (
                    <div key={product._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.sales} sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No sales data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500">
                    {analytics?.salesData.length ? 'Sales chart' : 'No sales data available yet'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500">
                    {analytics?.categoryData.length ? 'Category distribution' : 'No category data available yet'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessDashboard;
