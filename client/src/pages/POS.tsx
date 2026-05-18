import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Store, ShoppingCart, Search, Plus, Minus, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import * as productsApi from '../api/products';
import * as salesApi from '../api/sales';
import { useSmartPolling } from '../hooks/useSmartPolling';

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
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const { toast } = useToast();

  const fetchProducts = useCallback(async (silent = false): Promise<boolean> => {
    try {
      if (!silent) setLoading(true);
      const response = await productsApi.getProducts();
      const productsList = Array.isArray(response?.products)
        ? response.products
        : Array.isArray(response?.data)
          ? response.data
          : [];
      const hasChanged = productsList.length !== products.length;
      setProducts(productsList);
      return hasChanged;
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
      return false;
    } finally {
      setLoading(false);
    }
  }, [products.length]);

  // Smart polling: 30s base, backs off to 5min when stock unchanged,
  // pauses when tab hidden, refreshes immediately on tab focus
  useSmartPolling(fetchProducts, { baseInterval: 30_000, maxInterval: 300_000 });

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
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        {/* Cart badge — mobile only */}
        <button
          className="lg:hidden relative p-2 rounded-xl bg-blue-600 text-white"
          onClick={() => setMobileTab(mobileTab === 'cart' ? 'products' : 'cart')}
          aria-label="Toggle cart"
        >
          <ShoppingCart className="w-5 h-5" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Mobile tab bar */}
      <div className="flex lg:hidden gap-1 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setMobileTab('products')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mobileTab === 'products' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}
        >
          Products
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${mobileTab === 'cart' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}
        >
          Cart
          {cart.length > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Products Section */}
        <div className={`lg:col-span-7 space-y-3 min-w-0 ${mobileTab === 'cart' ? 'hidden lg:block' : 'block'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search products by name, code, or barcode…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 text-base"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto max-h-[calc(100dvh-220px)]">
            {loading ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <p>Loading products…</p>
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
                    className="cursor-pointer hover:shadow-lg transition-shadow border-0 shadow-md active:scale-95"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-3">
                      {imageUrl ? (
                        <img
                          src={resolveProductImageUrl(imageUrl)}
                          alt={product.name}
                          className="w-full aspect-square object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-2 flex items-center justify-center">
                          <ShoppingCart className="w-8 h-8 text-blue-600" />
                        </div>
                      )}
                      <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{product.category || 'No category'}</p>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-sm font-bold text-blue-600">TZS {product.price.toLocaleString()}</span>
                        <span className="text-xs text-gray-400">×{product.stock || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className={`lg:col-span-5 min-w-0 ${mobileTab === 'products' ? 'hidden lg:block' : 'block'}`}>
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="w-5 h-5" />Current Sale
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="space-y-2 overflow-y-auto max-h-[40vh] lg:max-h-[50vh]">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Cart is empty</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item._id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">TZS {item.price.toLocaleString()} each</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(item._id, -1)} className="h-7 w-7 p-0">
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(item._id, 1)} className="h-7 w-7 p-0">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-bold shrink-0 min-w-[70px] text-right">
                        TZS {(item.price * item.quantity).toLocaleString()}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => removeFromCart(item._id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">TZS {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-blue-600">TZS {total.toLocaleString()}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-base font-semibold"
              >
                Checkout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
