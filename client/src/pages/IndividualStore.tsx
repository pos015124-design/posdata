import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Store, ShoppingCart, Search, Share2, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { useToast } from '../hooks/useToast';

interface Product {
  _id: string;
  name: string;
  code: string;
  price: number;
  images: Array<{url: string; alt?: string; isPrimary?: boolean; order?: number}>;
  category: string;
  description?: string;
  stock: number;
  isFeatured: boolean;
}

interface Business {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  email?: string;
  phone?: string;
  address?: any;
  socialMedia?: any;
}

export default function IndividualStore() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<Array<{_id: string; name: string; price: number; quantity: number}>>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      fetchStore();
    }
  }, [slug]);

  const fetchStore = async () => {
    try {
      setLoading(true);
      console.log('🏪 Fetching store for slug:', slug);
      const apiUrl = `${import.meta.env.VITE_API_URL || ''}/api/public/store/${slug}`;
      console.log('🏪 API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('🏪 Response status:', response.status);
      
      const data = await response.json();
      console.log('🏪 Store data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load store');
      }

      setBusiness(data.data.business);
      const productList = data.data.products || [];
      setProducts(productList);
      console.log('🏪 Products count:', productList.length);
      
      // Extract unique categories
      const cats = [...new Set(productList.map((p: Product) => p.category).filter(Boolean))] as string[];
      setCategories(cats);
    } catch (error: any) {
      console.error('❌ Failed to load store:', error);
      toast({
        title: 'Error',
        description: error.message || 'Store not found',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => 
          item._id === product._id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { _id: product._id, name: product.name, price: product.price, quantity: 1 }];
    });
    
    toast({
      title: 'Added to cart',
      description: `${product.name} added to your cart`,
    });
  };

  const shareStore = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: business?.name || 'Store',
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied!',
        description: 'Store link copied to clipboard',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading store...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store className="w-24 h-24 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Store Not Found</h2>
          <p className="text-gray-600 mb-6">This store doesn't exist or is not public</p>
          <Link to="/stores">
            <Button>Browse Stores</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {business.logo ? (
                <img 
                  src={`${import.meta.env.VITE_API_URL || ''}${business.logo}`}
                  alt={business.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">E-Shop</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
                {business.description && (
                  <p className="text-sm text-gray-600">{business.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={shareStore} className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Link to="/cart">
                <Button variant="outline" className="flex items-center gap-2 relative">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="hidden sm:inline">Cart</span>
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>

          {/* Contact Info */}
          {(business.email || business.phone || business.address) && (
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm text-gray-600">
              {business.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{business.email}</span>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{business.phone}</span>
                </div>
              )}
              {business.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{business.address.street}, {business.address.city}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Welcome to {business.name}</h2>
          <p className="text-lg mb-6 opacity-90">Browse our products and shop with confidence</p>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg bg-white text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Filters */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          <Button
            variant={!selectedCategory ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('')}
            className="whitespace-nowrap"
          >
            All Products ({products.length})
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedCategory 
                  ? 'Try adjusting your search or filters' 
                  : 'This store hasn\'t published any products yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <Card key={product._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Product Image */}
                <div className="aspect-square bg-gray-100 relative">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL || ''}${product.images[0].url}`}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  {product.isFeatured && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold">
                      Featured
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-white text-gray-900 px-3 py-1 rounded font-semibold">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">
                    Category: {product.category}
                  </p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-2xl font-bold text-blue-600">
                      TZS {product.price.toLocaleString()}
                    </span>
                  </div>
                  
                  {product.stock > 0 && (
                    <Button 
                      className="w-full mt-3 bg-gradient-to-r from-blue-600 to-purple-600"
                      onClick={() => addToCart(product)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p className="mb-2">
            <strong>{business.name}</strong> - Powered by E-Shop
          </p>
          <p className="text-sm">
            Share this store: <button onClick={shareStore} className="text-blue-600 hover:underline inline-flex items-center gap-1">
              {window.location.href} <ExternalLink className="w-3 h-3" />
            </button>
          </p>
        </div>
      </footer>
    </div>
  );
}
