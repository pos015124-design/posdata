import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store, Search, ExternalLink, ShoppingBag, MapPin, Package, ArrowRight, Sparkles } from 'lucide-react';
import { Input } from '../components/ui/input';

const BASE = import.meta.env.VITE_API_URL || '';

interface StoreInfo {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  email?: string;
  category?: string;
  productCount: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  retail:      'bg-blue-100 text-blue-700',
  restaurant:  'bg-orange-100 text-orange-700',
  electronics: 'bg-purple-100 text-purple-700',
  clothing:    'bg-pink-100 text-pink-700',
  health:      'bg-green-100 text-green-700',
  beauty:      'bg-rose-100 text-rose-700',
  automotive:  'bg-gray-100 text-gray-700',
  grocery:     'bg-emerald-100 text-emerald-700',
  services:    'bg-cyan-100 text-cyan-700',
};

function StoreCard({ store }: { store: StoreInfo }) {
  const catColor = CATEGORY_COLORS[store.category || ''] || 'bg-gray-100 text-gray-600';
  return (
    <Link to={`/store/${store.slug}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 h-full flex flex-col">
        {/* Store banner / logo area */}
        <div className="h-24 bg-gradient-to-br from-blue-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-white rounded-t-2xl" />
        </div>

        {/* Logo */}
        <div className="px-5 -mt-6 relative z-10">
          {store.logo ? (
            <img src={`${BASE}${store.logo}`} alt={store.name}
              className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center border-2 border-white shadow-md">
              <Store className="w-7 h-7 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-5 pt-3 pb-5 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-blue-600 transition-colors">
              {store.name}
            </h3>
            <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5" />
          </div>

          {store.category && (
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full w-fit mb-2 capitalize ${catColor}`}>
              {store.category}
            </span>
          )}

          {store.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">{store.description}</p>
          )}

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Package className="w-3.5 h-3.5" />
              <span>{store.productCount} {store.productCount === 1 ? 'product' : 'products'}</span>
            </div>
            <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
              Shop now <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function StoreDirectory() {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch(`${BASE}/api/public/stores`)
      .then(r => r.json())
      .then(d => setStores(d.data?.stores || []))
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = stores.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProducts = stores.reduce((s, st) => s + st.productCount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium mb-5">
              <Sparkles className="w-4 h-4" />
              {stores.length > 0
                ? `${stores.length} verified sellers · ${totalProducts.toLocaleString()} products`
                : 'Verified local sellers'}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
              Shop local.<br />Support real businesses.
            </h1>
            <p className="text-white/80 text-base md:text-lg mb-8 max-w-xl mx-auto">
              Every store on E-Shop is a real Tanzanian business. Browse, compare, and buy directly from the people behind the products.
            </p>
            <div className="max-w-lg mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search stores by name or category…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-12 h-13 text-base bg-white text-gray-900 rounded-xl shadow-lg border-0 h-12"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trust bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 font-medium">
          <span className="flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5 text-blue-500" />Verified sellers only</span>
          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-green-500" />Local Tanzanian businesses</span>
          <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-purple-500" />Real products, real prices</span>
        </div>
      </div>

      {/* Stores grid */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Results count */}
        {!loading && (
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <p className="text-sm text-gray-500">
              {searchTerm
                ? <><span className="font-semibold text-gray-900">{filtered.length}</span> stores match "<span className="font-semibold">{searchTerm}</span>"</>
                : <><span className="font-semibold text-gray-900">{stores.length}</span> stores available</>}
            </p>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-xs text-blue-600 hover:underline">Clear search</button>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-24 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-16 h-16 mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {searchTerm ? 'No stores match your search' : 'No stores yet'}
            </h3>
            <p className="text-gray-400 text-sm">
              {searchTerm ? 'Try a different name or category' : 'Sellers are joining soon. Check back shortly.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(store => <StoreCard key={store._id} store={store} />)}
          </div>
        )}
      </div>

      {/* CTA footer */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white mt-8">
        <div className="max-w-7xl mx-auto px-4 py-10 text-center">
          <h2 className="text-xl font-bold mb-2">Want to sell on E-Shop?</h2>
          <p className="text-white/80 text-sm mb-5">Join hundreds of local sellers reaching customers across Tanzania.</p>
          <Link to="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
            Open your store <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
