import api from './api';

// Description: Get low stock alerts
// Endpoint: GET /api/inventory/alerts
// Request: {}
// Response: { alerts: Array<{ _id: string, name: string, stock: number, threshold: number }> }
export const getLowStockAlerts = async () => {
  try {
    const response = await api.get('/api/inventory/alerts');
    return response.data;
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update product stock
// Endpoint: PUT /api/inventory/update
// Request: { productId: string, stock: number }
// Response: { success: boolean, product: { _id: string, name: string, stock: number } }
export const updateStock = async (data: { productId: string; stock: number; notes?: string }) => {
  try {
    const response = await api.put('/api/inventory/update', data);
    return response.data;
  } catch (error) {
    console.error('Error updating stock:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Restock product
// Endpoint: POST /api/inventory/restock
// Request: {
//   productId: string,
//   quantity: number,
//   unitCost: number,
//   sellingPrice?: number,
//   supplierId: string,
//   invoiceNumber: string,
//   notes?: string
// }
// Response: {
//   success: boolean,
//   restock: {
//     _id: string,
//     productId: string,
//     quantity: number,
//     unitCost: number,
//     totalCost: number,
//     supplierId: string,
//     invoiceNumber: string,
//     notes?: string,
//     date: string
//   }
// }
export const restockProduct = async (data: {
  productId: string;
  quantity: number;
  unitCost: number;
  sellingPrice?: number;
  supplierId: string;
  invoiceNumber: string;
  notes?: string;
}) => {
  try {
    const response = await api.post('/api/inventory/restock', data);
    return response.data;
  } catch (error) {
    console.error('Error restocking product:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Get restock history
// Endpoint: GET /api/inventory/restock-history
// Request: {}
// Response: { 
//   history: Array<{
//     _id: string,
//     productId: string,
//     productName: string,
//     quantity: number,
//     unitCost: number,
//     totalCost: number,
//     supplierName: string,
//     invoiceNumber: string,
//     notes?: string,
//     date: string
//   }>
// }
export const getRestockHistory = async () => {
  try {
    const response = await api.get('/api/inventory/restock-history');
    return response.data;
  } catch (error) {
    console.error('Error fetching restock history:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};