import axios, { type InternalAxiosRequestConfig } from 'axios';

// Get base URL from environment or use a default
const getBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:8090';
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Spring Security uses XSRF-TOKEN cookie and X-XSRF-TOKEN header by default
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Example: Add request interceptor for auth tokens
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Try to get token from localStorage if we're in a browser environment
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
