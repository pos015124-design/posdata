import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Store, ShoppingCart, Search, Plus, Minus, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import * as productsApi from '../api/products';
import * as salesApi from '../api/sales';

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

export default function POS() {
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  console.log('POS v2.0 - Using products API (not seller inventory)');

  useEffect(() => {
    fetchProducts();
    
    // Listen for product updates from inventory
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'product-updated') {
        fetchProducts(); // Refresh POS products when inventory changes
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Auto-refresh every 20 seconds for real-time updates
    const refreshInterval = setInterval(fetchProducts, 20000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getProducts();
      // Handle different response structures
      const productsList = Array.isArray(response?.products) 
        ? response.products 
        : Array.isArray(response?.data) 
          ? response.data 
          : [];
      setProducts(productsList);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: any) => {
    const existing = cart.find((item) => item._id === product._id);
    if (existing) {
      setCart(cart.map((item) => 
        item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast({
      title: 'Added',
      description: `${product.name} added to cart`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item._id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item._id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Error',
        description: 'Cart is empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      const saleData = {
        items: cart.map(item => ({
          product: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: total,
        paymentMethod: 'cash'
      };

      await salesApi.createSale(saleData);
      
      toast({
        title: 'Success',
        description: `Sale completed! Total: TZS ${total.toLocaleString()}`,
      });
      setCart([]);
      fetchProducts(); // Refresh products to update stock
      
      // Notify dashboard and other pages about the new sale
      localStorage.setItem('sale-created', Date.now().toString());
      
      // Dispatch custom event for same-tab listeners
      window.dispatchEvent(new Event('sale-created'));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to complete sale',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-3 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 min-h-[calc(100vh-2rem)]">
      {/* Products Section */}
      <div className="lg:col-span-7 space-y-4 min-w-0">
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search products by name, code, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <p>Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <p>No products found</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0];
              const imageUrl = primaryImage?.url;
              
              return (
              <Card
                key={product._id}
                className="cursor-pointer hover:shadow-lg transition-shadow border-0 shadow-md"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4">
                  {imageUrl ? (
                    <img
                      src={resolveProductImageUrl(imageUrl)}
                      alt={product.name}
                      className="w-full aspect-square object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-blue-600" />
                    </div>
                  )}
                  <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{product.category || 'No category'}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-lg font-bold text-blue-600">TZS {product.price.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">Stock: {product.stock || 0}</span>
                  </div>
                </CardContent>
              </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="lg:col-span-5 min-w-0">
        <Card className="h-auto lg:h-full border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Current Sale
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 space-y-4">
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '50vh' }}>
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>Cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item._id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">TZS {item.price.toLocaleString()} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item._id, -1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item._id, 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="sm:w-24 text-left sm:text-right font-bold">TZS {(item.price * item.quantity).toLocaleString()}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(item._id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">TZS {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-blue-600">TZS {total.toLocaleString()}</span>
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg font-semibold"
            >
              Checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
