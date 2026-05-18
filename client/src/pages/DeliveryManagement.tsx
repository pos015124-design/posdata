/**
 * DeliveryManagement — BHABY GROUP LTD Middleman Delivery Hub
 *
 * Two sections accessible via internal tabs:
 *   1. Orders   — all storefront orders, assign riders, track delivery status
 *   2. Riders   — manage the rider pool (add, edit, deactivate)
 */
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/useToast';
import { useSmartPolling } from '../hooks/useSmartPolling';
import {
  Truck, Users, Plus, Edit, X, RefreshCw, CheckCircle,
  Clock, Package, Phone, User, AlertCircle, ChevronDown,
  ChevronUp, Shield, MapPin, Bike
} from 'lucide-react';

const BASE    = import.meta.env.VITE_API_URL || '';
const authH   = () => ({ Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`, 'Content-Type': 'application/json' });
const fmt     = (n: number) => `TZS ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Types ─────────────────────────────────────────────────────────────────────

interface Rider {
  _id: string; name: string; phone: string; email?: string;
  vehicle?: string; vehiclePlate?: string; isActive: boolean;
  totalDeliveries: number; notes?: string;
}

interface DeliveryOrder {
  _id: string; invoiceNumber: string; source: string;
  customerName?: string; customerPhone?: string; customerEmail?: string;
  customerAddress?: string; customerCity?: string;
  items: Array<{ productName?: string; name?: string; quantity: number; price: number }>;
  total: number; status: string;
  deliveryStatus: string; riderId?: any; riderName?: string; riderPhone?: string;
  assignedAt?: string; collectedAt?: string; deliveredAt?: string;
  deliveryNotes?: string; createdAt: string;
}

// ── Delivery status config ────────────────────────────────────────────────────

const DS: Record<string, { label: string; color: string; icon: React.ElementType; next?: string; nextLabel?: string }> = {
  unassigned:       { label: 'Unassigned',       color: 'bg-gray-100 text-gray-600 border-gray-200',    icon: Package,      next: 'assign',   nextLabel: 'Assign Rider' },
  assigned:         { label: 'Rider Assigned',   color: 'bg-blue-100 text-blue-700 border-blue-200',    icon: Truck,        next: 'collect',  nextLabel: 'Mark Collected' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Truck,        next: 'deliver',  nextLabel: 'Mark Delivered' },
  delivered:        { label: 'Delivered',        color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  failed:           { label: 'Failed',           color: 'bg-red-100 text-red-700 border-red-200',       icon: AlertCircle },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function DeliveryManagement() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'orders' | 'riders'>('orders');

  // ── Orders state ──────────────────────────────────────────────────────────
  const [orders, setOrders]           = useState<DeliveryOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [statusFilter, setStatusFilter]   = useState('all');
  const [expanded, setExpanded]           = useState<string | null>(null);
  const [assigning, setAssigning]         = useState<string | null>(null);  // orderId being assigned
  const [assignRiderId, setAssignRiderId] = useState('');
  const [assignNotes, setAssignNotes]     = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Riders state ──────────────────────────────────────────────────────────
  const [riders, setRiders]           = useState<Rider[]>([]);
  const [ridersLoading, setRidersLoading] = useState(true);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [editingRider, setEditingRider]     = useState<Rider | null>(null);
  const [riderForm, setRiderForm] = useState({ name: '', phone: '', email: '', vehicle: '', vehiclePlate: '', notes: '' });
  const [savingRider, setSavingRider] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false): Promise<boolean> => {
    if (!silent) setOrdersLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res  = await fetch(`${BASE}/api/delivery/orders?${params}`, { headers: authH() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const prev = orders.length;
      setOrders(json.orders || []);
      return (json.orders || []).length !== prev;
    } catch (err: any) {
      if (!silent) toast({ title: 'Failed to load orders', description: err.message, variant: 'destructive' });
      return false;
    } finally { setOrdersLoading(false); }
  }, [statusFilter, orders.length, toast]);

  const fetchRiders = useCallback(async (silent = false): Promise<boolean> => {
    if (!silent) setRidersLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/delivery/riders`, { headers: authH() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setRiders(json.riders || []);
      return true;
    } catch (err: any) {
      if (!silent) toast({ title: 'Failed to load riders', description: err.message, variant: 'destructive' });
      return false;
    } finally { setRidersLoading(false); }
  }, [toast]);

  useSmartPolling(fetchOrders, { baseInterval: 30_000, maxInterval: 120_000 });
  useSmartPolling(fetchRiders, { baseInterval: 60_000, maxInterval: 300_000 });

  // ── Order actions ──────────────────────────────────────────────────────────
  const doAction = async (orderId: string, action: 'collect' | 'deliver' | 'fail', extra?: object) => {
    setActionLoading(orderId + action);
    try {
      const res  = await fetch(`${BASE}/api/delivery/orders/${orderId}/${action}`, {
        method: 'PUT', headers: authH(), body: JSON.stringify(extra || {})
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      toast({ title: json.message || 'Updated' });
      fetchOrders(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setActionLoading(null); }
  };

  const doAssign = async (orderId: string) => {
    if (!assignRiderId) { toast({ title: 'Select a rider', variant: 'destructive' }); return; }
    setActionLoading(orderId + 'assign');
    try {
      const res  = await fetch(`${BASE}/api/delivery/orders/${orderId}/assign`, {
        method: 'PUT', headers: authH(),
        body: JSON.stringify({ riderId: assignRiderId, notes: assignNotes })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      toast({ title: json.message || 'Rider assigned' });
      setAssigning(null); setAssignRiderId(''); setAssignNotes('');
      fetchOrders(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setActionLoading(null); }
  };

  // ── Rider CRUD ─────────────────────────────────────────────────────────────
  const openAddRider = () => {
    setEditingRider(null);
    setRiderForm({ name: '', phone: '', email: '', vehicle: '', vehiclePlate: '', notes: '' });
    setShowRiderModal(true);
  };

  const openEditRider = (r: Rider) => {
    setEditingRider(r);
    setRiderForm({ name: r.name, phone: r.phone, email: r.email || '', vehicle: r.vehicle || '', vehiclePlate: r.vehiclePlate || '', notes: r.notes || '' });
    setShowRiderModal(true);
  };

  const saveRider = async () => {
    if (!riderForm.name.trim() || !riderForm.phone.trim()) {
      toast({ title: 'Name and phone required', variant: 'destructive' }); return;
    }
    setSavingRider(true);
    try {
      const url    = editingRider ? `${BASE}/api/delivery/riders/${editingRider._id}` : `${BASE}/api/delivery/riders`;
      const method = editingRider ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: authH(), body: JSON.stringify(riderForm) });
      const json   = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      toast({ title: editingRider ? 'Rider updated' : 'Rider added' });
      setShowRiderModal(false);
      fetchRiders(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSavingRider(false); }
  };

  const deactivateRider = async (r: Rider) => {
    if (!confirm(`Deactivate ${r.name}?`)) return;
    try {
      const res  = await fetch(`${BASE}/api/delivery/riders/${r._id}`, { method: 'DELETE', headers: authH() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      toast({ title: 'Rider deactivated' });
      fetchRiders(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeRiders   = riders.filter(r => r.isActive);
  const unassignedCount = orders.filter(o => o.deliveryStatus === 'unassigned').length;
  const inProgressCount = orders.filter(o => ['assigned', 'out_for_delivery'].includes(o.deliveryStatus)).length;
  const deliveredCount  = orders.filter(o => o.deliveryStatus === 'delivered').length;

  // ── Filtered orders ────────────────────────────────────────────────────────
  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.deliveryStatus === statusFilter);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <p className="text-gray-500 mt-0.5 text-sm">
        BHABY GROUP LTD middleman delivery hub — assign riders, track orders
      </p>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Unassigned',    value: unassignedCount, icon: Package,     gradient: 'from-gray-500 to-gray-600',    filter: 'unassigned' },
          { label: 'In progress',   value: inProgressCount, icon: Truck,       gradient: 'from-blue-500 to-blue-600',    filter: 'assigned' },
          { label: 'Delivered',     value: deliveredCount,  icon: CheckCircle, gradient: 'from-green-500 to-emerald-600', filter: 'delivered' },
          { label: 'Active riders', value: activeRiders.length, icon: Bike,   gradient: 'from-purple-500 to-purple-600', filter: null },
        ].map(stat => (
          <Card
            key={stat.label}
            className={`border-0 shadow-sm hover:shadow-md transition-shadow ${stat.filter ? 'cursor-pointer' : ''}`}
            onClick={() => stat.filter && setTab('orders') && setStatusFilter(stat.filter)}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{stat.label}</p>
                  <p className="text-xl sm:text-3xl font-extrabold mt-1 text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow shrink-0`}>
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['orders', 'riders'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'orders' ? (
              <span className="flex items-center gap-1.5"><Truck className="w-4 h-4" />Orders</span>
            ) : (
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />Riders</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ORDERS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'orders' && (
        <div className="space-y-4">

          {/* Filter bar */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex flex-wrap gap-3 items-center">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All statuses</option>
                {Object.entries(DS).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchOrders(false)}
                className="gap-1.5 ml-auto"
              >
                <RefreshCw className="w-4 h-4" />Refresh
              </Button>
            </CardContent>
          </Card>

          {/* Orders list */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Storefront orders</span>
                <span className="text-sm font-normal text-gray-400">{filteredOrders.length} orders</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {ordersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Package className="w-14 h-14 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-gray-600">No orders found</p>
                  <p className="text-sm mt-1">Storefront orders will appear here once customers place orders</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOrders.map(order => {
                    const ds = DS[order.deliveryStatus] || DS.unassigned;
                    const DsIcon = ds.icon;
                    const isExpanded = expanded === order._id;
                    const isAssigning = assigning === order._id;
                    const busy = (k: string) => actionLoading === order._id + k;

                    return (
                      <div key={order._id} className="border border-gray-100 rounded-xl overflow-hidden">
                        {/* Row */}
                        <div
                          className="flex flex-wrap items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setExpanded(isExpanded ? null : order._id)}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                            <DsIcon className="w-5 h-5 text-white" />
                          </div>

                          <div className="flex-1 min-w-[130px]">
                            <p className="font-bold text-gray-900 text-sm font-mono">
                              {order.invoiceNumber || `#${order._id?.slice(-6)}`}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {fmtDate(order.createdAt)}
                            </p>
                          </div>

                          {/* Customer */}
                          <div className="flex-1 min-w-[130px]">
                            {order.customerName ? (
                              <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                <User className="w-3 h-3 text-gray-400" />{order.customerName}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400 italic">No name</p>
                            )}
                            {order.customerPhone && (
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />{order.customerPhone}
                              </p>
                            )}
                          </div>

                          {/* Rider */}
                          <div className="flex-1 min-w-[120px]">
                            {order.riderName ? (
                              <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                <Bike className="w-3 h-3 text-blue-500" />{order.riderName}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No rider</p>
                            )}
                          </div>

                          {/* Status badge */}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${ds.color} shrink-0`}>
                            <DsIcon className="w-3 h-3" />{ds.label}
                          </span>

                          <div className="text-right shrink-0 min-w-[90px]">
                            <p className="font-extrabold text-gray-900 text-sm">{fmt(order.total)}</p>
                          </div>

                          <div className="shrink-0">
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-gray-400" />
                              : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">

                            {/* Customer details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="bg-blue-50 rounded-xl p-3">
                                <p className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1">
                                  <Shield className="w-3.5 h-3.5" />Customer (Admin only)
                                </p>
                                <div className="space-y-1 text-xs text-blue-800">
                                  {order.customerName  && <p className="flex items-center gap-1"><User className="w-3 h-3" />{order.customerName}</p>}
                                  {order.customerPhone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{order.customerPhone}</p>}
                                  {order.customerEmail && <p className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />{order.customerEmail}</p>}
                                  {(order.customerAddress || order.customerCity) && (
                                    <p className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {[order.customerAddress, order.customerCity].filter(Boolean).join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Items */}
                              <div className="bg-white rounded-xl p-3 border border-gray-100">
                                <p className="text-xs font-bold text-gray-700 mb-2">Items ({order.items?.length || 0})</p>
                                <div className="space-y-1">
                                  {order.items?.slice(0, 4).map((item, idx) => (
                                    <p key={idx} className="text-xs text-gray-600">
                                      {item.productName || item.name} × {item.quantity}
                                    </p>
                                  ))}
                                  {(order.items?.length || 0) > 4 && (
                                    <p className="text-xs text-gray-400">+{order.items!.length - 4} more</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Delivery notes */}
                            {order.deliveryNotes && (
                              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                                <p className="text-xs font-semibold text-amber-700 mb-1">Delivery notes</p>
                                <p className="text-xs text-amber-800">{order.deliveryNotes}</p>
                              </div>
                            )}

                            {/* Assign rider form */}
                            {isAssigning && (
                              <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
                                <p className="text-sm font-bold text-gray-900">Assign a rider</p>
                                <select
                                  value={assignRiderId}
                                  onChange={e => setAssignRiderId(e.target.value)}
                                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                  <option value="">Select rider…</option>
                                  {activeRiders.map(r => (
                                    <option key={r._id} value={r._id}>
                                      {r.name} — {r.phone}{r.vehicle ? ` (${r.vehicle})` : ''}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder="Delivery notes (optional)"
                                  value={assignNotes}
                                  onChange={e => setAssignNotes(e.target.value)}
                                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => doAssign(order._id)}
                                    disabled={!!busy('assign')}
                                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    {busy('assign') ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                                    Assign
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => { setAssigning(null); setAssignRiderId(''); setAssignNotes(''); }}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2">
                              {order.deliveryStatus === 'unassigned' && !isAssigning && (
                                <Button
                                  size="sm"
                                  onClick={() => { setAssigning(order._id); setAssignRiderId(''); setAssignNotes(''); }}
                                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Truck className="w-3.5 h-3.5" />Assign Rider
                                </Button>
                              )}
                              {order.deliveryStatus === 'assigned' && (
                                <Button
                                  size="sm"
                                  onClick={() => doAction(order._id, 'collect')}
                                  disabled={!!busy('collect')}
                                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  {busy('collect') ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                                  Mark Collected
                                </Button>
                              )}
                              {order.deliveryStatus === 'out_for_delivery' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => doAction(order._id, 'deliver')}
                                    disabled={!!busy('deliver')}
                                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {busy('deliver') ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                    Mark Delivered
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => doAction(order._id, 'fail', { reason: 'Delivery failed' })}
                                    disabled={!!busy('fail')}
                                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                                  >
                                    {busy('fail') ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                    Mark Failed
                                  </Button>
                                </>
                              )}
                              {order.deliveryStatus === 'failed' && (
                                <Button
                                  size="sm"
                                  onClick={() => { setAssigning(order._id); setAssignRiderId(''); setAssignNotes(''); }}
                                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Truck className="w-3.5 h-3.5" />Re-assign Rider
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RIDERS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'riders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{riders.length} rider{riders.length !== 1 ? 's' : ''} · {activeRiders.length} active</p>
            <Button size="sm" onClick={openAddRider} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4" />Add Rider
            </Button>
          </div>

          {ridersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : riders.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center text-gray-400">
                <Bike className="w-14 h-14 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-gray-600">No riders yet</p>
                <p className="text-sm mt-1">Add your first rider to start assigning deliveries</p>
                <Button size="sm" onClick={openAddRider} className="mt-4 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4" />Add Rider
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {riders.map(rider => (
                <Card key={rider._id} className={`border-0 shadow-sm ${!rider.isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0">
                        <Bike className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditRider(rider)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                          title="Edit rider"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {rider.isActive && (
                          <button
                            onClick={() => deactivateRider(rider)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                            title="Deactivate rider"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold text-gray-900">{rider.name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />{rider.phone}
                      </p>
                      {rider.vehicle && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Bike className="w-3.5 h-3.5" />{rider.vehicle}
                          {rider.vehiclePlate && ` · ${rider.vehiclePlate}`}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        rider.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {rider.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-400">{rider.totalDeliveries} deliveries</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RIDER ADD / EDIT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showRiderModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRiderModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {editingRider ? 'Edit Rider' : 'Add New Rider'}
              </h2>
              <button
                onClick={() => setShowRiderModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="riderName">Full name <span className="text-red-500">*</span></Label>
                <Input
                  id="riderName"
                  value={riderForm.name}
                  onChange={e => setRiderForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Juma Hassan"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="riderPhone">Phone <span className="text-red-500">*</span></Label>
                <Input
                  id="riderPhone"
                  value={riderForm.phone}
                  onChange={e => setRiderForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+255 7xx xxx xxx"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="riderEmail">Email</Label>
                <Input
                  id="riderEmail"
                  type="email"
                  value={riderForm.email}
                  onChange={e => setRiderForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="rider@example.com"
                  className="mt-1.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="riderVehicle">Vehicle type</Label>
                  <Input
                    id="riderVehicle"
                    value={riderForm.vehicle}
                    onChange={e => setRiderForm(f => ({ ...f, vehicle: e.target.value }))}
                    placeholder="e.g. Bajaj, Bicycle"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="riderPlate">Plate number</Label>
                  <Input
                    id="riderPlate"
                    value={riderForm.vehiclePlate}
                    onChange={e => setRiderForm(f => ({ ...f, vehiclePlate: e.target.value }))}
                    placeholder="e.g. T123 ABC"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="riderNotes">Notes</Label>
                <Input
                  id="riderNotes"
                  value={riderForm.notes}
                  onChange={e => setRiderForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional notes"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <Button
                onClick={saveRider}
                disabled={savingRider}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                {savingRider
                  ? <><RefreshCw className="w-4 h-4 animate-spin" />Saving…</>
                  : editingRider ? 'Save changes' : 'Add rider'
                }
              </Button>
              <Button variant="outline" onClick={() => setShowRiderModal(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
