import api from './api';

// Description: Get all payments for a customer
// Endpoint: GET /api/customer-payments/customer/:customerId
// Request: {}
// Response: { payments: Array<{ _id: string, customer: string, amount: number, paymentMethod: string, reference?: string, notes?: string, date: string }> }
export const getCustomerPayments = async (customerId: string) => {
  try {
    const response = await api.get(`/api/customer-payments/customer/${customerId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Get payment by ID
// Endpoint: GET /api/customer-payments/:id
// Request: {}
// Response: { payment: { _id: string, customer: string, amount: number, paymentMethod: string, reference?: string, notes?: string, date: string } }
export const getPaymentById = async (id: string) => {
  try {
    const response = await api.get(`/api/customer-payments/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching payment:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Add new payment
// Endpoint: POST /api/customer-payments
// Request: { customer: string, amount: number, paymentMethod: string, reference?: string, notes?: string, date?: string }
// Response: { success: boolean, payment: { _id: string, customer: string, amount: number, paymentMethod: string, reference?: string, notes?: string, date: string } }
export const addPayment = async (data: {
  customer: string;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'mobile_money' | 'other';
  reference?: string;
  notes?: string;
  date?: string;
}) => {
  try {
    const response = await api.post('/api/customer-payments', data);
    return response.data;
  } catch (error) {
    console.error('Error adding payment:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update payment
// Endpoint: PUT /api/customer-payments/:id
// Request: { amount?: number, paymentMethod?: string, reference?: string, notes?: string, date?: string }
// Response: { success: boolean, payment: { _id: string, customer: string, amount: number, paymentMethod: string, reference?: string, notes?: string, date: string } }
export const updatePayment = async (
  id: string,
  data: {
    amount?: number;
    paymentMethod?: 'cash' | 'bank' | 'mobile_money' | 'other';
    reference?: string;
    notes?: string;
    date?: string;
  }
) => {
  try {
    const response = await api.put(`/api/customer-payments/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating payment:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Delete payment
// Endpoint: DELETE /api/customer-payments/:id
// Request: {}
// Response: { success: boolean, message: string }
export const deletePayment = async (id: string) => {
  try {
    const response = await api.delete(`/api/customer-payments/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting payment:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};