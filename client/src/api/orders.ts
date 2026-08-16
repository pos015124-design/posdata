import api from './api';

// Get orders for the current customer (requires customer auth/token)
// Storefront checkout creates Sale records, so this hits the customer sales endpoint.
export const getMyOrders = async (params?: { page?: number; limit?: number }, token?: string) => {
  const query = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await api.get(`/api/sales/customer/my-orders${query}`, { headers });
  return response.data;
};

// Get a storefront order (Sale) by internal ID for the logged-in customer
export const getCustomerOrderById = async (id: string, token?: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await api.get(`/api/sales/customer/${id}`, { headers });
  return response.data;
};

// Public: get limited public order info by invoice/orderNumber
export const getOrderByInvoicePublic = async (invoice: string) => {
  const response = await api.get(`/api/orders/invoice/${encodeURIComponent(invoice)}`);
  return response.data;
};

// Public: verify invoice with buyer email to get full order details
export const verifyOrderByInvoice = async (invoice: string, email: string) => {
  const response = await api.get(`/api/orders/verify`, { params: { invoice, email } });
  return response.data;
};

export default {
  getMyOrders,
  getCustomerOrderById,
  getOrderByInvoicePublic,
  verifyOrderByInvoice,
};
