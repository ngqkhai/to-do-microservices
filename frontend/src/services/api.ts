import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  remindBefore?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  remindBefore?: number;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

// Auth API
export const authAPI = {
  login: async (data: LoginData) => {
    const response = await api.post('/user-service/api/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterData) => {
    const response = await api.post('/user-service/api/auth/register', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/user-service/api/auth/profile');
    return response.data;
  },
};

// Tasks API
export const tasksAPI = {
  getTasks: async () => {
    const response = await api.get('/task-service/api/tasks');
    return response.data;
  },

  getTask: async (id: string) => {
    const response = await api.get(`/task-service/api/tasks/${id}`);
    return response.data;
  },

  createTask: async (data: CreateTaskData) => {
    const response = await api.post('/task-service/api/tasks', data);
    return response.data;
  },

  updateTask: async (id: string, data: Partial<CreateTaskData>) => {
    const response = await api.put(`/task-service/api/tasks/${id}`, data);
    return response.data;
  },

  deleteTask: async (id: string) => {
    await api.delete(`/task-service/api/tasks/${id}`);
  },

  markCompleted: async (id: string) => {
    const response = await api.patch(`/task-service/api/tasks/${id}/complete`);
    return response.data;
  },

  markInProgress: async (id: string) => {
    const response = await api.patch(`/task-service/api/tasks/${id}/in-progress`);
    return response.data;
  },

  getOverdueTasks: async () => {
    const response = await api.get('/task-service/api/tasks/overdue');
    return response.data;
  },

  getTodayTasks: async () => {
    const response = await api.get('/task-service/api/tasks/today');
    return response.data;
  },
};

export default api; 