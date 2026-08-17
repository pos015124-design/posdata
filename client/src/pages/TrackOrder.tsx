import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ordersApi from '../api/orders';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import formatPrice from '../utils/formatPrice';
import StatusBadge from '../components/StatusBadge';

const RECENT_KEY = 'bhabyshop:recent-tracks';

function fmtDate(d?: string | number | null) {
  if (!d) return null;
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === 'string') : [];
  } catch { return []; }
}

function saveRecent(code: string) {
  try {
    const next = [code, ...loadRecent().filter(c => c !== code)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* storage unavailable — non-fatal */ }
}

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const invoiceFromQuery = searchParams.get('invoice') || searchParams.get('code') || '';

  const [invoice, setInvoice] = useState(invoiceFromQuery);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    if (invoiceFromQuery) {
      setInvoice(invoiceFromQuery);
      fetchPublic(invoiceFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceFromQuery]);

  // Close any open stream on unmount
  useEffect(() => {
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  const fetchPublic = async (inv: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await ordersApi.getOrderByInvoicePublic(inv);
      const data = res.data || res.order || res;
      setOrder(data);
      const code = data.trackingCode || data.invoiceNumber || data.orderNumber || inv;
      saveRecent(code);
      setRecent(loadRecent());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Order not found');
      setOrder(null);
    } finally { setLoading(false); }
  };

  const verify = async () => {
    setLoading(true); setError(null);
    try {
      const res = await ordersApi.verifyOrderByInvoice(invoice, email);
      const data = res.data || res.order || res;
      setOrder(data);
      const code = data.trackingCode || data.invoiceNumber || data.orderNumber || invoice;
      saveRecent(code);
      setRecent(loadRecent());
      // Open SSE stream using email verification
      openSSE(invoice, email);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
      setOrder(null);
    } finally { setLoading(false); }
  };

  const openSSE = (inv: string, emailAddr: string) => {
    if (!inv || !emailAddr) return;
    // Close existing
    esRef.current?.close();
    connectedRef.current = false;
    const url = `/api/orders/stream/${encodeURIComponent(inv)}?email=${encodeURIComponent(emailAddr)}`;
    const source = new EventSource(url);
    esRef.current = source;
    source.onopen = () => { connectedRef.current = true; };
    source.onerror = () => {
      // Reconnect only after the stream was actually open (transient blip).
      // Auth failures (403/404) never open, so this avoids an infinite retry loop.
      if (connectedRef.current) {
        source.close();
        setTimeout(() => openSSE(inv, emailAddr), 3000);
      } else {
        source.close();
        esRef.current = null;
      }
    };
    source.addEventListener('delivery:update', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        setOrder((prev: any) => ({ ...prev, deliveryStatus: payload.deliveryStatus || prev?.deliveryStatus, riderName: payload.riderName || prev?.riderName, riderPhone: payload.riderPhone || prev?.riderPhone, assignedAt: payload.assignedAt || prev?.assignedAt, collectedAt: payload.collectedAt || prev?.collectedAt, deliveredAt: payload.deliveredAt || prev?.deliveredAt, deliveryNotes: payload.deliveryNotes || prev?.deliveryNotes }));
      } catch { }
    });
    source.addEventListener('order:status', (e: any) => {
      try { const payload = JSON.parse(e.data); setOrder((prev: any) => ({ ...prev, status: payload.newStatus || prev?.status })); } catch {}
    });
    source.addEventListener('order:tracking', (e: any) => {
      try { const payload = JSON.parse(e.data); setOrder((prev: any) => ({ ...prev, trackingNumber: payload.trackingNumber || prev?.trackingNumber, shippingCarrier: payload.carrier || prev?.shippingCarrier })); } catch {}
    });
  };

  const loadRecentCode = (code: string) => {
    setInvoice(code);
    fetchPublic(code);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Track your order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="track-invoice" className="text-sm font-medium text-gray-700">Order reference</label>
              <Input id="track-invoice" value={invoice} onChange={e => setInvoice(e.target.value)} className="mt-1.5" placeholder="TRK-XXXXX, INV-XXXXXXXXXX or ORD-XXXX-XXXXXX" />
              <p className="text-xs text-gray-500 mt-1">Enter the short tracking code from your receipt or email (e.g. TRK-89A2F).</p>
            </div>

            <div>
              <label htmlFor="track-email" className="text-sm font-medium text-gray-700">Buyer email <span className="text-gray-400 font-normal">(optional — to view full details)</span></label>
              <Input id="track-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5" placeholder="you@example.com" />
            </div>

            <div className="flex gap-3">
              <Button onClick={() => fetchPublic(invoice)} disabled={!invoice || loading} aria-label="Look up order">Look up</Button>
              <Button variant="outline" onClick={verify} disabled={!invoice || !email || loading} aria-label="Verify order with reference and email">Verify &amp; View</Button>
            </div>

            {recent.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent lookups</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {recent.map(code => (
                    <button
                      key={code}
                      onClick={() => loadRecentCode(code)}
                      className="text-xs font-mono border border-gray-200 rounded-full px-3 py-1 text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && <p className="text-sm text-gray-500">Loading…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {order && (
              <div className="mt-4 space-y-2">
                {order.trackingCode && (
                  <p className="text-sm">Tracking code: <strong className="font-mono text-blue-600">{order.trackingCode}</strong></p>
                )}
                <p className="text-sm">Invoice: <strong>{order.invoiceNumber || order.orderNumber}</strong></p>
                <p className="text-sm">Status: <strong><StatusBadge status={order.deliveryStatus || order.status} /></strong></p>
                <p className="text-sm">Payment: <strong>{order.paymentStatus}</strong></p>
                <p className="text-sm">Total: <strong>{formatPrice(order.total || order.amountPaid || 0)}</strong></p>
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mt-2">Items</p>
                    <ul className="space-y-1">
                      {order.items.map((i: any, idx: number) => (
                        <li key={idx} className="text-sm flex justify-between">
                          <span>{i.productName || i.name} × {i.quantity}</span>
                          {i.price != null && <span>TZS {(i.total != null ? i.total : (i.price || 0) * (i.quantity || 0)).toLocaleString()}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {order.riderName && (
                  <div>
                    <p className="text-sm font-semibold mt-2">Rider</p>
                    <p className="text-sm">{order.riderName} — {order.riderPhone}</p>
                    {order.assignedAt && <p className="text-xs text-gray-500">Assigned: {fmtDate(order.assignedAt)}</p>}
                    {order.collectedAt && <p className="text-xs text-gray-500">Collected: {fmtDate(order.collectedAt)}</p>}
                    {order.deliveredAt && <p className="text-xs text-gray-500">Delivered: {fmtDate(order.deliveredAt)}</p>}
                  </div>
                )}
                {order.trackingNumber && (
                  <p className="text-sm">Tracking: <strong>{order.trackingNumber}</strong> ({order.shippingCarrier})</p>
                )}
              </div>
            )}

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
