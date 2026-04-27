import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store as StoreIcon, ShoppingCart, Search } from 'lucide-react';
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
}

export default function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<Array<{_id: string; name: string; price: number; quantity: number}>>([]);
  const { toast } = useToast();

  // Extract username from URL path (e.g., /store/hunter -> hunter)
  const pathname = window.location.pathname;
  const storeSlug = pathname.split('/store/')[1] || '';

  useEffect(() => {
    if (storeSlug) {
      fetchStoreProducts(storeSlug);
    } else {
      // Fallback to public products if no slug
      fetchProducts();
    }
    
    // Listen for product updates from other tabs/components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'product-updated') {
        if (storeSlug) {
          fetchStoreProducts(storeSlug);
        } else {
          fetchProducts();
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Auto-refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      if (storeSlug) {
        fetchStoreProducts(storeSlug);
      } else {
        fetchProducts();
      }
    }, 30000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, [storeSlug]);

  const fetchStoreProducts = async (slug: string) => {
    try {
      setLoading(true);
      // Use individual store endpoint - shows ONLY this user's products
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/store/${slug}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const productList = data.data.products || [];
        setProducts(productList);
        
        // Extract unique categories
        const cats = [...new Set(productList.map((p: any) => p.category).filter(Boolean))] as string[];
        setCategories(cats);
      } else {
        // Store not found or error
        setProducts([]);
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to load store products:', error);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fallback: Use public endpoint that doesn't require authentication
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/products`);
      const data = await response.json();
      const productList = data.products || [];
      setProducts(productList);
      
      // Extract unique categories
      const cats = [...new Set(productList.map((p: any) => p.category).filter(Boolean))] as string[];
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load products:', error);
      // Don't show error toast on public store - just show empty state
      setProducts([]);
      setCategories([]);
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

  const handleAddToCart = (product: Product) => {
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      setCart(cart.map(item => 
        item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { _id: product._id, name: product.name, price: product.price, quantity: 1 }]);
    }
    localStorage.setItem('cart', JSON.stringify([...cart, { _id: product._id, name: product.name, price: product.price, quantity: 1 }]));
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">E-Shop</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">E-Shop</h1>
          </Link>
          <div className="flex items-center gap-3">
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

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Welcome to E-Shop</h2>
          <p className="text-xl mb-8">Discover amazing products at great prices</p>
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
        {/* Filters */}
        <div className="flex gap-4 mb-6 overflow-x-auto">
          <Button
            variant={!selectedCategory ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('')}
            className="whitespace-nowrap"
          >
            All Products
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
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <Card key={product._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    {product.images?.[0]?.url ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || ''}${product.images[0].url}`}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <StoreIcon className="w-16 h-16 text-gray-400" />
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
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {product.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-primary">
                        TZS {product.price.toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product)}
                        className="flex items-center gap-1"
                      >
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
