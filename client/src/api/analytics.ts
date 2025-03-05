import api from './api';

// Description: Get sales analytics
// Endpoint: GET /api/analytics/sales
// Request: { dateRange?: 'day' | 'week' | 'month' | 'all' | 'custom', from?: string, to?: string }
// Response: {
//   dailySales: Array<{ date: string, amount: number }>,
//   popularItems: Array<{ _id: string, name: string, sales: number }>,
//   revenue: { daily: number, weekly: number, monthly: number },
//   tax?: { daily: number, weekly: number, monthly: number },
//   netRevenue?: { daily: number, weekly: number, monthly: number },
//   cashInHand?: {
//     openingBalance: number,
//     closingBalance: number,
//     cashSales: number,
//     cashPayments: number,
//     cashDeposits: number,
//     cashWithdrawals: number,
//     transactions: Array<{
//       type: string,
//       amount: number,
//       description: string,
//       timestamp: string
//     }>
//   },
//   profitAndLoss: {
//     revenue: { current: number, previous: number },
//     expenses: { current: number, previous: number },
//     costOfGoods: { current: number, previous: number },
//     grossProfit: { current: number, previous: number },
//     netProfit: { current: number, previous: number },
//     categories: {
//       revenue: Array<{ name: string, amount: number }>,
//       expenses: Array<{ name: string, amount: number }>
//     }
//   }
// }
export const getSalesAnalytics = async (dateRange?: 'day' | 'week' | 'month' | 'all' | 'custom', from?: string, to?: string) => {
  try {
    let params: Record<string, string> = {};
    
    if (dateRange === 'all') {
      // No params needed for all time
    } else if (dateRange === 'custom' && from && to) {
      params = { dateRange: 'custom', from, to };
    } else if (dateRange) {
      params = { dateRange };
    }
    
    const response = await api.get('/api/analytics/sales', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Get inventory analytics
// Endpoint: GET /api/analytics/inventory
// Request: { dateRange?: 'day' | 'week' | 'month' | 'all' | 'custom', from?: string, to?: string }
// Response: {
//   inventoryValue: { totalValue: number, totalItems: number, uniqueProducts: number },
//   lowStockItems: Array<{ _id: string, name: string, stock: number, reorderPoint: number, category: string }>,
//   stockByCategory: Array<{ category: string, count: number, totalStock: number, value: number }>
// }
export const getInventoryAnalytics = async (dateRange?: 'day' | 'week' | 'month' | 'all' | 'custom', from?: string, to?: string) => {
  try {
    let params: Record<string, string> = {};
    
    if (dateRange === 'all') {
      // No params needed for all time
    } else if (dateRange === 'custom' && from && to) {
      params = { dateRange: 'custom', from, to };
    } else if (dateRange) {
      params = { dateRange };
    }
    
    const response = await api.get('/api/analytics/inventory', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};