import api from './api';

// Description: Get all products
// Endpoint: GET /api/products
// Request: {}
// Response: { products: Array<{ _id: string, name: string, code: string, barcode: string, price: number, purchasePrice: number, stock: number, category: string, supplier: string, reorderPoint: number }> }
export const getProducts = async () => {
  try {
    const response = await api.get('/api/products');
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Add new product
// Endpoint: POST /api/products
// Request: { name: string, code: string, barcode: string, price: number, purchasePrice: number, stock: number, category: string, reorderPoint: number, images?: Array<{url: string, isPrimary: boolean, alt: string}> }
// Response: { success: boolean, product: { _id: string, name: string, code: string, barcode: string, price: number, purchasePrice: number, stock: number, category: string, reorderPoint: number } }
export const addProduct = async (data: {
  name: string;
  code: string;
  barcode: string;
  price: number;
  purchasePrice: number;
  stock: number;
  category: string;
  reorderPoint: number;
  images?: Array<{url: string; isPrimary: boolean; alt: string}>;
}) => {
  try {
    const response = await api.post('/api/products', data);
    return response.data;
  } catch (error) {
    console.error('Error adding product:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Add product to cart
// Endpoint: POST /api/products/cart/add
// Request: { productId: string, quantity: number }
// Response: { success: boolean, cart: Array<{ productId: string, quantity: number }> }
export const addToCart = async (data: { productId: string; quantity: number }) => {
  try {
    const response = await api.post('/api/products/cart/add', data);
    return response.data;
  } catch (error) {
    console.error('Error adding product to cart:', error);
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

// Description: Process payment
// Endpoint: POST /api/sales/payment/process
// Request: {
//   items: Array<{productId: string, quantity: number}>,
//   paymentMethod: string,
//   customerId: string,
//   discounts: Array<{type: string, amount: number}>,
//   notes: string
// }
// Response: { success: boolean, orderId: string, receipt: { items: Array<any>, subtotal: number, tax: number, total: number, change: number } }
export const processPayment = async (data: {
  items: Array<{productId: string, quantity: number}>,
  paymentMethod: string,
  customerId: string,
  discounts?: Array<{type: string, amount: number}>,
  notes?: string,
  amountPaid?: number,
  taxRate?: number,
  taxIncluded?: boolean,
  transactionNumber?: string
}) => {
  try {
    const response = await api.post('/api/sales/payment/process', data);
    return response.data;
  } catch (error) {
    console.error('Error processing payment:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Get product by barcode
// Endpoint: GET /api/products/barcode/:barcode
// Request: { barcode: string }
// Response: { product: { _id: string, name: string, code: string, barcode: string, price: number, purchasePrice: number, stock: number } }
export const getProductByBarcode = async (barcode: string) => {
  try {
    const response = await api.get(`/api/products/barcode/${barcode}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Add discount
// Endpoint: POST /api/sales/discounts
// Request: { type: string, amount: number, code?: string }
// Response: { success: boolean, discount: { type: string, amount: number } }
export const addDiscount = async (data: { type: string, amount: number, code?: string }) => {
  try {
    const response = await api.post('/api/sales/discounts', data);
    return response.data;
  } catch (error) {
    console.error('Error adding discount:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update product
// Endpoint: PUT /api/products/:id
// Request: { name?: string, code?: string, barcode?: string, price?: number, purchasePrice?: number, stock?: number, category?: string, reorderPoint?: number, images?: Array<{url: string, isPrimary: boolean, alt: string}> }
// Response: { success: boolean, product: { _id: string, name: string, code: string, barcode: string, price: number, purchasePrice: number, stock: number, category: string, reorderPoint: number } }
export const updateProduct = async (
  id: string,
  data: {
    name?: string;
    code?: string;
    barcode?: string;
    price?: number;
    purchasePrice?: number;
    stock?: number;
    category?: string;
    reorderPoint?: number;
    images?: Array<{url: string; isPrimary: boolean; alt: string}>;
  }
) => {
  try {
    const response = await api.put(`/api/products/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating product:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Delete a product
// Endpoint: DELETE /api/products/:id
// Request: {}
// Response: { success: boolean }
export const deleteProduct = async (id: string) => {
  try {
    const response = await api.delete(`/api/products/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting product:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};