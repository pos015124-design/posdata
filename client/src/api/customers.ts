import api from './api';

// Description: Get all customers
// Endpoint: GET /api/customers
// Request: {}
// Response: { customers: Array<{ _id: string, name: string, type: "cash" | "credit", email?: string, phone?: string, creditLimit?: number }> }
export const getCustomers = async () => {
  try {
    const response = await api.get('/api/customers');
    return response.data;
  } catch (error) {
    console.error('Error fetching customers:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Add new customer
// Endpoint: POST /api/customers
// Request: { name: string, type: "cash" | "credit", email?: string, phone?: string, creditLimit?: number }
// Response: { success: boolean, customer: { _id: string, name: string, type: string, email?: string, phone?: string, creditLimit?: number } }
export const addCustomer = async (data: {
  name: string;
  type: "cash" | "credit";
  email?: string;
  phone?: string;
  creditLimit?: number;
}) => {
  try {
    const response = await api.post('/api/customers', data);
    return response.data;
  } catch (error) {
    console.error('Error adding customer:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update customer
// Endpoint: PUT /api/customers/:id
// Request: { name?: string, type?: "cash" | "credit", email?: string, phone?: string, creditLimit?: number }
// Response: { success: boolean, customer: { _id: string, name: string, type: string, email?: string, phone?: string, creditLimit?: number } }
export const updateCustomer = async (
  id: string,
  data: {
    name?: string;
    type?: "cash" | "credit";
    email?: string;
    phone?: string;
    creditLimit?: number;
  }
) => {
  try {
    const response = await api.put(`/api/customers/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating customer:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Delete customer
// Endpoint: DELETE /api/customers/:id
// Request: {}
// Response: { success: boolean, message: string }
export const deleteCustomer = async (id: string) => {
  try {
    const response = await api.delete(`/api/customers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting customer:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update customer credit
// Endpoint: PUT /api/customers/:id/credit
// Request: { amount: number }
// Response: { success: boolean, customer: { _id: string, name: string, type: string, email?: string, phone?: string, creditLimit?: number, currentCredit: number } }
export const updateCustomerCredit = async (id: string, amount: number) => {
  try {
    const response = await api.put(`/api/customers/${id}/credit`, { amount });
    return response.data;
  } catch (error) {
    console.error('Error updating customer credit:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};