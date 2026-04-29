import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Search, Building2, ExternalLink,
  ChevronLeft, ChevronRight, X, Plus, Minus, Trash2,
  SlidersHorizontal, Sparkles, Store as StoreIcon, Tag
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/useToast';

export interface MarketplaceCartLine {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  storeName?: string;
  storeSlug?: string | null;
  image?: string;
}

interface Product {
  _id: string;
  name: string;
  code: string;
  price: number;
  images: Array<{ url: string; alt?: string; isPrimary?: boolean }>;
  category: string;
  description?: string;
  stock?: number;
  storeName?: string;
  storeSlug?: string | null;
  ownerId?: string;
}

const PAGE_SIZE = 24;
const BASE = import.meta.env.VITE_API_URL || '';

const imgUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${BASE}${url}`;
  return url;
};

/* ─── Cart drawer ─────────────────────────────────────────────────── */
function CartDrawer({
  cart, open, onClose, onUpdate, onRemove
}: {
  cart: MarketplaceCartLine[];
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  return (
    <>
      {/* backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Cart <span className="text-sm font-normal text-gray-500">({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <ShoppingCart className="w-16 h-16 opacity-30" />
            <p className="text-sm">Your cart is empty</p>
            <Button variant="outline" size="sm" onClick={onClose}>Browse products</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cart.map(item => (
                <div key={item._id} className="flex gap-3 items-start">
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    {item.image
                      ? <img src={imgUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><StoreIcon className="w-6 h-6 text-gray-300" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {item.storeName && <p className="text-xs text-gray-400 truncate">{item.storeName}</p>}
                    <p className="text-blue-600 font-bold text-sm mt-1">TZS {item.price.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => onUpdate(item._id, item.quantity - 1)} className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-100">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => onUpdate(item._id, item.quantity + 1)} className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-100">
                        <Plus className="w-3 h-3" />
                      </button>
                      <button onClick={() => onRemove(item._id)} className="ml-auto text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t px-5 py-4 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">TZS {total.toLocaleString()}</span>
              </div>
              <Link to="/checkout" className="block">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-11 text-base font-semibold">
                  Checkout · TZS {total.toLocaleString()}
                </Button>
              </Link>
              <Link to="/cart" className="block">
                <Button variant="outline" className="w-full">View full cart</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─── Product card ────────────────────────────────────────────────── */
function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const image = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url;
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col">
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {image
          ? <img src={imgUrl(image)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><StoreIcon className="w-12 h-12 text-gray-300" /></div>
        }
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded-full">Out of stock</span>
          </div>
        )}
        {product.storeName && (
          <div className="absolute top-2 left-2">
            <span className="bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 px-2 py-1 rounded-full shadow-sm truncate max-w-[120px] block">
              {product.storeName}
            </span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 flex-1">{product.name}</h3>
          {product.storeSlug && (
            <Link to={`/store/${product.storeSlug}`} className="shrink-0 text-gray-400 hover:text-blue-600 transition-colors" title="Visit store">
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        {product.category && (
          <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit mb-2">
            <Tag className="w-3 h-3" />{product.category}
          </span>
        )}
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <span className="text-lg font-bold text-blue-600">TZS {Number(product.price ?? 0).toLocaleString()}</span>
          <button
            onClick={() => onAdd(product)}
            disabled={product.stock === 0}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />Add
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────── */
export default function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState<MarketplaceCartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart');
      if (raw) setCart(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => { setPage(1); }, [selectedCategory]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/public/categories`);
      const d = await r.json().catch(() => ({}));
      if (Array.isArray(d.categories)) setCategories(d.categories);
    } catch { /* optional */ }
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoadError(null);
      setLoading(true);
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page), search: debouncedSearch });
      if (selectedCategory) params.set('category', selectedCategory);
      const r = await fetch(`${BASE}/api/public/products?${params}`);
      const raw = await r.text();
      let d: any = {};
      try { d = raw ? JSON.parse(raw) : {}; } catch {
        setLoadError('Could not read product list. Check VITE_API_URL.');
        setProducts([]); return;
      }
      if (!r.ok) { setLoadError(d.message || d.error || `Error ${r.status}`); setProducts([]); return; }
      setProducts(Array.isArray(d.products) ? d.products : []);
      if (d.pagination) setPagination({ page: d.pagination.page ?? page, limit: d.pagination.limit ?? PAGE_SIZE, total: d.pagination.total ?? 0, pages: d.pagination.pages ?? 0 });
    } catch { setLoadError('Network error.'); setProducts([]); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, selectedCategory]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Listen for product updates
  useEffect(() => {
    const handler = (e: StorageEvent) => { if (e.key === 'product-updated') fetchProducts(); };
    window.addEventListener('storage', handler);
    const t = setInterval(fetchProducts, 60000);
    return () => { window.removeEventListener('storage', handler); clearInterval(t); };
  }, [fetchProducts]);

  const saveCart = (next: MarketplaceCartLine[]) => {
    setCart(next);
    try { localStorage.setItem('cart', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const handleAdd = (product: Product) => {
    const image = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url;
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      const next = existing
        ? prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { _id: product._id, name: product.name, price: product.price, quantity: 1, storeName: product.storeName, storeSlug: product.storeSlug ?? null, image }];
      try { localStorage.setItem('cart', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setCartOpen(true);
    toast({ title: 'Added to cart', description: product.name });
  };

  const handleUpdate = (id: string, qty: number) => {
    if (qty < 1) { saveCart(cart.filter(i => i._id !== id)); return; }
    saveCart(cart.map(i => i._id === id ? { ...i, quantity: qty } : i));
  };

  const handleRemove = (id: string) => saveCart(cart.filter(i => i._id !== id));

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-base font-bold text-gray-900 leading-none">Dukani</p>
              <p className="text-xs text-gray-400 leading-none">Marketplace</p>
            </div>
          </Link>

          {/* Search bar */}
          <div className="flex-1 relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              ref={searchRef}
              placeholder="Search products, stores, categories…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-gray-50 border-gray-200 focus:bg-white"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link to="/stores" className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
              <Building2 className="w-4 h-4" />Stores
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              {pagination.total > 0 ? `${pagination.total.toLocaleString()} products available` : 'All public stores in one place'}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight">
              Shop from every store,<br />all in one feed
            </h1>
            <p className="text-white/80 text-base mb-6">
              Browse products from all active businesses. Visit any store's page for their full catalogue.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/stores">
                <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2">
                  <Building2 className="w-4 h-4" />Browse stores
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category pills ── */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-gray-100 sticky top-[61px] z-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('')}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(prev => prev === cat ? '' : cat)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loadError && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 shrink-0" />{loadError}
          </div>
        )}

        {/* Results bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <p className="text-sm text-gray-500">
            {loading ? 'Loading…' : (
              <>
                <span className="font-semibold text-gray-900">{pagination.total.toLocaleString()}</span> products
                {selectedCategory && <> in <span className="font-semibold text-blue-600 capitalize">{selectedCategory}</span></>}
                {debouncedSearch && <> matching "<span className="font-semibold">{debouncedSearch}</span>"</>}
              </>
            )}
          </p>
          {pagination.pages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />Prev
              </button>
              <span className="text-sm text-gray-500">{page} / {pagination.pages}</span>
              <button
                disabled={page >= pagination.pages || loading}
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next<ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-6 bg-gray-200 rounded w-1/3 mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <StoreIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-600 mb-1">No products found</p>
            <p className="text-sm mb-4">
              {debouncedSearch || selectedCategory ? 'Try different filters' : 'No published products yet. Sellers need an active, public business.'}
            </p>
            {(debouncedSearch || selectedCategory) && (
              <Button variant="outline" onClick={() => { setSearchTerm(''); setSelectedCategory(''); }}>Clear filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map(p => <ProductCard key={p._id} product={p} onAdd={handleAdd} />)}
          </div>
        )}

        {/* Bottom pagination */}
        {pagination.pages > 1 && !loading && (
          <div className="flex justify-center gap-2 mt-10">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="flex items-center gap-1 px-4 py-2 rounded-xl border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-4 h-4" />Previous
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const pg = page <= 3 ? i + 1 : page + i - 2;
              if (pg < 1 || pg > pagination.pages) return null;
              return (
                <button key={pg} onClick={() => setPage(pg)} className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${pg === page ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'}`}>
                  {pg}
                </button>
              );
            })}
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} className="flex items-center gap-1 px-4 py-2 rounded-xl border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors">
              Next<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Cart drawer */}
      <CartDrawer cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} onUpdate={handleUpdate} onRemove={handleRemove} />
    </div>
  );
}
