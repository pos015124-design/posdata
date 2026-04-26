import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Store, ShoppingCart, Search, Plus, Minus, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import * as sellerInventoryApi from '../api/sellerInventory';
import * as salesApi from '../api/sales';

export default function POS() {
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSellerInventory();
    
    // Listen for product updates from inventory
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'product-updated') {
        fetchSellerInventory(); // Refresh POS products when inventory changes
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Auto-refresh every 20 seconds for real-time updates
    const refreshInterval = setInterval(fetchSellerInventory, 20000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchSellerInventory = async () => {
    try {
      setLoading(true);
      const response = await sellerInventoryApi.getSellerInventory();
      setInventoryItems(response.inventory || []);
      setSellerInfo(response.seller || null);
    } catch (error) {
      console.error('Failed to fetch seller inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Transform inventory items to products with seller-specific pricing
  const products = inventoryItems.map((item: any) => ({
    _id: item.product?._id || item._id,
    inventoryId: item._id,
    name: item.product?.name || 'Unknown Product',
    code: item.product?.code || '',
    barcode: item.barcode || item.product?.barcode || '',
    price: item.price,
    stock: item.stock,
    category: item.product?.category || '',
    images: item.product?.images || []
  }));

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
          inventory: item.inventoryId,
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
      fetchSellerInventory(); // Refresh inventory to update stock
      
      // Notify dashboard and other pages about the new sale
      localStorage.setItem('sale-created', Date.now().toString());
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to complete sale',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] p-6 grid grid-cols-12 gap-6">
      {/* Products Section */}
      <div className="col-span-7 space-y-4">
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
          {sellerInfo && (
            <p className="text-sm text-gray-600 mt-2">
              Seller: <span className="font-semibold">{sellerInfo.name}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
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
                      src={imageUrl.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || ''}${imageUrl}` : imageUrl}
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
      <div className="col-span-5">
        <Card className="h-full border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Current Sale
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '400px' }}>
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>Cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
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
                    <span className="w-24 text-right font-bold">TZS {(item.price * item.quantity).toLocaleString()}</span>
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
