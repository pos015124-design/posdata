import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Use environment variable for backend URL in production
// For Vercel deployment (all-in-one): leave empty or use relative URL
// For separate deployments: set VITE_API_URL to your Render backend URL
const backendURL = import.meta.env.VITE_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');

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
  (response) => response,
  async (error: AxiosError): Promise<unknown> => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status && [401, 403].includes(error.response.status) && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshURL = process.env.NODE_ENV === 'production'
          ? '/api/auth/refresh'
          : `${backendURL}/api/auth/refresh`;
        
        const { data } = await axios.post<{ accessToken: string }>(refreshURL, {
          refreshToken: localStorage.getItem('refreshToken'),
        });
        
        accessToken = data.accessToken;
        localStorage.setItem('accessToken', accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        return api(originalRequest);
      } catch (err) {
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('accessToken');
        accessToken = null;
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
