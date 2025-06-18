import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Gateway base URL - hardcoded for now
const API_BASE_URL = 'http://localhost:8080';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Set withCredentials to false to avoid CORS issues with wildcard origin
  withCredentials: false,
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token using the refresh token from localStorage
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          // If no refresh token, redirect to login
          localStorage.removeItem('access_token');
          window.location.href = '/auth';
          return Promise.reject(error);
        }
        
        const response = await axios.post(
          `${API_BASE_URL}/user-service/auth/refresh`,
          { refresh_token: refreshToken }
        );
        
        // If refresh successful, update access token
        if (response.data.access_token) {
          localStorage.setItem('access_token', response.data.access_token);
          
          // Update authorization header and retry original request
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// User interface
export interface User {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  email_verified: boolean;
  last_login: string;
  created_at: string;
}

// Auth service methods
export const authService = {
  // Register a new user
  register: async (userData: { email: string; password: string; full_name: string }) => {
    const response = await api.post('/user-service/auth/register', userData);
    return response.data;
  },
  
  // Login user
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/user-service/auth/login', credentials);
    
    // Store tokens in localStorage
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    if (response.data.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    
    return response.data;
  },
  
  // Get current user info
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/user-service/auth/me');
    return response.data;
  },
  
  // Logout user
  logout: async () => {
    try {
      await api.post('/user-service/auth/logout');
    } finally {
      // Always clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  }
};

export default api; 