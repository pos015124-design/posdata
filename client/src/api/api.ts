import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Authenticated requests and token refresh must use the same origin. In a
// split production deployment VITE_API_URL must point at the backend host.
const configuredBackendURL = import.meta.env.VITE_API_URL || '';
const backendURL = configuredBackendURL.replace(/\/+$/, '') || (import.meta.env.DEV ? 'http://localhost:3001' : '');

const api = axios.create({
  baseURL: backendURL,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: (status) => status >= 200 && status < 300,
});

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (!accessToken) accessToken = localStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
);

const clearSession = () => {
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('accessToken');
  accessToken = null;
};

const refreshAccessToken = async (): Promise<string> => {
  if (!refreshPromise) {
    const refreshURL = `${backendURL}/api/auth/refresh`;
    refreshPromise = axios.post<{ accessToken?: string; refreshToken?: string; data?: { accessToken?: string; refreshToken?: string } }>(
      refreshURL,
      { refreshToken: localStorage.getItem('refreshToken') }
    ).then(({ data }) => {
      // The API currently returns tokens under data; accepting the flat shape
      // keeps this client compatible with older backend responses during rollout.
      const tokenData = data.data ?? data;
      if (!tokenData.accessToken) throw new Error('Refresh response did not include an access token');
      accessToken = tokenData.accessToken;
      localStorage.setItem('accessToken', tokenData.accessToken);
      if (tokenData.refreshToken) localStorage.setItem('refreshToken', tokenData.refreshToken);
      return tokenData.accessToken;
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise!;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError): Promise<unknown> => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const requestURL = String(originalRequest?.url || '');

    // 403 is an authorization decision, not an expired-token signal. Never
    // refresh it; doing so masks RBAC failures and creates request cascades.
    if (status === 401 && originalRequest && !originalRequest._retry && !requestURL.includes('/api/auth/refresh')) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearSession();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
