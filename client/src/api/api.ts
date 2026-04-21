import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

<<<<<<< HEAD
const backendURL = 'http://localhost:3001';
=======
// Use relative URL in production, localhost in development
const backendURL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
>>>>>>> 77ffa9ad4df0a8406dc926a295435109c208a8f0
const api = axios.create({
  baseURL: backendURL,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: (status) => {
    return status >= 200 && status < 300;
  },
});

let accessToken: string | null = null;
// Axios request interceptor: Attach access token to headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (!accessToken) {
      accessToken = localStorage.getItem('accessToken');
    }
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
);

// Axios response interceptor: Handle 401 errors
api.interceptors.response.use(
  (response) => response, // If the response is successful, return it
  async (error: AxiosError): Promise<unknown> => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if this is a staff permissions update request
    const isStaffPermissionsUpdate = originalRequest.url?.includes('/api/staff/') &&
                                    originalRequest.url?.includes('/permissions') &&
                                    originalRequest.method === 'put';
    
    // If the error is due to an expired access token
    if (error.response?.status && [401, 403].includes(error.response.status) && !originalRequest._retry) {
      originalRequest._retry = true; // Mark the request as retried
try {
  // Attempt to refresh the token
  const refreshURL = process.env.NODE_ENV === 'production'
    ? '/api/auth/refresh'
    : `${backendURL}/api/auth/refresh`;
    
  const { data } = await axios.post<{ accessToken: string }>(refreshURL, {
    refreshToken: localStorage.getItem('refreshToken'),
  });
  accessToken = data.accessToken;
        accessToken = data.accessToken;

        // Retry the original request with the new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (err) {
        // If refresh fails, clear tokens and redirect to login
        // But don't redirect if this is a staff permissions update
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('accessToken');
        accessToken = null;
        
        if (!isStaffPermissionsUpdate) {
          window.location.href = '/login'; // Redirect to login page
        }
        return Promise.reject(err);
      }
    }

    return Promise.reject(error); // Pass other errors through
  }
);

export default api;
