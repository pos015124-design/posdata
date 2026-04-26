import api from './api';

/**
 * Get current user's business profile
 */
export const getMyBusiness = async () => {
  const response = await api.get('/api/business/my-business');
  return response.data;
};

/**
 * Create a new business profile
 */
export const createBusiness = async (businessData: any) => {
  const response = await api.post('/api/business', businessData);
  return response.data;
};

/**
 * Update business profile
 */
export const updateBusiness = async (businessId: string, updateData: any) => {
  const response = await api.put(`/api/business/${businessId}`, updateData);
  return response.data;
};

/**
 * Get business by slug (public)
 */
export const getBusinessBySlug = async (slug: string) => {
  const response = await api.get(`/api/business/public/${slug}`);
  return response.data;
};
