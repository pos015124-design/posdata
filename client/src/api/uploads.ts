import api from './api';

export const uploadProductImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await api.post('/api/uploads/product-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error: any) {
    // Re-throw with better error message for rate limiting
    if (error.response?.status === 429) {
      throw new Error('Upload rate limit exceeded. Please wait a few minutes before trying again.');
    }
    throw error;
  }
};

export const uploadProductImages = async (files: File[]) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });
  
  try {
    const response = await api.post('/api/uploads/product-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error: any) {
    // Re-throw with better error message for rate limiting
    if (error.response?.status === 429) {
      throw new Error('Upload rate limit exceeded. Please wait a few minutes before trying again.');
    }
    throw error;
  }
};

export const deleteProductImage = async (filename: string) => {
  const response = await api.delete(`/api/uploads/product-image/${filename}`);
  return response.data;
};
