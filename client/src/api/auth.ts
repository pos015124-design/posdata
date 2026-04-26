import api from './api';

// Define an interface for API errors
interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
}

// Description: Login user
// Endpoint: POST /api/auth/login
// Request: { email: string, password: string }
// Response: { accessToken: string, refreshToken: string, user: { role: string, email: string } }
export const login = async (email: string, password: string) => {
    try {
        const response = await api.post('/api/auth/login', { email, password });
        return response.data;
    } catch (error: unknown) {
        const apiError = error as ApiError;
        const errorMessage = apiError.response?.data?.message ||
                            (error instanceof Error ? error.message : 'Unknown error');
        throw new Error(errorMessage);
    }
};

// Description: Register user
// Endpoint: POST /api/auth/register
// Request: { email: string, password: string, name?: string, businessName?: string }
// Response: { success: boolean, message: string, user: { role: string, email: string } }
export const register = async (email: string, password: string, name?: string, businessName?: string) => {
    try {
        const response = await api.post('/api/auth/register', { email, password, name, businessName });
        return response.data;
    } catch (error: unknown) {
        const apiError = error as ApiError;
        const errorMessage = apiError.response?.data?.message ||
                            (error instanceof Error ? error.message : 'Unknown error');
        throw new Error(errorMessage);
    }
};

// Description: Logout user
// Endpoint: POST /api/auth/logout
// Request: {}
// Response: { success: boolean }
export const logout = async () => {
    try {
        const response = await api.post('/api/auth/logout', {});
        return response.data;
    } catch (error: unknown) {
        const apiError = error as ApiError;
        const errorMessage = apiError.response?.data?.message ||
                            (error instanceof Error ? error.message : 'Unknown error');
        throw new Error(errorMessage);
    }
};

// Description: Get current user data
// Endpoint: GET /api/auth/me
// Request: {}
// Response: { user: { email: string, role: string, permissions: object, isApproved: boolean } }
export const getCurrentUser = async () => {
    try {
        const response = await api.get('/api/auth/me');
        return response.data;
    } catch (error: unknown) {
        const apiError = error as ApiError;
        const errorMessage = apiError.response?.data?.message ||
                            (error instanceof Error ? error.message : 'Unknown error');
        throw new Error(errorMessage);
    }
};