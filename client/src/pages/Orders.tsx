import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  FileText, TrendingUp, DollarSign, Search, Filter,
  Eye, X, Calendar, User, Phone, Mail, MapPin,
  ShoppingBag, Store as StoreIcon, Package, CheckCircle, Clock, XCircle
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import * as salesApi from '../api/sales';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Clock },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200',        icon: XCircle },
};

const sourceConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  storefront: { label: 'Online order', color: 'bg-blue-100 text-blue-700',   icon: ShoppingBag },
  pos:        { label: 'POS sale',     color: 'bg-purple-100 text-purple-700', icon: StoreIcon },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.completed;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

function SourceBadge({ source }: { source?: string }) {
  const cfg = sourceConfig[source || 'pos'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => { fetchOrders(); }, []);

  // Refresh when a new sale is created from the storefront
  useEffect(() => {
    const handler = () => fetchOrders();
    window.addEventListener('sale-created', handler);
    const storageHandler = (e: StorageEvent) => { if (e.key === 'sale-created') fetchOrders(); };
    window.addEventListener('storage', storageHandler);
    return () => { window.removeEventListener('sale-created', handler); window.removeEventListener('storage', storageHandler); };
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await salesApi.getAllSales();
      const list = Array.isArray(res?.sales) ? res.sales : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setOrders(list);
    } catch {
      setOrders([]);
      toast({ title: 'Failed to load orders', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const filtered = orders.filter(o => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      o.invoiceNumber?.toLowerCase().includes(s) ||
      o.customerName?.toLowerCase().includes(s) ||
      o.customerPhone?.toLowerCase().includes(s) ||
      o.items?.some((i: any) => i.productName?.toLowerCase().includes(s));
    const matchStatus = statusFilter === 'all' || (o.status || 'completed') === statusFilter;
    const matchSource = sourceFilter === 'all' || (o.source || 'pos') === sourceFilter;
    return matchSearch && matchStatus && matchSource;
  });

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const completedCount = orders.filter(o => (o.status || 'completed') === 'completed').length;
  const storefrontCount = orders.filter(o => o.source === 'storefront').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-500 mt-1 text-sm">All sales — POS and online storefront orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total orders', value: orders.length, icon: FileText, gradient: 'from-blue-500 to-blue-600' },
          { label: 'Completed', value: completedCount, icon: CheckCircle, gradient: 'from-green-500 to-emerald-600' },
          { label: 'Online orders', value: storefrontCount, icon: ShoppingBag, gradient: 'from-purple-500 to-purple-600' },
          { label: 'Total revenue', value: `TZS ${totalRevenue.toLocaleString()}`, icon: DollarSign, gradient: 'from-orange-500 to-red-500', small: true },
        ].map(stat => (
          <Card key={stat.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                  <p className={`font-extrabold mt-1 ${stat.small ? 'text-lg' : 'text-3xl'} text-gray-900`}>{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by invoice, customer, product…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="all">All sources</option>
                <option value="storefront">Online orders</option>
                <option value="pos">POS sales</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Order history</span>
            <span className="text-sm font-normal text-gray-400">{filtered.length} of {orders.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-14 h-14 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-600">{search || statusFilter !== 'all' ? 'No orders match your filters' : 'No orders yet'}</p>
              <p className="text-sm mt-1">Orders from your store and POS will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(order => (
                <div
                  key={order._id}
                  className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  onClick={() => setSelected(order)}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>

                  {/* Invoice + source */}
                  <div className="flex-1 min-w-[140px]">
                    <p className="font-bold text-gray-900 text-sm font-mono">{order.invoiceNumber || `#${order._id?.slice(-6)}`}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <SourceBadge source={order.source} />
                    </div>
                  </div>

                  {/* Customer */}
                  <div className="flex-1 min-w-[140px]">
                    {order.customerName ? (
                      <>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />{order.customerName}
                        </p>
                        {order.customerPhone && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />{order.customerPhone}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Walk-in / POS</p>
                    )}
                  </div>

                  {/* Items */}
                  <div className="hidden md:block flex-1 min-w-[120px]">
                    <p className="text-sm text-gray-600">{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[160px]">
                      {order.items?.slice(0, 2).map((i: any) => i.productName || i.name).join(', ')}
                      {order.items?.length > 2 ? ` +${order.items.length - 2} more` : ''}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="hidden lg:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    <StatusBadge status={order.status || 'completed'} />
                  </div>

                  {/* Total */}
                  <div className="text-right shrink-0 min-w-[100px]">
                    <p className="font-extrabold text-gray-900">TZS {(order.total || 0).toLocaleString()}</p>
                  </div>

                  {/* View */}
                  <Button size="sm" variant="ghost" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); setSelected(order); }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900 font-mono">{selected.invoiceNumber || `Order #${selected._id?.slice(-6)}`}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={selected.status || 'completed'} />
                  <SourceBadge source={selected.source} />
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer info */}
              {(selected.customerName || selected.customerPhone || selected.customerEmail || selected.customerAddress) && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />Customer details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selected.customerName && (
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <User className="w-3.5 h-3.5 text-blue-400" /><span className="font-medium">{selected.customerName}</span>
                      </div>
                    )}
                    {selected.customerPhone && (
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <Phone className="w-3.5 h-3.5 text-blue-400" />{selected.customerPhone}
                      </div>
                    )}
                    {selected.customerEmail && (
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />{selected.customerEmail}
                      </div>
                    )}
                    {(selected.customerAddress || selected.customerCity) && (
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        {[selected.customerAddress, selected.customerCity].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Date</p>
                  <p className="text-sm font-semibold text-gray-900">{new Date(selected.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Payment</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{selected.paymentMethod || 'Cash'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Source</p>
                  <SourceBadge source={selected.source} />
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-500" />Items ordered
                </h3>
                <div className="space-y-2">
                  {selected.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{item.productName || item.name}</p>
                        <p className="text-xs text-gray-400">Qty: {item.quantity} × TZS {(item.price || 0).toLocaleString()}</p>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">TZS {((item.price || 0) * (item.quantity || 0)).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                {selected.subtotal !== undefined && selected.subtotal !== selected.total && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span><span>TZS {(selected.subtotal || 0).toLocaleString()}</span>
                  </div>
                )}
                {selected.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span><span>−TZS {selected.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-gray-900 text-base">
                  <span>Total</span>
                  <span className="text-blue-600 text-xl">TZS {(selected.total || 0).toLocaleString()}</span>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
                  <p className="text-sm text-amber-800">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
