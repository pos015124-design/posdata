import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Store as StoreIcon, ShoppingCart, Search, Building2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { useToast } from '../hooks/useToast';

interface Product {
  _id: string;
  name: string;
  code: string;
  price: number;
  images: Array<{ url: string; alt?: string; isPrimary?: boolean; order?: number }>;
  category: string;
  description?: string;
  stock?: number;
  storeName?: string;
  storeSlug?: string | null;
  ownerId?: string;
}

export type MarketplaceCartLine = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  storeName?: string;
  storeSlug?: string | null;
};

const PAGE_SIZE = 24;

const resolveProductImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  if (imageUrl.startsWith('/uploads')) {
    return `${import.meta.env.VITE_API_URL || ''}${imageUrl}`;
  }
  return imageUrl;
};

const baseUrl = import.meta.env.VITE_API_URL || '';

/**
 * `/store` — marketplace (all public stores). `/store/:slug` — one seller (IndividualStore).
 */
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
  const { toast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const selectCategory = (cat: string) => {
    setSelectedCategory(prev => (prev === cat ? '' : cat));
    setPage(1);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/public/categories`);
      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : {};
      if (response.ok && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch {
      /* optional */
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoadError(null);
      setLoading(true);
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
        search: debouncedSearch
      });
      if (selectedCategory) {
        params.set('category', selectedCategory);
      }
      const response = await fetch(`${baseUrl}/api/public/products?${params.toString()}`);
      const raw = await response.text();
      let data: {
        products?: Product[];
        success?: boolean;
        message?: string;
        error?: string;
        pagination?: { total: number; pages: number; limit: number; page: number };
      } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        setLoadError(
          'Could not read product list. If the shop and API are on different hosts, set VITE_API_URL to your API base URL and rebuild the client.'
        );
        setProducts([]);
        setPagination(p => ({ ...p, total: 0, pages: 0 }));
        return;
      }
      if (!response.ok) {
        setLoadError(data.message || data.error || `Failed to load products (${response.status})`);
        setProducts([]);
        return;
      }
      const productList = Array.isArray(data.products) ? data.products : [];
      setProducts(productList);
      const p = data.pagination;
      if (p) {
        setPagination({
          page: p.page ?? page,
          limit: p.limit ?? PAGE_SIZE,
          total: p.total ?? productList.length,
          pages: p.pages ?? 0
        });
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setLoadError('Network error while loading the marketplace.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'product-updated') fetchProducts();
    };
    window.addEventListener('storage', handleStorageChange);
    const refreshInterval = setInterval(() => fetchProducts(), 60000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, [fetchProducts]);

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      const line: MarketplaceCartLine = {
        _id: product._id,
        name: product.name,
        price: Number(product.price ?? 0),
        quantity: 1,
        storeName: product.storeName,
        storeSlug: product.storeSlug ?? undefined
      };
      const next = existing
        ? prev.map(item =>
            item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...prev, line];
      try {
        localStorage.setItem('cart', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart`
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">E-Shop</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Marketplace</h1>
              <p className="text-xs text-gray-500 hidden sm:block">All public stores · Not a single-vendor shop</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <Link
              to="/stores"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Store directory</span>
              <span className="sm:hidden">Stores</span>
            </Link>
            <div className="relative">
              <Link to="/cart">
                <Button variant="outline" className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Cart</span>
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-10 md:py-12">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80 mb-2">Discovery</p>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Shop every public store in one feed</h2>
          <p className="text-white/90 mb-6 max-w-2xl text-sm md:text-base">
            This page lists products from <strong>all active, public</strong> businesses. For one brand only, open that
            store’s URL: <span className="font-mono text-white/95">/store/your-slug</span>.
          </p>
          <div className="max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search products, codes, categories… (server-side)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-12 h-11 md:h-12 text-base bg-white text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loadError && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {loadError}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={!selectedCategory ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedCategory('');
              setPage(1);
            }}
            className="whitespace-nowrap"
          >
            All categories
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-sm text-gray-600">
          <span>
            {loading ? 'Loading…' : `${pagination.total} listings`} {pagination.pages > 1 && `(page ${page} of ${pagination.pages})`}
          </span>
          {pagination.pages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.pages || loading}
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">No products match your filters, or no public listings yet.</p>
            <p className="text-sm mb-4">
              Sellers need an <strong>active</strong>, <strong>public</strong> business and published inventory.
            </p>
            <Link to="/stores" className="text-blue-600 hover:underline text-sm">
              Browse store directory
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <Card key={product._id} className="hover:shadow-lg transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    {product.images?.[0]?.url ? (
                      <img
                        src={resolveProductImageUrl(product.images[0].url)}
                        alt={String(product.name)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <StoreIcon className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                  <div className="p-4">
                    {product.storeName && (
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-500 truncate" title={product.storeName}>
                          {product.storeName}
                        </span>
                        {product.storeSlug && (
                          <Link
                            to={`/store/${product.storeSlug}`}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 shrink-0"
                          >
                            Store <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    )}
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{product.name || 'Product'}</h3>
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                    )}
                    {product.category && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{product.category}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xl font-bold text-blue-600">
                        TZS {Number(product.price ?? 0).toLocaleString()}
                      </span>
                      <Button size="sm" onClick={() => handleAddToCart(product)} className="shrink-0 gap-1">
                        <ShoppingCart className="w-4 h-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
