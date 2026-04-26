import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, MapPin, Phone, Mail, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/useToast';
import * as salesApi from '../api/sales';

interface CartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function Checkout() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    notes: ''
  });

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    } else {
      navigate('/cart');
    }
  }, [navigate]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerInfo.name || !customerInfo.phone) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields (Name and Phone)',
        variant: 'destructive',
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: 'Error',
        description: 'Your cart is empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessing(true);

      const orderData = {
        items: cart.map(item => ({
          product: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: total,
        paymentMethod: 'cash',
        customer: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: customerInfo.address,
          city: customerInfo.city
        },
        notes: customerInfo.notes
      };

      const response = await salesApi.createSale(orderData);
      
      setOrderComplete(true);
      setOrderId(response.sale?.orderNumber || response.sale?._id || 'N/A');
      
      // Clear cart
      localStorage.removeItem('cart');
      
      // Notify dashboard and other pages about the new sale
      localStorage.setItem('sale-created', Date.now().toString());
      
      toast({
        title: 'Order Placed!',
        description: `Order #${orderId} has been placed successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to place order',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h2>
          <p className="text-gray-600 mb-6">Thank you for your purchase</p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Order Number</p>
            <p className="text-2xl font-bold text-primary">#{orderId}</p>
          </div>

          <div className="space-y-3">
            <p className="text-gray-600">
              We'll contact you soon with delivery details.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/store')}
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/cart" className="flex items-center gap-2 text-primary">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Cart</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          <div></div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Customer Information */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Customer Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="email"
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                          placeholder="john@example.com"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="tel"
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                          placeholder="+255 xxx xxx xxx"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Address
                    </label>
                    <Input
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                      placeholder="Street address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <Input
                      value={customerInfo.city}
                      onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                      placeholder="Dar es Salaam"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Notes (Optional)
                    </label>
                    <textarea
                      value={customerInfo.notes}
                      onChange={(e) => setCustomerInfo({...customerInfo, notes: e.target.value})}
                      placeholder="Any special instructions..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </h2>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-900 font-medium">Cash on Delivery</p>
                  <p className="text-blue-700 text-sm mt-1">
                    Pay when you receive your order
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item._id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.name} x {item.quantity}
                      </span>
                      <span className="font-medium">
                        TZS {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>TZS {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">TZS {total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-6"
                  size="lg"
                  disabled={processing}
                >
                  {processing ? 'Processing...' : `Place Order - TZS ${total.toLocaleString()}`}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  By placing this order, you agree to our terms and conditions
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
