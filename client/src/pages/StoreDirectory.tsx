import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store, Search, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';

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

export default function StoreDirectory() {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/stores`);
      const data = await response.json();
      setStores(data.data?.stores || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Store Directory</h1>
          <p className="text-gray-600 mt-2">Browse all stores on Dukani</p>
        </div>
      </header>

      {/* Search */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Discover Amazing Stores</h2>
          <p className="text-lg mb-6 opacity-90">Find products from independent sellers</p>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg bg-white text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stores Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading stores...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No stores found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try a different search term' : 'No public stores available yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map(store => (
              <Card key={store._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {store.logo ? (
                      <img 
                        src={`${import.meta.env.VITE_API_URL || ''}${store.logo}`}
                        alt={store.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Store className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">
                        {store.name}
                      </h3>
                      {store.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {store.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mb-3">
                        {store.productCount} product{store.productCount !== 1 ? 's' : ''}
                      </p>
                      <Link to={`/store/${store.slug}`}>
                        <Button size="sm" className="w-full flex items-center gap-2">
                          Visit Store
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
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
