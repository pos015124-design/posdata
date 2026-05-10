/**
 * Suppliers — My Suppliers & Stock-In Ledger
 * Replaces the old "Vendor profiles" screen with a real supplier management tool.
 *
 * Features:
 *  - Add / edit / delete supplier profiles (name, contact, phone, email, payment terms)
 *  - Record stock deliveries (stock-in) against a supplier
 *  - Each stock-in updates product inventory counts and purchase prices automatically
 *  - View full delivery history per supplier with running totals (spent / owed)
 */
import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Truck, Search, Plus, Edit, Trash2, X, ChevronDown, ChevronUp,
  Package, DollarSign, RefreshCw, ClipboardList, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useSmartPolling } from '../hooks/useSmartPolling';
import * as suppliersApi from '../api/suppliers';
import * as productsApi from '../api/products';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StockInItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface StockIn {
  _id: string;
  date: string;
  referenceNo?: string;
  notes?: string;
  items: StockInItem[];
  totalCost: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  amountPaid: number;
  createdAt: string;
}

interface Supplier {
  _id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  totalSpent: number;
  totalOwed: number;
  stockIns?: StockIn[];
}

interface Product { _id: string; name: string; price: number; purchasePrice: number; stock: number; }

const fmt = (n: number) => `TZS ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const PAYMENT_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  unpaid:  { label: 'Unpaid',   color: 'bg-red-100 text-red-700 border-red-200',     icon: AlertCircle },
  partial: { label: 'Partial',  color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  paid:    { label: 'Paid',     color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle }
};

// ── Main component ────────────────────────────────────────────────────────────

export default function Sellers() {
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [suppliers, setSuppliers]   = useState<Supplier[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [expanded, setExpanded]     = useState<string | null>(null);

  // Supplier form modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier]     = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '', contactName: '', phone: '', email: '',
    address: '', paymentTerms: '', notes: ''
  });
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Stock-in modal
  const [showStockInModal, setShowStockInModal]   = useState(false);
  const [stockInSupplier, setStockInSupplier]     = useState<Supplier | null>(null);
  const [stockInForm, setStockInForm] = useState({
    date: new Date().toISOString().split('T')[0],
    referenceNo: '', notes: '',
    paymentStatus: 'unpaid' as 'unpaid' | 'partial' | 'paid',
    amountPaid: ''
  });
  const [stockInItems, setStockInItems] = useState<Array<{
    productId: string; productName: string; quantity: string; unitCost: string;
  }>>([{ productId: '', productName: '', quantity: '', unitCost: '' }]);
  const [savingStockIn, setSavingStockIn] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (silent = false): Promise<boolean> => {
    if (!silent) setLoading(true);
    try {
      const [suppRes, prodRes] = await Promise.all([
        suppliersApi.getSuppliers(),
        productsApi.getProducts()
      ]);
      const prev = suppliers.length;
      setSuppliers(suppRes.suppliers || []);
      setProducts(
        (prodRes.products || []).map((p: any) => ({
          _id: p._id, name: p.name, price: p.price,
          purchasePrice: p.purchasePrice, stock: p.stock
        }))
      );
      return (suppRes.suppliers || []).length !== prev;
    } catch (err: any) {
      if (!silent) toast({ title: 'Failed to load suppliers', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [suppliers.length, toast]);

  useSmartPolling(fetchAll, { baseInterval: 60_000, maxInterval: 300_000 });

  // ── Supplier CRUD ──────────────────────────────────────────────────────────
  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({ name: '', contactName: '', phone: '', email: '', address: '', paymentTerms: '', notes: '' });
    setShowSupplierModal(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name, contactName: s.contactName || '', phone: s.phone || '',
      email: s.email || '', address: s.address || '',
      paymentTerms: s.paymentTerms || '', notes: s.notes || ''
    });
    setShowSupplierModal(true);
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' }); return;
    }
    setSavingSupplier(true);
    try {
      if (editingSupplier) {
        await suppliersApi.updateSupplier(editingSupplier._id, supplierForm);
        toast({ title: 'Supplier updated' });
      } else {
        await suppliersApi.createSupplier(supplierForm);
        toast({ title: 'Supplier added' });
      }
      setShowSupplierModal(false);
      fetchAll(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSavingSupplier(false); }
  };

  const deleteSupplier = async (s: Supplier) => {
    if (!confirm(`Delete "${s.name}"? All delivery history will be lost.`)) return;
    try {
      await suppliersApi.deleteSupplier(s._id);
      toast({ title: 'Supplier deleted' });
      fetchAll(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ── Stock-in ───────────────────────────────────────────────────────────────
  const openStockIn = (s: Supplier) => {
    setStockInSupplier(s);
    setStockInForm({
      date: new Date().toISOString().split('T')[0],
      referenceNo: '', notes: '', paymentStatus: 'unpaid', amountPaid: ''
    });
    setStockInItems([{ productId: '', productName: '', quantity: '', unitCost: '' }]);
    setShowStockInModal(true);
  };

  const addStockInRow = () =>
    setStockInItems(prev => [...prev, { productId: '', productName: '', quantity: '', unitCost: '' }]);

  const removeStockInRow = (idx: number) =>
    setStockInItems(prev => prev.filter((_, i) => i !== idx));

  const updateStockInRow = (idx: number, field: string, value: string) => {
    setStockInItems(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [field]: value };
      // Auto-fill unit cost from product's purchase price
      if (field === 'productId') {
        const prod = products.find(p => p._id === value);
        if (prod) {
          updated.productName = prod.name;
          updated.unitCost = String(prod.purchasePrice || '');
        }
      }
      return updated;
    }));
  };

  const saveStockIn = async () => {
    if (!stockInSupplier) return;
    const validItems = stockInItems.filter(r => r.productId && r.quantity && r.unitCost);
    if (validItems.length === 0) {
      toast({ title: 'Add at least one product', variant: 'destructive' }); return;
    }
    setSavingStockIn(true);
    try {
      const payload = {
        ...stockInForm,
        amountPaid: Number(stockInForm.amountPaid) || 0,
        items: validItems.map(r => ({
          productId: r.productId,
          productName: r.productName,
          quantity: Number(r.quantity),
          unitCost: Number(r.unitCost)
        }))
      };
      const res = await suppliersApi.recordStockIn(stockInSupplier._id, payload);
      toast({ title: 'Stock-in recorded ✓', description: res.message });
      setShowStockInModal(false);
      fetchAll(true);
      // Notify inventory page
      localStorage.setItem('product-updated', Date.now().toString());
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSavingStockIn(false); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactName || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search)
  );

  const stockInTotal = stockInItems.reduce((sum, r) => {
    const qty = Number(r.quantity) || 0;
    const cost = Number(r.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />My Suppliers
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Track your stock suppliers, record deliveries, and monitor what you owe
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => fetchAll(false)} className="h-9 gap-1.5">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={openAddSupplier}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-9 gap-1.5">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Supplier</span><span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {suppliers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Suppliers</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">{suppliers.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Spent</p>
              <p className="text-lg font-extrabold text-gray-900 mt-1 truncate">
                {fmt(suppliers.reduce((s, x) => s + x.totalSpent, 0))}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Outstanding</p>
              <p className="text-lg font-extrabold text-red-600 mt-1 truncate">
                {fmt(suppliers.reduce((s, x) => s + x.totalOwed, 0))}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by name, contact, or phone…"
              value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </CardContent>
      </Card>

      {/* Supplier list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-gray-400">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">No suppliers yet</p>
            <p className="text-sm mt-1">Add your first supplier to start tracking stock deliveries</p>
            <Button size="sm" onClick={openAddSupplier} className="mt-4 gap-1.5">
              <Plus className="w-4 h-4" />Add Supplier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(supplier => {
            const isExpanded = expanded === supplier._id;
            return (
              <Card key={supplier._id} className="border-0 shadow-sm">
                {/* Supplier row */}
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">{supplier.name.charAt(0).toUpperCase()}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{supplier.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                        {supplier.contactName && <span>{supplier.contactName}</span>}
                        {supplier.phone && <span>{supplier.phone}</span>}
                        {supplier.paymentTerms && <span className="text-blue-600">{supplier.paymentTerms}</span>}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="flex gap-4 text-right shrink-0">
                      <div>
                        <p className="text-xs text-gray-400">Spent</p>
                        <p className="font-bold text-sm text-gray-900">{fmt(supplier.totalSpent)}</p>
                      </div>
                      {supplier.totalOwed > 0 && (
                        <div>
                          <p className="text-xs text-gray-400">Owed</p>
                          <p className="font-bold text-sm text-red-600">{fmt(supplier.totalOwed)}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" onClick={() => openStockIn(supplier)}
                        className="h-8 bg-green-600 hover:bg-green-700 text-white gap-1 text-xs px-2">
                        <Package className="w-3.5 h-3.5" />Stock In
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditSupplier(supplier)} className="h-8 w-8 p-0">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteSupplier(supplier)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <button onClick={() => setExpanded(isExpanded ? null : supplier._id)}
                        className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: delivery history */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <SupplierHistory supplierId={supplier._id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit Supplier Modal ── */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-gray-900">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button onClick={() => setShowSupplierModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Supplier / Business Name *</Label>
                <Input value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Kariakoo Wholesalers" className="mt-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Contact Person</Label>
                  <Input value={supplierForm.contactName} onChange={e => setSupplierForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder="Name" className="mt-1" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+255 7XX XXX XXX" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={supplierForm.email} onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="supplier@example.com" className="mt-1" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={supplierForm.address} onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Street, City" className="mt-1" />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Input value={supplierForm.paymentTerms} onChange={e => setSupplierForm(f => ({ ...f, paymentTerms: e.target.value }))}
                  placeholder="e.g. Cash on delivery, 30 days credit" className="mt-1" />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={supplierForm.notes} onChange={e => setSupplierForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional notes" className="mt-1" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowSupplierModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                  disabled={savingSupplier} onClick={saveSupplier}>
                  {savingSupplier ? 'Saving…' : editingSupplier ? 'Save Changes' : 'Add Supplier'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock-In Modal ── */}
      {showStockInModal && stockInSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />Record Stock Delivery
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Supplier: {stockInSupplier.name}</p>
              </div>
              <button onClick={() => setShowStockInModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Delivery meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Delivery Date</Label>
                  <Input type="date" value={stockInForm.date}
                    onChange={e => setStockInForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Reference / Invoice No.</Label>
                  <Input value={stockInForm.referenceNo}
                    onChange={e => setStockInForm(f => ({ ...f, referenceNo: e.target.value }))}
                    placeholder="e.g. INV-2024-001" className="mt-1" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Products Received</Label>
                  <Button size="sm" variant="outline" onClick={addStockInRow} className="h-7 gap-1 text-xs">
                    <Plus className="w-3 h-3" />Add row
                  </Button>
                </div>

                <div className="space-y-2">
                  {/* Header */}
                  <div className="hidden sm:grid grid-cols-[1fr_80px_100px_32px] gap-2 text-xs text-gray-400 font-medium px-1">
                    <span>Product</span><span>Qty</span><span>Unit Cost (TZS)</span><span />
                  </div>

                  {stockInItems.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_70px_90px_32px] gap-2 items-center">
                      <select
                        value={row.productId}
                        onChange={e => updateStockInRow(idx, 'productId', e.target.value)}
                        className="h-9 px-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
                      >
                        <option value="">Select product…</option>
                        {products.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                      <Input type="number" min="1" placeholder="Qty"
                        value={row.quantity} onChange={e => updateStockInRow(idx, 'quantity', e.target.value)}
                        className="h-9 text-sm" />
                      <Input type="number" min="0" placeholder="Cost"
                        value={row.unitCost} onChange={e => updateStockInRow(idx, 'unitCost', e.target.value)}
                        className="h-9 text-sm" />
                      <button onClick={() => removeStockInRow(idx)} disabled={stockInItems.length === 1}
                        className="h-9 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Running total */}
                <div className="flex justify-end mt-3">
                  <div className="bg-gray-50 rounded-xl px-4 py-2 text-sm">
                    <span className="text-gray-500">Delivery total: </span>
                    <span className="font-extrabold text-gray-900">{fmt(stockInTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Payment Status</Label>
                  <select value={stockInForm.paymentStatus}
                    onChange={e => setStockInForm(f => ({ ...f, paymentStatus: e.target.value as any }))}
                    className="mt-1 w-full h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial payment</option>
                    <option value="paid">Fully paid</option>
                  </select>
                </div>
                {stockInForm.paymentStatus !== 'unpaid' && (
                  <div>
                    <Label>Amount Paid (TZS)</Label>
                    <Input type="number" min="0" value={stockInForm.amountPaid}
                      onChange={e => setStockInForm(f => ({ ...f, amountPaid: e.target.value }))}
                      placeholder="0" className="mt-1" />
                  </div>
                )}
              </div>

              <div>
                <Label>Notes</Label>
                <Input value={stockInForm.notes}
                  onChange={e => setStockInForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any notes about this delivery" className="mt-1" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowStockInModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={savingStockIn} onClick={saveStockIn}>
                  {savingStockIn ? 'Saving…' : 'Record Delivery'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── SupplierHistory sub-component ─────────────────────────────────────────────
// Loads full supplier data (with stockIns) on demand when expanded

function SupplierHistory({ supplierId }: { supplierId: string }) {
  const [data, setData] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    suppliersApi.getSupplier(supplierId)
      .then(res => setData(res.supplier))
      .catch(err => toast({ title: 'Failed to load history', description: err.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />;
  if (!data?.stockIns?.length) return (
    <div className="text-center py-6 text-gray-400 text-sm">
      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
      No deliveries recorded yet
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Delivery History ({data.stockIns.length})
      </p>
      {[...data.stockIns].reverse().map(si => {
        const cfg = PAYMENT_STATUS[si.paymentStatus] || PAYMENT_STATUS.unpaid;
        const Icon = cfg.icon;
        return (
          <div key={si._id} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{fmtDate(si.date)}</p>
                {si.referenceNo && <p className="text-xs text-gray-400 font-mono">{si.referenceNo}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                  <Icon className="w-3 h-3" />{cfg.label}
                </span>
                <p className="font-extrabold text-sm text-gray-900">{fmt(si.totalCost)}</p>
              </div>
            </div>
            <div className="space-y-1">
              {si.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-600">
                  <span className="truncate max-w-[60%]">{item.productName}</span>
                  <span>{item.quantity} × {fmt(item.unitCost)} = <strong>{fmt(item.totalCost)}</strong></span>
                </div>
              ))}
            </div>
            {si.notes && <p className="text-xs text-gray-400 italic">{si.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}
