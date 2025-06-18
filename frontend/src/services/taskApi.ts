import api from './api';

// Task interfaces
export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  remindBefore: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TasksResponse {
  tasks: Task[];
  total: number;
  limit: number;
  offset: number;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Task service methods
export const taskService = {
  // Get all tasks with optional filters
  getAllTasks: async (filters?: TaskFilters): Promise<TasksResponse> => {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<TasksResponse>(`/task-service/api/tasks${queryString}`);
    return response.data;
  },
  
  // Get tasks by status
  getTasksByStatus: async (status: string, options?: { limit?: number, offset?: number }): Promise<TasksResponse> => {
    const params = new URLSearchParams();
    params.append('status', status);
    
    if (options) {
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
    }
    
    const queryString = `?${params.toString()}`;
    const response = await api.get<TasksResponse>(`/task-service/api/tasks${queryString}`);
    return response.data;
  },
  
  // Get overdue tasks
  getOverdueTasks: async (options?: { limit?: number, offset?: number }): Promise<TasksResponse> => {
    const params = new URLSearchParams();
    
    if (options) {
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<TasksResponse>(`/task-service/api/tasks/overdue${queryString}`);
    return response.data;
  },
  
  // Get tasks due today
  getTasksDueToday: async (options?: { limit?: number, offset?: number }): Promise<TasksResponse> => {
    const params = new URLSearchParams();
    
    if (options) {
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<TasksResponse>(`/task-service/api/tasks/due-today${queryString}`);
    return response.data;
  },
  
  // Get a single task by ID
  getTaskById: async (taskId: string): Promise<Task> => {
    const response = await api.get<Task>(`/task-service/api/tasks/${taskId}`);
    return response.data;
  },
  
  // Create a new task
  createTask: async (taskData: {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
    status?: 'pending' | 'in_progress' | 'completed';
    remindBefore?: number;
  }): Promise<Task> => {
    const response = await api.post<Task>('/task-service/api/tasks', taskData);
    return response.data;
  },
  
  // Update a task
  updateTask: async (taskId: string, taskData: {
    title?: string;
    description?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
    status?: 'pending' | 'in_progress' | 'completed';
    remindBefore?: number;
  }): Promise<Task> => {
    const response = await api.put<Task>(`/task-service/api/tasks/${taskId}`, taskData);
    return response.data;
  },
  
  // Delete a task
  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/task-service/api/tasks/${taskId}`);
  },
  
  // Mark task as completed
  markTaskAsCompleted: async (taskId: string): Promise<Task> => {
    const response = await api.put<Task>(`/task-service/api/tasks/${taskId}/complete`);
    return response.data;
  },
  
  // Mark task as in progress
  markTaskAsInProgress: async (taskId: string): Promise<Task> => {
    const response = await api.put<Task>(`/task-service/api/tasks/${taskId}/in-progress`);
    return response.data;
  },
  
  // Update task priority
  updateTaskPriority: async (taskId: string, priority: 'low' | 'medium' | 'high'): Promise<Task> => {
    const response = await api.put<Task>(`/task-service/api/tasks/${taskId}/priority`, { priority });
    return response.data;
  },
  
  // Get task counts for dashboard
  getTaskCounts: async (): Promise<{
    all: number;
    today: number;
    upcoming: number;
    overdue: number;
    completed: number;
  }> => {
    const [all, today, overdue, completed] = await Promise.all([
      taskService.getAllTasks({ limit: 1 }),
      taskService.getTasksDueToday({ limit: 1 }),
      taskService.getOverdueTasks({ limit: 1 }),
      taskService.getTasksByStatus('completed', { limit: 1 })
    ]);
    
    // For upcoming, we need to filter tasks with due dates in the future
    const upcoming = await taskService.getAllTasks({ 
      limit: 1,
      status: 'pending'
    });
    
    return {
      all: all.total,
      today: today.total,
      upcoming: upcoming.total,
      overdue: overdue.total,
      completed: completed.total
    };
  }
};

export default taskService; 