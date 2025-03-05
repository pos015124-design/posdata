import api from './api';

export type Category = {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
};

// Description: Get all categories
// Endpoint: GET /api/categories
// Request: {}
// Response: { categories: Category[] }
export const getCategories = async (): Promise<{ categories: Category[] }> => {
  try {
    const response = await api.get('/api/categories');
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Add new category
// Endpoint: POST /api/categories
// Request: { name: string, description?: string, color?: string }
// Response: { success: boolean, category: Category }
export const addCategory = async (data: {
  name: string;
  description?: string;
  color?: string;
}): Promise<{ success: boolean; category: Category }> => {
  try {
    const response = await api.post('/api/categories', data);
    return response.data;
  } catch (error) {
    console.error('Error adding category:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update category
// Endpoint: PUT /api/categories/:id
// Request: { name?: string, description?: string, color?: string }
// Response: { success: boolean, category: Category }
export const updateCategory = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    color?: string;
  }
): Promise<{ success: boolean; category: Category }> => {
  try {
    const response = await api.put(`/api/categories/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating category:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Delete category
// Endpoint: DELETE /api/categories/:id
// Request: {}
// Response: { success: boolean }
export const deleteCategory = async (id: string): Promise<{ success: boolean }> => {
  try {
    const response = await api.delete(`/api/categories/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};