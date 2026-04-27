import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Store, 
  TrendingUp, 
  DollarSign, 
  Activity,
  AlertCircle,
// CheckCircle,
  Clock,
  BarChart3,
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
// import PlatformSettings from './PlatformSettings';
import BusinessReviewModal from './BusinessReviewModal';
// import AnalyticsChart from './AnalyticsChart';
import PendingUsers from './PendingUsers';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';

interface PlatformStats {
  overview: {
    totalBusinesses: number;
    activeBusinesses: number;
    pendingBusinesses: number;
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
  };
  growth: {
    newBusinessesThisMonth: number;
    newUsersThisMonth: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
  };
  recentBusinesses: Array<{
    _id: string;
    name: string;
    email: string;
    category: string;
    createdAt: string;
  }>;
  topBusinesses: Array<{
    _id: string;
    name: string;
    category: string;
    analytics: {
      revenue: number;
      orders: number;
    };
  }>;
}

interface SystemHealth {
  database: {
    status: string;
    responseTime: number;
  };
  server: {
    uptime: number;
    memoryUsage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
    nodeVersion: string;
    platform: string;
  };
  timestamp: string;
}

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  // Business action handler
  const handleBusinessAction = async (action: 'approve' | 'reject' | 'edit' | 'suspend', business: any) => {
    // TODO: Implement API calls for each action
    // Example:
    // await fetch(`/api/businesses/${business._id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    alert(`${action.toUpperCase()} business: ${business.name}`);
    // Optionally refresh data
    // fetchPlatformData();
  };

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      setError('Access denied. Super admin privileges required.');
      setLoading(false);
      return;
    }

    fetchPlatformData();
  }, [user]);

  const fetchPlatformData = async () => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || '';
      
      const [statsResponse, healthResponse] = await Promise.all([
        fetch(`${baseUrl}/api/platform/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${baseUrl}/api/platform/health`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!statsResponse.ok || !healthResponse.ok) {
        const statsError = !statsResponse.ok ? await statsResponse.json().catch(() => null) : null;
        const healthError = !healthResponse.ok ? await healthResponse.json().catch(() => null) : null;
        throw new Error(
          statsError?.message ||
          healthError?.message ||
          'Failed to load platform data'
        );
      }

      const statsData = await statsResponse.json();
      const healthData = await healthResponse.json();
      setStats(statsData.data);
      setHealth(healthData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platform data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'TZS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

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
          <h2 className="text-xl font-semibold text-foreground">Super Admin Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">Platform overview and management</p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-xs font-medium text-primary">Super Admin</span>
        </div>
      </div>

      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalBusinesses}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.growth.newBusinessesThisMonth} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.growth.newUsersThisMonth} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.growth.ordersThisMonth} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.overview.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                +{formatCurrency(stats.growth.revenueThisMonth)} this month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="businesses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="businesses">Business Management</TabsTrigger>
          <TabsTrigger value="pending-users">Pending Users</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>
        {/* Pending Users Tab */}
        <TabsContent value="pending-users">
          <PendingUsers />
        </TabsContent>

        {/* Business Management Tab */}
        <TabsContent value="businesses" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Businesses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base font-semibold">
                  <Clock className="w-5 h-5 mr-2" />
                  Pending Approvals
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Businesses waiting for approval ({stats?.overview.pendingBusinesses || 0})
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.recentBusinesses.length ? (
                  <div className="space-y-3">
                    {stats.recentBusinesses.slice(0, 5).map((business) => (
                      <div key={business._id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{business.name}</p>
                          <p className="text-sm text-gray-600">{business.email}</p>
                          <Badge variant="secondary" className="mt-1">
                            {business.category}
                          </Badge>
                        </div>
                        <div className="flex space-x-2">
                          <BusinessReviewModal business={business} onAction={handleBusinessAction} />
                        </div>
                      </div>
                    ))}
                    {/* Removed ViewAllPending dialog due to missing component */}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No pending businesses</p>
                )}
              </CardContent>
            </Card>

            {/* Top Performing Businesses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base font-semibold">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Top Performers
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Highest revenue generating businesses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.topBusinesses.length ? (
                  <div className="space-y-3">
                    {stats.topBusinesses.slice(0, 5).map((business, index) => (
                      <div key={business._id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{business.name}</p>
                            <Badge variant="secondary" className="mt-1">
                              {business.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(business.analytics.revenue)}</p>
                          <p className="text-sm text-gray-600">{business.analytics.orders} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No business data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-4">
          {health ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base font-semibold">
                    <Activity className="w-5 h-5 mr-2" />
                    Database Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <Badge variant={health.database.status === 'connected' ? 'default' : 'destructive'}>
                        {health.database.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Response Time</span>
                      <span className="font-mono">{health.database.responseTime}ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base font-semibold">
                    <Settings className="w-5 h-5 mr-2" />
                    Server Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Uptime</span>
                      <span className="font-mono">{formatUptime(health.server.uptime)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Memory Usage</span>
                      <span className="font-mono">{health.server.memoryUsage.heapUsed}MB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Node Version</span>
                      <span className="font-mono">{health.server.nodeVersion}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Platform</span>
                      <span className="font-mono">{health.server.platform}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">System health data is not available.</div>
          )}
        </TabsContent>

        {/* Analytics and Platform Settings tabs moved to Settings page */}
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;
