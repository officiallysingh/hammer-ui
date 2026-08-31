import axios from 'axios';

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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
