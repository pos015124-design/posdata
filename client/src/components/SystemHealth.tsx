import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RefreshCw, Database, Server, Wifi, WifiOff } from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || '';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token') || ''}`,
  'Content-Type': 'application/json'
});

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

const fmtUptime = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

/**
 * Platform system-health cards (database + server). Used on the centralized
 * super admin settings console.
 */
export default function SystemHealth() {
  const [health, setHealth] = useState<{ data: any; loading: boolean; error: string | null }>({
    data: null, loading: true, error: null,
  });

  const loadHealth = useCallback(async () => {
    setHealth(s => ({ ...s, loading: true, error: null }));
    const { data, error } = await apiFetch<any>('/api/platform/health');
    setHealth({ data, loading: false, error });
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  if (health.error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="flex-1">System health: {health.error}</span>
        <button onClick={loadHealth} className="flex items-center gap-1 text-xs font-semibold hover:underline">
          <RefreshCw className="w-3 h-3" />Retry
        </button>
      </div>
    );
  }

  if (health.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 rounded-xl animate-pulse h-48" />
        <div className="bg-gray-100 rounded-xl animate-pulse h-48" />
      </div>
    );
  }

  const data = health.data;
  if (!data) return null;

  return (
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
            <Badge variant={data.database?.status === 'connected' ? 'default' : 'destructive'} className="gap-1">
              {data.database?.status === 'connected'
                ? <><Wifi className="w-3 h-3" />Connected</>
                : <><WifiOff className="w-3 h-3" />Disconnected</>}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-sm text-gray-600">Response time</span>
            <span className="font-mono text-sm font-semibold">{data.database?.responseTime}ms</span>
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
            { label: 'Uptime', value: fmtUptime(data.server?.uptime || 0) },
            { label: 'Memory used', value: `${data.server?.memoryUsage?.heapUsed || 0} MB` },
            { label: 'Node version', value: data.server?.nodeVersion || '—' },
            { label: 'Platform', value: data.server?.platform || '—' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">{row.label}</span>
              <span className="font-mono text-sm font-semibold">{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
