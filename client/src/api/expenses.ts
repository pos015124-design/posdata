import api from './api';

// Description: Get all expenses
// Endpoint: GET /api/expenses
// Request: { dateRange?: 'all' | 'day' | 'week' | 'month' }
// Response: { expenses: Array<{ _id: string, description: string, amount: number, category: string, date: string }> }
export const getExpenses = async (dateRange?: 'all' | 'day' | 'week' | 'month') => {
  try {
    const response = await api.get('/api/expenses', {
      params: dateRange ? { dateRange } : undefined
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Add new expense
// Endpoint: POST /api/expenses
// Request: { description: string, amount: number, category: string, date: string }
// Response: { success: boolean, expense: { _id: string, description: string, amount: number, category: string, date: string } }
export const addExpense = async (data: {
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}) => {
  try {
    const response = await api.post('/api/expenses', data);
    return response.data;
  } catch (error) {
    console.error('Error adding expense:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update an expense
// Endpoint: PUT /api/expenses/:id
// Request: { description?: string, amount?: number, category?: string, date?: string }
// Response: { success: boolean, expense: { _id: string, description: string, amount: number, category: string, date: string } }
export const updateExpense = async (
  id: string,
  data: {
    description?: string;
    amount?: number;
    category?: string;
    date?: string;
    notes?: string;
  }
) => {
  try {
    const response = await api.put(`/api/expenses/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating expense:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Delete an expense
// Endpoint: DELETE /api/expenses/:id
// Request: {}
// Response: { success: boolean, message: string }
export const deleteExpense = async (id: string) => {
  try {
    const response = await api.delete(`/api/expenses/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting expense:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Get expenses by date range
// Endpoint: GET /api/expenses/range/:startDate/:endDate
// Request: {}
// Response: { expenses: Array<{ _id: string, description: string, amount: number, category: string, date: string }> }
export const getExpensesByDateRange = async (startDate: string, endDate: string) => {
  try {
    const response = await api.get(`/api/expenses/range/${startDate}/${endDate}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching expenses by date range:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Get expenses by category
// Endpoint: GET /api/expenses/category/:category
// Request: {}
// Response: { expenses: Array<{ _id: string, description: string, amount: number, category: string, date: string }> }
export const getExpensesByCategory = async (category: string) => {
  try {
    const response = await api.get(`/api/expenses/category/${category}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Get expense summary by category
// Endpoint: GET /api/expenses/summary/:startDate/:endDate
// Request: {}
// Response: { summary: Array<{ category: string, total: number }> }
export const getExpenseSummaryByCategory = async (startDate: string, endDate: string) => {
  try {
    const response = await api.get(`/api/expenses/summary/${startDate}/${endDate}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};