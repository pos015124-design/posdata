import api from './api';

const BASE = '/api/suppliers';

export const getSuppliers = async () => {
  const res = await api.get(BASE);
  return res.data;
};

export const getSupplier = async (id: string) => {
  const res = await api.get(`${BASE}/${id}`);
  return res.data;
};

export const createSupplier = async (data: object) => {
  const res = await api.post(BASE, data);
  return res.data;
};

export const updateSupplier = async (id: string, data: object) => {
  const res = await api.put(`${BASE}/${id}`, data);
  return res.data;
};

export const deleteSupplier = async (id: string) => {
  const res = await api.delete(`${BASE}/${id}`);
  return res.data;
};

export const recordStockIn = async (supplierId: string, data: object) => {
  const res = await api.post(`${BASE}/${supplierId}/stock-in`, data);
  return res.data;
};
