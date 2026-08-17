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

// ── Two-Factor Authentication (TOTP) ──────────────────────────────────────────

// Description: Check whether 2FA is enabled for the current user
// Endpoint: GET /api/auth/2fa/status
// Response: { success: boolean, twoFactorEnabled: boolean }
export const getTwoFactorStatus = async (): Promise<{ success: boolean; twoFactorEnabled: boolean }> => {
    const response = await api.get('/api/auth/2fa/status');
    return response.data;
};

// Description: Start 2FA setup — returns a TOTP secret and QR code
// Endpoint: POST /api/auth/2fa/setup
// Response: { success: boolean, secret: string, otpauthUrl: string, qrCode: string }
export const setupTwoFactor = async (): Promise<{ success: boolean; secret: string; otpauthUrl: string; qrCode: string }> => {
    const response = await api.post('/api/auth/2fa/setup');
    return response.data;
};

// Description: Enable 2FA after verifying the code + current password
// Endpoint: POST /api/auth/2fa/enable
// Request: { code: string, password: string }
export const enableTwoFactor = async (code: string, password: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/auth/2fa/enable', { code, password });
    return response.data;
};

// Description: Disable 2FA — requires the current password
// Endpoint: POST /api/auth/2fa/disable
// Request: { password: string }
export const disableTwoFactor = async (password: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/auth/2fa/disable', { password });
    return response.data;
};

// Description: Complete login with the TOTP code from the authenticator app
// Endpoint: POST /api/auth/2fa/verify
// Request: { twoFactorToken: string, code: string }
// Response: same shape as POST /api/auth/login
export const verifyTwoFactor = async (twoFactorToken: string, code: string) => {
    try {
        const response = await api.post('/api/auth/2fa/verify', { twoFactorToken, code });
        return response.data;
    } catch (error: unknown) {
        const apiError = error as ApiError;
        const errorMessage = apiError.response?.data?.message ||
                            (error instanceof Error ? error.message : 'Unknown error');
        throw new Error(errorMessage);
    }
};