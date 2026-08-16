import { useState, useEffect } from 'react';
import ordersApi from '../api/orders';
import api from '../api/api';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function MyOrders() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('customerAccessToken'));
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => { if (token) fetchOrders(token); }, [token]);

  const fetchOrders = async (tkn: string) => {
    setLoading(true);
    try {
      const res = await ordersApi.getMyOrders(undefined, tkn);
      const list = res?.orders || res?.data?.orders || [];
      setOrders(list);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally { setLoading(false); }
  };

  const handleLogin = async () => {
    try {
      const res = await api.post('/api/customer-auth/login', { email, password });
      const tkn = res.data?.data?.token || res.data?.token || res.data?.accessToken;
      if (!tkn) throw new Error('No token returned');
      localStorage.setItem('customerAccessToken', tkn);
      setToken(tkn);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  const logout = () => { localStorage.removeItem('customerAccessToken'); setToken(null); setOrders([]); };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>My Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Sign in to view your orders.</p>
              <Input placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={handleLogin}>Sign in</Button>
                <Button variant="outline" onClick={() => navigate('/track')}>Track by invoice</Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div />
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={logout}>Sign out</Button>
                </div>
              </div>
              {loading ? <p>Loading…</p> : (
                orders.length === 0 ? <p className="text-sm text-gray-500">No orders found.</p> : (
                  <div className="space-y-3">
                    {orders.map((o: any) => (
                      <div key={o._id} className="p-3 border rounded-md flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{o.invoiceNumber || o.orderNumber}</div>
                          <div className="text-sm text-gray-600">Status: {o.deliveryStatus || o.status} — Payment: {o.paymentStatus}</div>
                        </div>
                        <div>
                          <Link to={`/customer/orders/${o._id}`} className="text-blue-600">View</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
