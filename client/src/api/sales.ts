import api from './api';

// Description: Get recent sales
// Endpoint: GET /api/sales/recent
// Request: {}
// Response: { sales: Array<{ _id: string, items: Array<{ name: string, quantity: number, price: number }>, total: number, paymentMethod: string, date: string }> }
export const getRecentSales = async () => {
  try {
    const response = await api.get('/api/sales/recent');
    return response.data;
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Get all sales
// Endpoint: GET /api/sales
// Request: {}
// Response: { sales: Array<{ _id: string, items: Array<{ name: string, quantity: number, price: number }>, total: number, paymentMethod: string, date: string }> }
export const getAllSales = async () => {
  try {
    const response = await api.get('/api/sales');
    return response.data;
  } catch (error) {
    console.error('Error fetching all sales:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Get sale by ID
// Endpoint: GET /api/sales/:id
// Request: {}
// Response: { sale: { _id: string, items: Array<{ name: string, quantity: number, price: number }>, total: number, paymentMethod: string, date: string } }
export const getSaleById = async (id: string) => {
  try {
    const response = await api.get(`/api/sales/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sale:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Generate receipt
// Endpoint: POST /api/sales/receipt
// Request: { saleId: string }
// Response: { receipt: string }
export const generateReceipt = async (saleId: string) => {
  try {
    const response = await api.post('/api/sales/receipt', { saleId });
    return response.data;
  } catch (error) {
    console.error('Error generating receipt:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Get sales summary
// Endpoint: GET /api/sales/summary
// Request: {}
// Response: { daily: number, weekly: number, monthly: number, topProducts: Array<{ name: string, count: number }>, averageTransactionValue: number }
export const getSalesSummary = async () => {
  try {
    const response = await api.get('/api/sales/summary');
    return response.data;
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Create a new sale
// Endpoint: POST /api/sales
// Request: { items: Array<{ product: string, name: string, quantity: number, price: number }>, total: number, paymentMethod: string }
// Response: { success: boolean, sale: object }
export const createSale = async (data: {
  items: Array<{ product: string; name: string; quantity: number; price: number }>;
  total: number;
  paymentMethod: string;
}) => {
  try {
    const response = await api.post('/api/sales', data);
    return response.data;
  } catch (error) {
    console.error('Error creating sale:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};