/**
 * AdminBilling — Super Admin billing dashboard
 * Shows all seller fees, outstanding balances, payment confirmations
 * PBZ Account: 0952509001 — BHABY GROUP LTD
 */
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { useSmartPolling } from '../hooks/useSmartPolling';
import {
  DollarSign, CheckCircle, Clock, AlertCircle, Search,
  Filter, RefreshCw, X, Receipt, Building2, TrendingUp,
  CreditCard, UserCheck, Eye, ChevronDown, ChevronUp
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || '';
const authH = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json'
});

const fmt = (n: number) => `TZS ${Number(n || 0).toLocaleString()}`;

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  registration: { label: 'Registration', color: 'bg-blue-100 text-blue-700 border-blue-200',   icon: UserCheck },
  subscription:  { label: 'Monthly Ads',  color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CreditCard }
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  unpaid: { label: 'Unpaid', color: 'bg-red-100 text-red-700 border-red-200',     icon: AlertCircle },
  paid:   { label: 'Paid',   color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  waived: { label: 'Waived', color: 'bg-gray-100 text-gray-600 border-gray-200',   icon: CheckCircle }
};

interface BillingRecord {
  _id: string;
  userId: { _id: string; email: string; firstName?: string; lastName?: string } | string;
  businessName?: string;
  type: 'registration' | 'subscription' | 'commission';
  amount: number;
  status: 'unpaid' | 'paid' | 'waived';
  paymentReference?: string;
  saleInvoice?: string;
  description?: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
}

function StatCard({ label, value, sub, icon: Icon, gradient }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; gradient: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminBilling() {
  const { toast } = useToast();
  const [records, setRecords]       = useState<BillingRecord[]>([]);
  const [summary, setSummary]       = useState({ totalUnpaid: 0, totalPaid: 0, totalWaived: 0, totalCommission: 0 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [expanded, setExpanded]     = useState<string | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ record: BillingRecord; ref: string } | null>(null);
  const [confirming, setConfirming]     = useState(false);

  // Create subscription modal
  const [subModal, setSubModal]   = useState(false);
  const [subForm, setSubForm]     = useState({ userId: '', businessName: '', months: '1' });
  const [creating, setCreating]   = useState(false);

  const fetchBilling = useCallback(async (silent = false): Promise<boolean> => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: '50' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all')   params.set('type', typeFilter);

      const res  = await fetch(`${BASE}/api/billing/all?${params}`, { headers: authH() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      const recs: BillingRecord[] = json.data?.records || [];
      setRecords(recs);
      setPagination(json.data?.pagination || { page: 1, pages: 1, total: 0 });

      // Compute summary from returned records
      const unpaid     = recs.filter(r => r.status === 'unpaid').reduce((s, r) => s + r.amount, 0);
      const paid       = recs.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
      const waived     = recs.filter(r => r.status === 'waived').reduce((s, r) => s + r.amount, 0);
      setSummary({ totalUnpaid: json.data?.totalUnpaid ?? unpaid, totalPaid: paid, totalWaived: waived, totalCommission: 0 });

      return recs.length > 0;
    } catch (err: any) {
      if (!silent) toast({ title: 'Failed to load billing', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [pagination.page, statusFilter, typeFilter, toast]);

  useSmartPolling(fetchBilling, { baseInterval: 60_000, maxInterval: 300_000 });

  const confirmPayment = async () => {
    if (!confirmModal) return;
    setConfirming(true);
    try {
      const res  = await fetch(`${BASE}/api/billing/${confirmModal.record._id}/confirm`, {
        method: 'PUT', headers: authH(),
        body: JSON.stringify({ paymentReference: confirmModal.ref })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      toast({ title: 'Payment confirmed ✓', description: `${fmt(confirmModal.record.amount)} marked as paid` });
      setConfirmModal(null);
      fetchBilling(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setConfirming(false); }
  };

  const waiveFee = async (record: BillingRecord) => {
    if (!confirm(`Waive ${fmt(record.amount)} for ${record.businessName || 'this seller'}?`)) return;
    try {
      const res  = await fetch(`${BASE}/api/billing/${record._id}/waive`, { method: 'PUT', headers: authH() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      toast({ title: 'Fee waived' });
      fetchBilling(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const createSubscription = async () => {
    if (!subForm.userId.trim()) { toast({ title: 'User ID required', variant: 'destructive' }); return; }
    setCreating(true);
    try {
      const months = Math.max(1, parseInt(subForm.months) || 1);
      for (let i = 0; i < months; i++) {
        const start = new Date(); start.setMonth(start.getMonth() + i);
        const end   = new Date(start); end.setMonth(end.getMonth() + 1);
        await fetch(`${BASE}/api/billing/create-registration`, {
          method: 'POST', headers: authH(),
          body: JSON.stringify({
            userId: subForm.userId,
            businessName: subForm.businessName,
            type: 'subscription',
            amount: 5000,
            description: `Monthly ads fee — ${start.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            periodStart: start.toISOString(),
            periodEnd: end.toISOString()
          })
        });
      }
      toast({ title: `${months} subscription invoice${months > 1 ? 's' : ''} created` });
      setSubModal(false);
      setSubForm({ userId: '', businessName: '', months: '1' });
      fetchBilling(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setCreating(false); }
  };

  // Client-side search filter
  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    const email = r.userId && typeof r.userId === 'object' ? (r.userId.email || '') : '';
    return (
      email.toLowerCase().includes(q) ||
      (r.businessName || '').toLowerCase().includes(q) ||
      (r.saleInvoice || '').toLowerCase().includes(q) ||
      (r.paymentReference || '').toLowerCase().includes(q)
    );
  });

  const sellerEmail = (r: BillingRecord) => {
    if (!r.userId) return 'Unknown seller';
    return typeof r.userId === 'object' && r.userId !== null ? (r.userId.email || 'Unknown') : String(r.userId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />Billing Management
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            All seller fees · PBZ {' '}
            <span className="font-mono font-bold text-gray-700">0952509001</span>
            {' '}— BHABY GROUP LTD
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setSubModal(true)} className="gap-1.5">
            <CreditCard className="w-4 h-4" />Create Invoice
          </Button>
          <Button size="sm" variant="outline" onClick={() => fetchBilling(false)} className="gap-1.5">
            <RefreshCw className="w-4 h-4" />Refresh
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Outstanding" value={fmt(summary.totalUnpaid)}
          sub="Awaiting payment" icon={AlertCircle} gradient="from-red-500 to-rose-600" />
        <StatCard label="Collected" value={fmt(summary.totalPaid)}
          sub="Confirmed payments" icon={CheckCircle} gradient="from-green-500 to-emerald-600" />
        <StatCard label="Subscriptions" value={records.filter(r => r.type === 'subscription').length}
          sub="Monthly ads invoices" icon={CreditCard} gradient="from-purple-500 to-violet-600" />
        <StatCard label="Total records" value={pagination.total}
          sub={`${records.filter(r => r.status === 'unpaid').length} unpaid`}
          icon={TrendingUp} gradient="from-blue-500 to-indigo-600" />
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search seller, business, invoice, reference…"
                value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); }}
                className="h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="waived">Waived</option>
              </select>
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); }}
                className="h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All types</option>
                <option value="registration">Registration</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Billing Records</span>
            <span className="text-sm font-normal text-gray-400">{filtered.length} shown</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-600">No billing records found</p>
              <p className="text-sm mt-1">Records are created automatically when sellers register or make sales</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(record => {
                const typeCfg   = TYPE_CONFIG[record.type]   || TYPE_CONFIG.commission;
                const statusCfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.unpaid;
                const TypeIcon   = typeCfg.icon;
                const StatusIcon = statusCfg.icon;
                const isExpanded = expanded === record._id;
                const isOverdue  = record.status === 'unpaid' && record.dueDate && new Date(record.dueDate) < new Date();

                return (
                  <div key={record._id}
                    className={`rounded-xl border transition-all ${isOverdue ? 'border-red-200 bg-red-50/30' : record.status === 'unpaid' ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100 bg-white'}`}>
                    {/* Main row */}
                    <div className="flex flex-wrap items-center gap-3 p-4 cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : record._id)}>

                      {/* Type icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        record.type === 'registration' ? 'bg-blue-100' :
                        record.type === 'subscription' ? 'bg-purple-100' : 'bg-green-100'}`}>
                        <TypeIcon className={`w-4 h-4 ${
                          record.type === 'registration' ? 'text-blue-600' :
                          record.type === 'subscription' ? 'text-purple-600' : 'text-green-600'}`} />
                      </div>

                      {/* Seller + business */}
                      <div className="flex-1 min-w-[140px]">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {record.businessName || sellerEmail(record)}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{sellerEmail(record)}</p>
                      </div>

                      {/* Type badge */}
                      <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${typeCfg.color}`}>
                        {typeCfg.label}
                      </span>

                      {/* Due date */}
                      {record.dueDate && record.status === 'unpaid' && (
                        <span className={`hidden md:block text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                          {isOverdue ? '⚠ Overdue' : `Due ${new Date(record.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                        </span>
                      )}

                      {/* Payment ref submitted */}
                      {record.paymentReference && record.status === 'unpaid' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          Ref submitted
                        </span>
                      )}

                      {/* Status */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />{statusCfg.label}
                      </span>

                      {/* Amount */}
                      <p className="font-extrabold text-gray-900 shrink-0 min-w-[100px] text-right">
                        {fmt(record.amount)}
                      </p>

                      {/* Expand toggle */}
                      <button className="text-gray-400 hover:text-gray-600 shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-400 font-medium mb-0.5">Created</p>
                            <p className="font-semibold text-gray-900">{new Date(record.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          </div>
                          {record.saleInvoice && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-400 font-medium mb-0.5">Sale Invoice</p>
                              <p className="font-mono font-semibold text-gray-900">{record.saleInvoice}</p>
                            </div>
                          )}
                          {record.paymentReference && (
                            <div className="bg-blue-50 rounded-lg p-3">
                              <p className="text-xs text-blue-500 font-medium mb-0.5">Payment Reference</p>
                              <p className="font-mono font-semibold text-blue-900">{record.paymentReference}</p>
                            </div>
                          )}
                          {record.paidAt && (
                            <div className="bg-green-50 rounded-lg p-3">
                              <p className="text-xs text-green-500 font-medium mb-0.5">Paid At</p>
                              <p className="font-semibold text-green-900">{new Date(record.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                          )}
                        </div>
                        {record.description && (
                          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{record.description}</p>
                        )}

                        {/* Actions */}
                        {record.status === 'unpaid' && (
                          <div className="flex gap-2 pt-1">
                            <Button size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                              onClick={() => setConfirmModal({ record, ref: record.paymentReference || '' })}>
                              <CheckCircle className="w-3.5 h-3.5" />Confirm Payment
                            </Button>
                            <Button size="sm" variant="outline"
                              className="text-gray-500 hover:text-gray-700 gap-1.5"
                              onClick={() => waiveFee(record)}>
                              <X className="w-3.5 h-3.5" />Waive Fee
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages} · {pagination.total} total</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={pagination.page <= 1}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Previous</Button>
                <Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Confirm Payment Modal ── */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />Confirm Payment
              </h3>
              <button onClick={() => setConfirmModal(null)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Seller</span>
                <span className="font-semibold">{confirmModal.record.businessName || sellerEmail(confirmModal.record)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-semibold capitalize">{confirmModal.record.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-extrabold text-green-600 text-base">{fmt(confirmModal.record.amount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Bank Reference Number
                {confirmModal.record.paymentReference && (
                  <span className="ml-2 text-xs text-blue-600 font-normal">(seller submitted: {confirmModal.record.paymentReference})</span>
                )}
              </label>
              <Input
                placeholder="e.g. PBZ2024051234567"
                value={confirmModal.ref}
                onChange={e => setConfirmModal(m => m ? { ...m, ref: e.target.value } : null)}
                className="h-11 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">Enter the PBZ transaction reference to confirm receipt</p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={confirming} onClick={confirmPayment}>
                {confirming ? 'Confirming…' : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Subscription Invoice Modal ── */}
      {subModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />Create Subscription Invoice
              </h3>
              <button onClick={() => setSubModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">Create monthly ads/sponsorship fee invoices (TZS 5,000/month) for a seller.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seller User ID *</label>
                <Input placeholder="MongoDB ObjectId of the seller"
                  value={subForm.userId} onChange={e => setSubForm(f => ({ ...f, userId: e.target.value }))}
                  className="h-10 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <Input placeholder="e.g. Hunter Autoworks"
                  value={subForm.businessName} onChange={e => setSubForm(f => ({ ...f, businessName: e.target.value }))}
                  className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of months</label>
                <Input type="number" min="1" max="12"
                  value={subForm.months} onChange={e => setSubForm(f => ({ ...f, months: e.target.value }))}
                  className="h-10" />
                <p className="text-xs text-gray-400 mt-1">
                  Total: {fmt(5000 * Math.max(1, parseInt(subForm.months) || 1))}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setSubModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={creating} onClick={createSubscription}>
                {creating ? 'Creating…' : 'Create Invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
