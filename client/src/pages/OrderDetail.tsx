import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ordersApi from '../api/orders';
import formatPrice from '../utils/formatPrice';
import StatusBadge from '../components/StatusBadge';

function fmtDate(d?: string | number | null) {
  if (!d) return null;
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
}

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [token] = useState<string | null>(localStorage.getItem('customerAccessToken'));
  const esRef = useRef<EventSource | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (id) fetchOrder();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await ordersApi.getCustomerOrderById(id as string, token || undefined);
      const sale = res.sale || res.data?.sale || res.data || res;
      setOrder(sale);
      const invoice = sale.invoiceNumber || sale.orderNumber;
      if (invoice) openSSE(invoice);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Order not found');
      console.error(err);
    }
  };

  const openSSE = (invoice: string) => {
    esRef.current?.close();
    const tkn = token || '';
    if (!tkn) return; // no token → server would 403; skip streaming
    connectedRef.current = false;
    const url = `/api/orders/stream/${encodeURIComponent(invoice)}?token=${encodeURIComponent(tkn)}`;
    const src = new EventSource(url);
    esRef.current = src;
    src.onopen = () => { connectedRef.current = true; };
    src.onerror = () => {
      // Reconnect only after the stream was actually open (transient blip).
      // Auth failures (403/404) never open, so this avoids an infinite retry loop.
      if (connectedRef.current) {
        src.close();
        setTimeout(() => openSSE(invoice), 3000);
      } else {
        src.close();
        esRef.current = null;
      }
    };
    src.addEventListener('delivery:update', (e: any) => {
      try { const p = JSON.parse(e.data); setOrder((prev: any) => ({ ...prev, ...p })); } catch {}
    });
    src.addEventListener('order:status', (e: any) => {
      try { const p = JSON.parse(e.data); setOrder((prev: any) => ({ ...prev, status: p.newStatus })); } catch {}
    });
    src.addEventListener('order:tracking', (e: any) => {
      try { const p = JSON.parse(e.data); setOrder((prev: any) => ({ ...prev, trackingNumber: p.trackingNumber, shippingCarrier: p.carrier })); } catch {}
    });
  };

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!order) return <div className="p-8">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h2 className="text-xl font-bold mb-4">Order {order.invoiceNumber || order.orderNumber}</h2>
      <div className="space-y-2">
        <div>Status: <strong><StatusBadge status={order.deliveryStatus || order.status} /></strong></div>
        <div>Payment: <strong>{order.paymentStatus}</strong></div>
        <div>Rider: {order.riderName || '—'} {order.riderPhone ? `(${order.riderPhone})` : ''}</div>
        {order.assignedAt && <div className="text-xs text-gray-500">Assigned: {fmtDate(order.assignedAt)}</div>}
        {order.collectedAt && <div className="text-xs text-gray-500">Collected: {fmtDate(order.collectedAt)}</div>}
        {order.deliveredAt && <div className="text-xs text-gray-500">Delivered: {fmtDate(order.deliveredAt)}</div>}
        {order.trackingNumber && <div>Tracking: <strong>{order.trackingNumber}</strong> ({order.shippingCarrier})</div>}
        <div>Total: <strong>{formatPrice(order.total || order.amountPaid || 0)}</strong></div>
        {Array.isArray(order.items) && order.items.length > 0 && (
          <div className="pt-2">
            <div className="font-semibold mb-1">Items</div>
            <ul className="space-y-1">
              {order.items.map((i: any, idx: number) => (
                <li key={idx} className="text-sm flex justify-between">
                  <span>{i.productName || i.name} × {i.quantity}</span>
                  <span>TZS {(i.total != null ? i.total : (i.price || 0) * (i.quantity || 0)).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
