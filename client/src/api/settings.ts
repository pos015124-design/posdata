import api from './api';

// Define types for our settings
export type BusinessSettings = {
  name: string;
  slug?: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  logo?: string;
  isPublic?: boolean;
  status?: string;
}

export type TaxSettings = {
  defaultTaxRate: string;
  taxIncluded: boolean;
  enableTax: boolean;
}

export type ReceiptSettings = {
  showLogo: boolean;
  showTaxId: boolean;
  footerText: string;
  receiptPrefix: string;
  printAutomatically: boolean;
}

export type PaymentSettings = {
  acceptCash: boolean;
  acceptCard: boolean;
  acceptMobile: boolean;
  acceptCredit: boolean;
  defaultPaymentMethod: string;
}

export type SystemSettings = {
  business: BusinessSettings;
  tax: TaxSettings;
  receipt: ReceiptSettings;
  payment: PaymentSettings;
}

// Description: Get system settings
// Endpoint: GET /api/settings
// Request: {}
// Response: { settings: SystemSettings }
export const getSettings = async (): Promise<{ settings: SystemSettings }> => {
  try {
    const response = await api.get('/api/settings');
    return response.data;
  } catch (error) {
    console.error('Error fetching settings:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update system settings
// Endpoint: PUT /api/settings
// Request: { settings: SystemSettings }
// Response: { success: boolean, settings: SystemSettings }
export const updateSettings = async (settings: SystemSettings): Promise<{ success: boolean; settings: SystemSettings }> => {
  try {
    const response = await api.put('/api/settings', { settings });
    return response.data;
  } catch (error) {
    console.error('Error updating settings:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update business settings
// Endpoint: PUT /api/settings/business
// Request: { settings: BusinessSettings }
// Response: { success: boolean, settings: BusinessSettings }
export const updateBusinessSettings = async (settings: BusinessSettings): Promise<{ success: boolean; settings: BusinessSettings }> => {
  try {
    const response = await api.put('/api/settings/business', { settings });
    return response.data;
  } catch (error) {
    console.error('Error updating business settings:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update tax settings
// Endpoint: PUT /api/settings/tax
// Request: { settings: TaxSettings }
// Response: { success: boolean, settings: TaxSettings }
export const updateTaxSettings = async (settings: TaxSettings): Promise<{ success: boolean; settings: TaxSettings }> => {
  try {
    const response = await api.put('/api/settings/tax', { settings });
    return response.data;
  } catch (error) {
    console.error('Error updating tax settings:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update receipt settings
// Endpoint: PUT /api/settings/receipt
// Request: { settings: ReceiptSettings }
// Response: { success: boolean, settings: ReceiptSettings }
export const updateReceiptSettings = async (settings: ReceiptSettings): Promise<{ success: boolean; settings: ReceiptSettings }> => {
  try {
    const response = await api.put('/api/settings/receipt', { settings });
    return response.data;
  } catch (error) {
    console.error('Error updating receipt settings:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update payment settings
// Endpoint: PUT /api/settings/payment
// Request: { settings: PaymentSettings }
// Response: { success: boolean, settings: PaymentSettings }
export const updatePaymentSettings = async (settings: PaymentSettings): Promise<{ success: boolean; settings: PaymentSettings }> => {
  try {
    const response = await api.put('/api/settings/payment', { settings });
    return response.data;
  } catch (error) {
    console.error('Error updating payment settings:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};