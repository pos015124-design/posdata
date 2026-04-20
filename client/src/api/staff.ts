import api from './api';

// Description: Get staff list
// Endpoint: GET /api/staff
// Request: {}
// Response: { staff: Array<{ _id: string, name: string, role: string }> }
export const getStaff = async () => {
  try {
    const response = await api.get('/api/staff');
    return response.data;
  } catch (error) {
    console.error('Error fetching staff:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Get staff member by ID
// Endpoint: GET /api/staff/:id
// Request: {}
// Response: { staff: { _id: string, name: string, role: string, email: string, phone: string } }
export const getStaffById = async (id: string) => {
  try {
    const response = await api.get(`/api/staff/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching staff member:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Add new staff member
// Endpoint: POST /api/staff/add
// Request: { name: string, role: string, email: string, password?: string }
// Response: { success: boolean, staff: { _id: string, name: string, role: string } }
export const addStaff = async (data: { 
  name: string; 
  role: string; 
  email: string;
  phone?: string;
  password?: string;
}) => {
  try {
    const response = await api.post('/api/staff/add', data);
    return response.data;
  } catch (error) {
    console.error('Error adding staff member:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Update staff member
// Endpoint: PUT /api/staff/:id
// Request: { name?: string, role?: string, email?: string, phone?: string }
// Response: { success: boolean, staff: { _id: string, name: string, role: string } }
export const updateStaff = async (
  id: string,
  data: {
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
  }
) => {
  try {
    // Validate ID format (MongoDB ObjectId is 24 hex characters)
    if (!id || typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new Error(`Invalid staff ID format: ${id}`);
    }
    
    // Make sure all required fields are present
    if (!data.name || !data.role || !data.email) {
      throw new Error('Name, role, and email are required fields');
    }
    
    const response = await api.put(`/api/staff/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating staff member:', error);
    // Log more detailed error information
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: {
          data: unknown;
          status: number;
          headers: Record<string, string>;
        }
      };
      if (axiosError.response) {
        console.error('Response data:', axiosError.response.data);
        console.error('Response status:', axiosError.response.status);
        console.error('Response headers:', axiosError.response.headers);
      }
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Delete staff member
// Endpoint: DELETE /api/staff/:id
// Request: {}
// Response: { success: boolean, message: string }
export const deleteStaff = async (id: string) => {
  try {
    const response = await api.delete(`/api/staff/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting staff member:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// updateStaffPerformance function removed

// Description: Update staff permissions
// Endpoint: PUT /api/staff/:id/permissions
// Request: { permissions: { dashboard: boolean, pos: boolean, inventory: boolean, customers: boolean, staff: boolean, reports: boolean, settings: boolean } }
// Response: { success: boolean, staff: { _id: string, name: string, role: string, permissions: object } }
export const updateStaffPermissions = async (
  id: string,
  permissions: {
    dashboard: boolean;
    pos: boolean;
    inventory: boolean;
    customers: boolean;
    staff: boolean;
    reports: boolean;
    settings: boolean;
  }
) => {
  try {
    const response = await api.put(`/api/staff/${id}/permissions`, { permissions });
    return response.data;
  } catch (error) {
    console.error('Error updating staff permissions:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

// Description: Approve a staff member
// Endpoint: PUT /api/staff/:id/approve
// Request: {}
// Response: { success: boolean, message: string, staff: { _id: string, name: string, email: string, role: string, isApproved: boolean } }
export const approveStaff = async (id: string) => {
  try {
    const response = await api.put(`/api/staff/${id}/approve`);
    return response.data;
  } catch (error) {
    console.error('Error approving staff member:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};