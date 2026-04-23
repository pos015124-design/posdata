import api from './api';

export const uploadProductImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await api.post('/uploads/product-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const uploadProductImages = async (files: File[]) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });
  
  const response = await api.post('/uploads/product-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const deleteProductImage = async (filename: string) => {
  const response = await api.delete(`/uploads/product-image/${filename}`);
  return response.data;
};
