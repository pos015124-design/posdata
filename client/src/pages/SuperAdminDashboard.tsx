import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Store, TrendingUp, DollarSign, Activity,
  AlertCircle, Clock, BarChart3, Settings, Shield,
  ShoppingBag, Building2, RefreshCw, CheckCircle,
  XCircle, Eye, Wifi, WifiOff, Server, Database
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import BusinessReviewModal from './BusinessReviewModal';
import PendingUsers from './PendingUsers';
import BusinessManagement from './BusinessManagement';
import PlatformSettings from './PlatformSettings';

const BASE = import.meta.env.VITE_API_URL || '';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token') || ''}`,
  'Content-Type': 'application/json'
});

/* ── tiny fetch helper: returns { data, error } ── */
async function apiFetch<T>(path: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { data: null, error: json?.message || json?.error || `HTTP ${res.status}` };
    return { data: json?.data ?? json, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Network error' };
  }
}

/* ── section loading state ── */
type SectionState<T> = { data: T | null; loading: boolean; error: string | null };
function initSection<T>(): SectionState<T> { return { data: null, loading: true, error: null }; }

/* ── stat card ── */
function StatCard({ label, value, sub, icon: Icon, gradient }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; gradient: string;
}) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── section error banner ── */
function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1 text-xs font-semibold hover:underline">
        <RefreshCw className="w-3 h-3" />Retry
      </button>
    </div>
  );
}

/* ── skeleton ── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 rounded-xl animate-pulse ${className}`} />;
}

const fmt = (n: number) => `TZS ${n.toLocaleString()}`;
const fmtUptime = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

/* ══════════════════════════════════════════════════════════════════ */
const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState<SectionState<any>>(initSection());
  const [health, setHealth]       = useState<SectionState<any>>(initSection());
  const [sfHealth, setSfHealth]   = useState<SectionState<any>>(initSection());
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  /* ── individual loaders ── */
  const loadAnalytics = useCallback(async () => {
    setAnalytics(s => ({ ...s, loading: true, error: null }));
    const { data, error } = await apiFetch<any>('/api/platform/analytics');
    setAnalytics({ data, loading: false, error });
  }, []);

  const loadHealth = useCallback(async () => {
    setHealth(s => ({ ...s, loading: true, error: null }));
    const { data, error } = await apiFetch<any>('/api/platform/health');
    setHealth({ data, loading: false, error });
  }, []);

  const loadSfHealth = useCallback(async () => {
    setSfHealth(s => ({ ...s, loading: true, error: null }));
    const { data, error } = await apiFetch<any>('/api/platform/storefront-health');
    setSfHealth({ data, loading: false, error });
  }, []);

  const refreshAll = useCallback(() => {
    setLastRefresh(new Date());
    loadAnalytics();
    loadHealth();
    loadSfHealth();
  }, [loadAnalytics, loadHealth, loadSfHealth]);

  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    // Load independently — one slow endpoint won't block others
    loadAnalytics();
    loadHealth();
    loadSfHealth();
  }, [user, loadAnalytics, loadHealth, loadSfHealth]);

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-semibold">Access denied — super admin only</p>
        </div>
      </div>
    );
  }

  const stats = analytics.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />Super Admin
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Platform overview · Last refreshed {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} className="gap-2">
          <RefreshCw className="w-4 h-4" />Refresh all
        </Button>
      </div>

      {/* ── Overview stats ── */}
      {analytics.error ? (
        <SectionError message={`Analytics: ${analytics.error}`} onRetry={loadAnalytics} />
      ) : analytics.loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total businesses" value={stats.overview.totalBusinesses}
            sub={`+${stats.growth.newBusinessesThisMonth} this month`}
            icon={Store} gradient="from-blue-500 to-blue-600" />
          <StatCard label="Total users" value={stats.overview.totalUsers}
            sub={`+${stats.growth.newUsersThisMonth} this month`}
            icon={Users} gradient="from-purple-500 to-purple-600" />
          <StatCard label="Total orders" value={stats.overview.totalOrders}
            sub={`+${stats.growth.ordersThisMonth} this month`}
            icon={TrendingUp} gradient="from-green-500 to-emerald-600" />
          <StatCard label="Total revenue" value={fmt(stats.overview.totalRevenue)}
            sub={`+${fmt(stats.growth.revenueThisMonth)} this month`}
            icon={DollarSign} gradient="from-orange-500 to-red-500" />
        </div>
      ) : null}

      {/* ── Storefront health ── */}
      {sfHealth.error ? (
        <SectionError message={`Storefront health: ${sfHealth.error}`} onRetry={loadSfHealth} />
      ) : sfHealth.loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : sfHealth.data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Active public stores" value={sfHealth.data.activePublicStores}
            sub="status active & visible" icon={ShoppingBag} gradient="from-teal-500 to-cyan-600" />
          <StatCard label="Published SKUs" value={sfHealth.data.publishedProductsOnCatalog}
            sub="Across all stores" icon={BarChart3} gradient="from-indigo-500 to-blue-600" />
          <StatCard label="Stores with 0 listings" value={sfHealth.data.publicStoresWithZeroPublishedProducts}
            sub="Public but nothing published" icon={AlertCircle} gradient="from-amber-500 to-orange-500" />
        </div>
      ) : null}

      {/* ── Quick links ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/store"><ShoppingBag className="h-4 w-4" />Marketplace</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/stores"><Building2 className="h-4 w-4" />Store directory</Link>
          </Button>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="pending-users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* ── Overview tab ── */}
        <TabsContent value="overview" className="space-y-4">
          {analytics.loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64" /><Skeleton className="h-64" />
            </div>
          ) : analytics.error ? (
            <SectionError message={analytics.error} onRetry={loadAnalytics} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending approvals */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />Pending approvals
                  </CardTitle>
                  <CardDescription>{stats?.overview.pendingBusinesses || 0} businesses awaiting review</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.recentBusinesses?.length ? (
                    <div className="space-y-3">
                      {stats.recentBusinesses.slice(0, 5).map((biz: any) => (
                        <div key={biz._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{biz.name}</p>
                            <p className="text-xs text-gray-500">{biz.email}</p>
                            <Badge variant="secondary" className="mt-1 text-xs">{biz.category}</Badge>
                          </div>
                          <BusinessReviewModal business={biz} onAction={async (action, b) => {
                            const endpoint = action === 'approve' ? `/api/business/${b._id}/approve` : `/api/business/${b._id}/reject`;
                            await fetch(`${BASE}${endpoint}`, { method: 'POST', headers: authHeaders() });
                            loadAnalytics();
                          }} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No pending businesses</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top performers */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />Top performers
                  </CardTitle>
                  <CardDescription>Highest revenue businesses</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.topBusinesses?.length ? (
                    <div className="space-y-3">
                      {stats.topBusinesses.slice(0, 5).map((biz: any, i: number) => (
                        <div key={biz._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">#{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{biz.name}</p>
                            <Badge variant="secondary" className="text-xs">{biz.category}</Badge>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-sm text-gray-900">{fmt(biz.analytics?.revenue || 0)}</p>
                            <p className="text-xs text-gray-400">{biz.analytics?.orders || 0} orders</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No business data yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── Businesses tab ── */}
        <TabsContent value="businesses">
          <BusinessManagement />
        </TabsContent>

        {/* ── Users tab ── */}
        <TabsContent value="pending-users">
          <PendingUsers />
        </TabsContent>

        {/* ── Settings tab ── */}
        <TabsContent value="settings">
          <PlatformSettings />
        </TabsContent>

        {/* ── System health tab ── */}
        <TabsContent value="system" className="space-y-4">
          {health.error ? (
            <SectionError message={health.error} onRetry={loadHealth} />
          ) : health.loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-48" /><Skeleton className="h-48" />
            </div>
          ) : health.data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />Database
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge variant={health.data.database?.status === 'connected' ? 'default' : 'destructive'} className="gap-1">
                      {health.data.database?.status === 'connected'
                        ? <><Wifi className="w-3 h-3" />Connected</>
                        : <><WifiOff className="w-3 h-3" />Disconnected</>}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-600">Response time</span>
                    <span className="font-mono text-sm font-semibold">{health.data.database?.responseTime}ms</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="w-5 h-5 text-green-500" />Server
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Uptime', value: fmtUptime(health.data.server?.uptime || 0) },
                    { label: 'Memory used', value: `${health.data.server?.memoryUsage?.heapUsed || 0} MB` },
                    { label: 'Node version', value: health.data.server?.nodeVersion || '—' },
                    { label: 'Platform', value: health.data.server?.platform || '—' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-600">{row.label}</span>
                      <span className="font-mono text-sm font-semibold">{row.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;
