import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, ShoppingBag, User, Phone, Mail,
  MapPin, MessageSquare, Banknote, CreditCard, Smartphone, Package
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/useToast';
import type { CartLine } from './Cart';

const BASE = import.meta.env.VITE_API_URL || '';
const imgUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${BASE}${url}`;
  return url;
};

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash on delivery', icon: Banknote, desc: 'Pay when you receive your order' },
  { id: 'mobile', label: 'Mobile money', icon: Smartphone, desc: 'M-Pesa, Tigo Pesa, Airtel Money' },
  { id: 'card', label: 'Card payment', icon: CreditCard, desc: 'Visa, Mastercard' },
];

export default function Checkout() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [invoices, setInvoices] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [info, setInfo] = useState({ name: '', email: '', phone: '', address: '', city: '', notes: '' });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart');
      if (raw) { setCart(JSON.parse(raw)); }
      else { navigate('/cart'); }
    } catch { navigate('/cart'); }
  }, [navigate]);

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const set = (k: keyof typeof info) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInfo(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info.name.trim() || !info.phone.trim()) {
      toast({ title: 'Required fields missing', description: 'Please enter your name and phone number', variant: 'destructive' });
      return;
    }
    if (cart.length === 0) { toast({ title: 'Cart is empty', variant: 'destructive' }); return; }

    try {
      setProcessing(true);
      const res = await fetch(`${BASE}/api/public/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ product: i._id, quantity: i.quantity })),
          paymentMethod,
          customer: { name: info.name, email: info.email, phone: info.phone, address: info.address, city: info.city },
          notes: info.notes
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || payload.error || 'Checkout failed');

      const invs: string[] = payload.invoiceNumbers || (payload.sales || []).map((s: any) => s.invoiceNumber).filter(Boolean);
      setInvoices(invs);
      setOrderComplete(true);
      localStorage.removeItem('cart');
      localStorage.setItem('sale-created', Date.now().toString());
      window.dispatchEvent(new Event('sale-created'));
    } catch (err: any) {
      toast({ title: 'Order failed', description: err?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  /* ── Success screen ── */
  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Order confirmed!</h2>
          <p className="text-gray-500 mb-6">Thank you, {info.name}. We'll be in touch shortly.</p>

          <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
                {invoices.length > 1 ? 'Invoice numbers' : 'Invoice number'}
              </p>
              {invoices.map(inv => (
                <p key={inv} className="font-mono font-bold text-blue-600 text-sm">{inv}</p>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Total paid</p>
              <p className="text-2xl font-extrabold text-gray-900">TZS {total.toLocaleString()}</p>
            </div>
            {info.phone && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Contact</p>
                <p className="text-sm text-gray-700">{info.phone}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/store')}>
              <ShoppingBag className="w-4 h-4 mr-2" />Keep shopping
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600" onClick={() => navigate('/store')}>
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Checkout form ── */
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/cart" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to cart</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
          <div className="text-sm text-gray-500 font-medium">TZS {total.toLocaleString()}</div>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 text-sm">
          <span className="text-gray-400">Cart</span>
          <span className="text-gray-300">›</span>
          <span className="font-semibold text-blue-600">Checkout</span>
          <span className="text-gray-300">›</span>
          <span className="text-gray-400">Confirmation</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: form */}
            <div className="lg:col-span-3 space-y-6">
              {/* Contact */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />Contact information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <Input value={info.name} onChange={set('name')} placeholder="e.g. Amina Hassan" required className="h-11" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input value={info.phone} onChange={set('phone')} placeholder="+255 7xx xxx xxx" className="pl-9 h-11" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input type="email" value={info.email} onChange={set('email')} placeholder="you@example.com" className="pl-9 h-11" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />Delivery details
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Street address</label>
                    <Input value={info.address} onChange={set('address')} placeholder="e.g. Msasani Road, Plot 12" className="h-11" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">City / Area</label>
                    <Input value={info.city} onChange={set('city')} placeholder="e.g. Dar es Salaam" className="h-11" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />Order notes
                    </label>
                    <textarea
                      value={info.notes}
                      onChange={set('notes')}
                      placeholder="Any special instructions for the seller…"
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />Payment method
                </h2>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map(m => (
                    <label key={m.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === m.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                      <input type="radio" name="payment" value={m.id} checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} className="sr-only" />
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === m.id ? 'bg-blue-600' : 'bg-gray-100'}`}>
                        <m.icon className={`w-5 h-5 ${paymentMethod === m.id ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${paymentMethod === m.id ? 'text-blue-700' : 'text-gray-900'}`}>{m.label}</p>
                        <p className="text-xs text-gray-500">{m.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === m.id ? 'border-blue-600' : 'border-gray-300'}`}>
                        {paymentMethod === m.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: summary */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
                <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />Order summary
                </h2>

                <div className="space-y-3 mb-5 max-h-64 overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div key={item._id} className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        {item.image
                          ? <img src={imgUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">img</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.storeName} · ×{item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 shrink-0">TZS {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2 mb-5">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal ({itemCount} items)</span>
                    <span>TZS {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Delivery</span>
                    <span className="text-green-600 font-medium">Arranged with seller</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                    <span>Total</span>
                    <span className="text-blue-600 text-xl">TZS {total.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={processing}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl"
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing…
                    </span>
                  ) : `Place order · TZS ${total.toLocaleString()}`}
                </Button>
                <p className="text-xs text-gray-400 text-center mt-3">
                  By placing this order you agree to our terms of service
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
