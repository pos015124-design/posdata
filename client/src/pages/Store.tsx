import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Search, Building2, ExternalLink,
  ChevronLeft, ChevronRight, X, Plus, Minus, Trash2,
  SlidersHorizontal, Store as StoreIcon, Star, ShieldCheck
} from 'lucide-react';
import { Button } from '../components/ui/button';
import Logo from '../components/Logo';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';

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
  isSponsored?: boolean;
  soldCount?: number;
  rating?: number;
}

const PAGE_SIZE = 24;
const BASE = import.meta.env.VITE_API_URL || '';

const imgUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${BASE}${url}`;
  return url;
};

/* ─── Star rating display ─────────────────────────────────────────── */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-3 h-3 ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

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
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Cart
            <span className="text-sm font-normal text-gray-500">
              ({cart.reduce((s, i) => s + i.quantity, 0)} items)
            </span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100" aria-label="Close cart">
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
                    <p className="font-medium text-sm line-clamp-2">{item.name}</p>
                    {item.storeName && <p className="text-xs text-gray-400 truncate">{item.storeName}</p>}
                    <p className="text-blue-600 font-bold text-sm mt-1">TZS {item.price.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onUpdate(item._id, item.quantity - 1)}
                        className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-100"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => onUpdate(item._id, item.quantity + 1)}
                        className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-100"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onRemove(item._id)}
                        className="ml-auto text-gray-400 hover:text-gray-600"
                        aria-label="Remove item"
                      >
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
                <span className="font-bold text-gray-900">TZS {total.toLocaleString()}</span>
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

/* ─── Product card — AliExpress-style ────────────────────────────── */
function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const image = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url;
  const isOutOfStock = product.stock === 0;
  // Use real rating/soldCount if the API provides them; otherwise omit the row entirely
  const hasRating  = typeof product.rating   === 'number' && product.rating   > 0;
  const hasSold    = typeof product.soldCount === 'number' && product.soldCount > 0;

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-200 group flex flex-col border border-gray-100">
      {/* Image area */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {image
          ? <img
              src={imgUrl(image)}
              alt={product.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isOutOfStock ? 'opacity-60' : ''}`}
            />
          : <div className="w-full h-full flex items-center justify-center">
              <StoreIcon className="w-12 h-12 text-gray-200" />
            </div>
        }

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded-full shadow">
              Out of stock
            </span>
          </div>
        )}

        {/* Sponsored badge — top right */}
        {product.isSponsored && (
          <div className="absolute top-2 right-2">
            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
              Sponsored
            </span>
          </div>
        )}

        {/* Store name — top left */}
        {product.storeName && (
          <div className="absolute top-2 left-2 max-w-[55%]">
            <span className="flex items-center gap-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 px-1.5 py-0.5 rounded-full shadow-sm truncate">
              <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" aria-hidden="true" />
              <span className="truncate">{product.storeName}</span>
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col flex-1">
        {/* Product title — clamped to 2 lines */}
        <h3 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 mb-1.5 flex-1">
          {product.name}
        </h3>

        {/* Ratings + sold count row — only rendered when data exists */}
        {(hasRating || hasSold) && (
          <div className="flex items-center gap-2 mb-1.5">
            {hasRating && <StarRating rating={product.rating!} />}
            {hasSold && (
              <span className="text-xs text-gray-400">{product.soldCount!.toLocaleString()}+ sold</span>
            )}
          </div>
        )}

        {/* Price row */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex flex-col">
            <span className="text-base font-black text-blue-600 leading-none">
              TZS {Number(product.price ?? 0).toLocaleString()}
            </span>
            {product.storeSlug && (
              <Link
                to={`/store/${product.storeSlug}`}
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors mt-0.5 truncate max-w-[100px]"
                onClick={e => e.stopPropagation()}
                title="Visit store"
              >
                <ExternalLink className="w-3 h-3 inline mr-0.5" />
                View store
              </Link>
            )}
          </div>
          <button
            onClick={() => onAdd(product)}
            disabled={isOutOfStock}
            aria-label={`Add ${product.name} to cart`}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────── */
export default function Store() {
  const { user } = useAuth();
  const isInsideLayout = !!user;

  const [products,        setProducts]        = useState<Product[]>([]);
  const [pagination,      setPagination]      = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loadError,       setLoadError]       = useState<string | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories,      setCategories]      = useState<string[]>([]);
  const [page,            setPage]            = useState(1);
  const [cart,            setCart]            = useState<MarketplaceCartLine[]>([]);
  const [cartOpen,        setCartOpen]        = useState(false);
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  // Restore cart from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart');
      if (raw) setCart(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => { setPage(1); }, [selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/public/categories`);
      const d = await r.json().catch(() => ({}));
      if (Array.isArray(d.categories)) setCategories(d.categories);
    } catch { /* non-critical */ }
  }, []);

  const fetchProducts = useCallback(async (silent = false) => {
    try {
      setLoadError(null);
      if (!silent) setLoading(true);
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page:  String(page),
        search: debouncedSearch,
      });
      if (selectedCategory) params.set('category', selectedCategory);
      const r   = await fetch(`${BASE}/api/public/products?${params}`);
      const raw = await r.text();
      let d: any = {};
      try { d = raw ? JSON.parse(raw) : {}; } catch {
        setLoadError('Could not read product list. Check VITE_API_URL.');
        setProducts([]); return;
      }
      if (!r.ok) { setLoadError(d.message || d.error || `Error ${r.status}`); setProducts([]); return; }
      setProducts(Array.isArray(d.products) ? d.products : []);
      if (d.pagination) setPagination({
        page:  d.pagination.page  ?? page,
        limit: d.pagination.limit ?? PAGE_SIZE,
        total: d.pagination.total ?? 0,
        pages: d.pagination.pages ?? 0,
      });
    } catch { setLoadError('Network error.'); setProducts([]); }
    finally  { setLoading(false); }
  }, [page, debouncedSearch, selectedCategory]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchProducts();   }, [fetchProducts]);

  useEffect(() => {
    const handler = (e: StorageEvent) => { if (e.key === 'product-updated') fetchProducts(true); };
    window.addEventListener('storage', handler);
    const t = setInterval(() => fetchProducts(true), 300_000);
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
        : [...prev, {
            _id: product._id,
            name: product.name,
            price: product.price,
            quantity: 1,
            storeName: product.storeName,
            storeSlug: product.storeSlug ?? null,
            image,
          }];
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
    <div className={isInsideLayout ? '' : 'min-h-screen bg-gray-50'}>

      {/* ── Guest navbar — compact, search-first ── */}
      {!isInsideLayout && (
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-3">
            <Link to="/" className="shrink-0" aria-label="Home">
              <Logo className="h-8" />
            </Link>

            {/* Search bar — centre, grows to fill */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <Input
                ref={searchRef}
                placeholder="Search products, stores…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                aria-label="Search products"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Stores link + cart button */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/stores"
                className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Stores
              </Link>
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                aria-label={`Cart, ${cartCount} items`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ── Category pills — sticky search + pills bar for authenticated layout ── */}
      {isInsideLayout && (
        <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
          <div className="px-0 pt-3 pb-0 flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <Input
                ref={searchRef}
                placeholder="Search products, stores…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                aria-label="Search products"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shrink-0"
              aria-label={`Cart, ${cartCount} items`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
          {/* Inline category pills when inside layout */}
          {categories.length > 0 && (
            <div
              className="flex gap-2 overflow-x-auto py-2.5 scrollbar-hide"
              role="list"
              aria-label="Product categories"
            >
              <button
                onClick={() => setSelectedCategory('')}
                role="listitem"
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  !selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(prev => prev === cat ? '' : cat)}
                  role="listitem"
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize ${
                    selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Guest hero — compact on mobile, hidden when category pills shown ── */}
      {!isInsideLayout && (
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-1">
                Tanzania's Local Marketplace
              </p>
              <h1 className="text-xl sm:text-3xl font-extrabold leading-tight">
                Everything in one place
              </h1>
              {pagination.total > 0 && (
                <p className="text-sm text-blue-100 mt-1">
                  {pagination.total.toLocaleString()} products from verified local sellers
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link to="/stores">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-1.5"
                >
                  <Building2 className="w-4 h-4" />Browse stores
                </Button>
              </Link>
              {cartCount > 0 && (
                <Button
                  onClick={() => setCartOpen(true)}
                  size="sm"
                  className="bg-white text-blue-700 hover:bg-white/90 gap-1.5 font-semibold"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Cart ({cartCount})
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Guest category pills — sticky below navbar ── */}
      {!isInsideLayout && categories.length > 0 && (
        <div className="bg-white border-b border-gray-100 sticky top-14 z-20">
          <div className="max-w-7xl mx-auto px-4">
            <div
              className="flex gap-2 overflow-x-auto py-2.5 scrollbar-hide"
              role="list"
              aria-label="Product categories"
            >
              <button
                onClick={() => setSelectedCategory('')}
                role="listitem"
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  !selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(prev => prev === cat ? '' : cat)}
                  role="listitem"
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize ${
                    selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main product grid ── */}
      <div className={`py-4 ${isInsideLayout ? '' : 'max-w-7xl mx-auto px-3 sm:px-4'}`}>
        {loadError && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            {loadError}
          </div>
        )}

        {/* Results count + pagination controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-xs text-gray-500">
            {loading ? 'Loading…' : (
              <>
                <span className="font-semibold text-gray-900">{pagination.total.toLocaleString()}</span> products
                {selectedCategory && (
                  <> in <span className="font-semibold text-blue-600 capitalize">{selectedCategory}</span></>
                )}
                {debouncedSearch && (
                  <> for "<span className="font-semibold">{debouncedSearch}</span>"</>
                )}
              </>
            )}
          </p>
          {pagination.pages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />Prev
              </button>
              <span className="text-xs text-gray-500">{page} / {pagination.pages}</span>
              <button
                disabled={page >= pagination.pages || loading}
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next<ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse border border-gray-100">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-5 bg-blue-50 rounded w-2/5 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <StoreIcon className="w-14 h-14 mx-auto mb-4 opacity-30" />
            <p className="text-base font-semibold text-gray-600 mb-1">No products found</p>
            <p className="text-sm mb-4">
              {debouncedSearch || selectedCategory
                ? 'Try a different search term or category.'
                : 'Sellers are setting up their stores. Check back soon.'}
            </p>
            {(debouncedSearch || selectedCategory) && (
              <Button variant="outline" onClick={() => { setSearchTerm(''); setSelectedCategory(''); }}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map(p => <ProductCard key={p._id} product={p} onAdd={handleAdd} />)}
          </div>
        )}

        {/* Bottom pagination */}
        {pagination.pages > 1 && !loading && (
          <div className="flex justify-center gap-1.5 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />Previous
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const pg = page <= 3 ? i + 1 : page + i - 2;
              if (pg < 1 || pg > pagination.pages) return null;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  aria-current={pg === page ? 'page' : undefined}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                    pg === page ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Cart drawer */}
      <CartDrawer
        cart={cart}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
      />

      {/* ── Mobile bottom nav — guests only ── */}
      {!isInsideLayout && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg" aria-label="Mobile navigation">
          <div className="flex items-center justify-around h-16 px-2">
            <Link to="/store" className="flex flex-col items-center gap-1 px-4 py-2 text-blue-600">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-xs font-semibold">Shop</span>
            </Link>
            <Link to="/stores" className="flex flex-col items-center gap-1 px-4 py-2 text-gray-500 hover:text-blue-600 transition-colors">
              <StoreIcon className="w-5 h-5" />
              <span className="text-xs font-medium">Stores</span>
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              className="flex flex-col items-center gap-1 px-4 py-2 text-gray-500 hover:text-blue-600 transition-colors relative"
              aria-label={`Cart, ${cartCount} items`}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-3 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
              <span className="text-xs font-medium">Cart</span>
            </button>
          </div>
        </nav>
      )}

      {!isInsideLayout && <div className="h-16 sm:hidden" aria-hidden="true" />}

      {!isInsideLayout && (
        <div className="sm:hidden pb-20 pt-4 text-center">
          <Link to="/login" className="text-xs text-gray-300 hover:text-gray-400 transition-colors">
            Seller / Admin Portal
          </Link>
        </div>
      )}
    </div>
  );
}
