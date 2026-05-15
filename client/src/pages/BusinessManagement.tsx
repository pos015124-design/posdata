import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, CheckCircle, XCircle, Eye, RefreshCw,
  Store, Mail, Phone, MapPin, BarChart3, Calendar,
  Shield, AlertCircle, Clock, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Business {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  category: string;
  businessType: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  isPublic: boolean;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  analytics?: { views: number; orders: number; revenue: number };
  createdAt: string;
  updatedAt: string;
}

const BASE = import.meta.env.VITE_API_URL || '';
const authH = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json'
});

const fmt     = (n: number) => `TZS ${Number(n ?? 0).toLocaleString()}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700 border-amber-200',  dot: 'bg-amber-500',  icon: Clock },
  active:    { label: 'Active',    color: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500',  icon: CheckCircle },
  inactive:  { label: 'Inactive',  color: 'bg-gray-100 text-gray-600 border-gray-200',     dot: 'bg-gray-400',   icon: AlertCircle },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700 border-red-200',        dot: 'bg-red-500',    icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS[status] || STATUS.inactive;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

const CATEGORIES = [
  'retail','restaurant','services','electronics','clothing',
  'health','beauty','automotive','home-garden','sports',
  'books','toys','jewelry','grocery','other'
];

// ── Main component ────────────────────────────────────────────────────────────

const BusinessManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [businesses, setBusinesses]   = useState<Business[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  // Detail modal
  const [selected, setSelected]       = useState<Business | null>(null);
  const [showDetail, setShowDetail]   = useState(false);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<Business | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting]       = useState(false);

  // Approve loading
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter !== 'all')   params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (search)                   params.set('search', search);

      const res  = await fetch(`${BASE}/api/business/all?${params}`, { headers: authH() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
      setBusinesses(json.data?.businesses || []);
      setPagination(json.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch (err: any) {
      toast({ title: 'Failed to load businesses', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'super_admin') fetchBusinesses();
  }, [user, page, statusFilter, categoryFilter, search]);

  // ── Approve ────────────────────────────────────────────────────────────────
  const approve = async (biz: Business) => {
    setApprovingId(biz._id);
    try {
      const res  = await fetch(`${BASE}/api/business/${biz._id}/approve`, { method: 'POST', headers: authH() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed');
      toast({ title: `${biz.name} approved` });
      fetchBusinesses();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setApprovingId(null);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const reject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      toast({ title: 'Rejection reason required', variant: 'destructive' }); return;
    }
    setRejecting(true);
    try {
      const res  = await fetch(`${BASE}/api/business/${rejectTarget._id}/reject`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ reason: rejectReason })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed');
      toast({ title: `${rejectTarget.name} rejected` });
      setRejectTarget(null);
      setRejectReason('');
      fetchBusinesses();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRejecting(false);
    }
  };

  // ── Counts ─────────────────────────────────────────────────────────────────
  const pendingCount = businesses.filter(b => b.status === 'pending').length;

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

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-600" />Business Management
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {pagination.total} registered · {pendingCount} pending approval
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchBusinesses} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {/* ── Filters ── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-10"
            />
          </div>

          {/* Status + Category + Clear — all on one row, wraps on small screens */}
          <div className="flex flex-wrap gap-2">
            {/* Status filter pills */}
            {(['all', 'pending', 'active', 'inactive', 'suspended'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? `All (${pagination.total})` : s}
              </button>
            ))}

            {/* Category select */}
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
              className="h-8 px-3 border border-gray-200 rounded-full text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>

            {/* Clear */}
            {(search || statusFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setPage(1); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />Clear
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Business list ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Businesses</span>
            <span className="text-sm font-normal text-gray-400">
              {businesses.length} of {pagination.total}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Store className="w-14 h-14 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-600">No businesses found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {businesses.map(biz => {
                const cfg = STATUS[biz.status] || STATUS.inactive;
                return (
                  <div
                    key={biz._id}
                    className={`rounded-xl border p-4 transition-all ${
                      biz.status === 'pending'
                        ? 'border-amber-200 bg-amber-50/30'
                        : biz.status === 'suspended'
                        ? 'border-red-200 bg-red-50/20'
                        : 'border-gray-100 bg-white hover:border-blue-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-sm">
                          {biz.name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-gray-900 text-sm">{biz.name}</p>
                          <StatusBadge status={biz.status} />
                          <span className="text-xs text-gray-400 capitalize bg-gray-100 px-2 py-0.5 rounded-full">
                            {biz.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" />{biz.email}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            {biz.analytics?.orders ?? 0} orders · {fmt(biz.analytics?.revenue ?? 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {fmtDate(biz.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => { setSelected(biz); setShowDetail(true); }}
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {biz.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => approve(biz)}
                              disabled={approvingId === biz._id}
                              title="Approve"
                            >
                              {approvingId === biz._id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : <CheckCircle className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => { setRejectTarget(biz); setRejectReason(''); }}
                              title="Reject"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page === pagination.pages}
                  onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail modal ── */}
      {showDetail && selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{selected.name}</h2>
                <StatusBadge status={selected.status} />
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Email</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />{selected.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Phone</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />{selected.phone || '—'}
                  </p>
                </div>
              </div>

              {/* Category + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Category</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{selected.category}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Type</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{selected.businessType}</p>
                </div>
              </div>

              {/* Address */}
              {selected.address && Object.values(selected.address).some(Boolean) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Address</p>
                  <p className="text-sm font-medium text-gray-900 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    {[selected.address.street, selected.address.city, selected.address.state, selected.address.country]
                      .filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {/* Analytics */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Views',   value: selected.analytics?.views ?? 0 },
                  { label: 'Orders',  value: selected.analytics?.orders ?? 0 },
                  { label: 'Revenue', value: fmt(selected.analytics?.revenue ?? 0) },
                ].map(stat => (
                  <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{stat.label}</p>
                    <p className="font-extrabold text-gray-900 text-sm mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Registered</p>
                  <p className="text-sm font-medium text-gray-900">{fmtDate(selected.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Last updated</p>
                  <p className="text-sm font-medium text-gray-900">{fmtDate(selected.updatedAt)}</p>
                </div>
              </div>

              {/* Approve / Reject from modal */}
              {selected.status === 'pending' && (
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                    onClick={() => { approve(selected); setShowDetail(false); }}
                    disabled={approvingId === selected._id}
                  >
                    <CheckCircle className="w-4 h-4" />Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                    onClick={() => { setRejectTarget(selected); setShowDetail(false); setRejectReason(''); }}
                  >
                    <XCircle className="w-4 h-4" />Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modal ── */}
      {rejectTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setRejectTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Reject Business</h2>
              <button onClick={() => setRejectTarget(null)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Rejecting <strong>{rejectTarget.name}</strong>. Please provide a reason.
              </p>
              <div>
                <Label htmlFor="rejectReason">Reason <span className="text-red-500">*</span></Label>
                <Textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Incomplete information, duplicate registration…"
                  rows={3}
                  className="mt-1.5"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setRejectTarget(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={reject}
                  disabled={rejecting || !rejectReason.trim()}
                >
                  {rejecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Reject'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessManagement;
