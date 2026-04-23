import api from './api';

// Get seller's own inventory
export const getSellerInventory = async () => {
  const response = await api.get('/api/seller-inventory');
  return response.data;
};

// Add product to seller's inventory
export const addToSellerInventory = async (data: {
  productId: string;
  price: number;
  purchasePrice?: number;
  stock: number;
  barcode?: string;
  sku?: string;
  reorderPoint?: number;
}) => {
  const response = await api.post('/api/seller-inventory', data);
  return response.data;
};

// Update seller's inventory item
export const updateSellerInventory = async (
  id: string,
  data: {
    price?: number;
    purchasePrice?: number;
    stock?: number;
    barcode?: string;
    sku?: string;
    reorderPoint?: number;
  }
) => {
  const response = await api.put(`/api/seller-inventory/${id}`, data);
  return response.data;
};

// Delete seller's inventory item
export const deleteSellerInventory = async (id: string) => {
  const response = await api.delete(`/api/seller-inventory/${id}`);
  return response.data;
};

// Get available catalog products
export const getAvailableCatalogProducts = async () => {
  const response = await api.get('/api/seller-inventory/catalog/available');
  return response.data;
};

// Bulk add products to seller inventory
export const bulkAddToSellerInventory = async (products: Array<{
  productId: string;
  price: number;
  stock: number;
}>) => {
  const response = await api.post('/api/seller-inventory/bulk', { products });
  return response.data;
};
