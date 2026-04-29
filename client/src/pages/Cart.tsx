import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Trash2, ArrowLeft, Store as StoreIcon, ExternalLink, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/useToast';
import type { MarketplaceCartLine } from './Store';

export type CartLine = MarketplaceCartLine;

const BASE = import.meta.env.VITE_API_URL || '';
const imgUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${BASE}${url}`;
  return url;
};

export default function Cart() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart');
      if (raw) setCart(JSON.parse(raw));
    } catch { setCart([]); }
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; slug?: string | null; items: CartLine[] }>();
    for (const item of cart) {
      const key = item.storeSlug ? `slug:${item.storeSlug}` : item.storeName ? `name:${item.storeName}` : 'unknown';
      if (!map.has(key)) map.set(key, { label: item.storeName || 'Marketplace', slug: item.storeSlug, items: [] });
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [cart]);

  const save = (next: CartLine[]) => {
    setCart(next);
    localStorage.setItem('cart', JSON.stringify(next));
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) { remove(id); return; }
    save(cart.map(i => i._id === id ? { ...i, quantity: qty } : i));
  };

  const remove = (id: string) => {
    save(cart.filter(i => i._id !== id));
    toast({ title: 'Removed from cart' });
  };

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-12 h-12 text-blue-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added anything yet.</p>
          <Link to="/store">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8">
              <ShoppingBag className="w-4 h-4 mr-2" />Browse marketplace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/store" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Continue shopping</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Cart
            <span className="text-sm font-normal text-gray-400">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
          </h1>
          <div className="w-32" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-6">
            {grouped.map(group => (
              <div key={group.slug || group.label} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Store header */}
                <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <StoreIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    {group.slug ? (
                      <Link to={`/store/${group.slug}`} className="font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-1 text-sm">
                        {group.label}<ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="font-semibold text-gray-900 text-sm">{group.label}</span>
                    )}
                    <p className="text-xs text-gray-400">{group.items.length} {group.items.length === 1 ? 'item' : 'items'}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    TZS {group.items.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString()}
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {group.items.map(item => (
                    <div key={item._id} className="flex gap-4 p-5 items-center">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                        {item.image
                          ? <img src={imgUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><StoreIcon className="w-6 h-6 text-gray-300" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-blue-600 font-bold mt-0.5">TZS {item.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => updateQty(item._id, item.quantity - 1)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                        <button onClick={() => updateQty(item._id, item.quantity + 1)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-right shrink-0 min-w-[90px]">
                        <p className="font-bold text-gray-900">TZS {(item.price * item.quantity).toLocaleString()}</p>
                        <button onClick={() => remove(item._id)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 mt-1 ml-auto transition-colors">
                          <Trash2 className="w-3 h-3" />Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Order summary</h2>
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                  <span>TZS {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery</span>
                  <span className="text-green-600 font-medium">Arranged with seller</span>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-xl text-blue-600">TZS {total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <Button
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => navigate('/checkout')}
              >
                Proceed to checkout
              </Button>
              <p className="text-xs text-gray-400 text-center mt-3">
                {grouped.length > 1 ? `${grouped.length} separate seller orders will be created` : 'Secure checkout'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
