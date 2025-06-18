import React, { createContext, useContext, useState, useEffect } from 'react';
import taskService, { Task } from '../services/taskApi';

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  taskCounts: {
    all: number;
    today: number;
    upcoming: number;
    overdue: number;
    completed: number;
  };
  filteredTasks: {
    today: Task[];
    upcoming: Task[];
    overdue: Task[];
    completed: Task[];
  };
  addTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  fetchTasks: (filter?: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [taskCounts, setTaskCounts] = useState({
    all: 0,
    today: 0,
    upcoming: 0,
    overdue: 0,
    completed: 0
  });
  const [filteredTasks, setFilteredTasks] = useState<{
    today: Task[];
    upcoming: Task[];
    overdue: Task[];
    completed: Task[];
  }>({
    today: [],
    upcoming: [],
    overdue: [],
    completed: []
  });

  // Fetch task counts for the dashboard
  const fetchTaskCounts = async () => {
    try {
      const counts = await taskService.getTaskCounts();
      setTaskCounts(counts);
    } catch (err: any) {
      console.error('Failed to fetch task counts:', err);
      setError('Failed to fetch task counts. Please try again later.');
    }
  };

  // Fetch filtered tasks for different views
  const fetchFilteredTasks = async () => {
    try {
      const [todayResponse, overdueResponse, completedResponse] = await Promise.all([
        taskService.getTasksDueToday(),
        taskService.getOverdueTasks(),
        taskService.getTasksByStatus('completed')
      ]);
      
      // For upcoming, we need to filter tasks with due dates in the future
      const upcomingResponse = await taskService.getAllTasks({ 
        status: 'pending'
      });
      
      setFilteredTasks({
        today: todayResponse.tasks,
        upcoming: upcomingResponse.tasks,
        overdue: overdueResponse.tasks,
        completed: completedResponse.tasks
      });
    } catch (err: any) {
      console.error('Failed to fetch filtered tasks:', err);
    }
  };

  // Fetch tasks based on the active filter
  const fetchTasks = async (filter = activeFilter) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      
      switch (filter) {
        case 'all':
          response = await taskService.getAllTasks();
          break;
        case 'today':
          response = await taskService.getTasksDueToday();
          break;
        case 'upcoming':
          response = await taskService.getAllTasks({ 
            status: 'pending'
          });
          break;
        case 'overdue':
          response = await taskService.getOverdueTasks();
          break;
        case 'completed':
          response = await taskService.getTasksByStatus('completed');
          break;
        default:
          response = await taskService.getAllTasks();
      }
      
      setTasks(response.tasks);
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
      setError('Failed to fetch tasks. Please try again later.');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTaskCounts();
    fetchFilteredTasks();
    fetchTasks();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch tasks when filter changes
  useEffect(() => {
    fetchTasks(activeFilter);
  }, [activeFilter]);  // eslint-disable-line react-hooks/exhaustive-deps

  const addTask = async (taskData: Partial<Task>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert any null values to undefined before passing to taskService
      await taskService.createTask({
        title: taskData.title || 'New Task',
        description: taskData.description === null ? undefined : taskData.description,
        dueDate: taskData.dueDate === null ? undefined : taskData.dueDate,
        priority: taskData.priority || 'medium',
        status: taskData.status || 'pending',
        remindBefore: taskData.remindBefore === null ? undefined : taskData.remindBefore
      });
      
      // Refresh tasks, filtered tasks and counts
      await Promise.all([
        fetchTasks(),
        fetchFilteredTasks(),
        fetchTaskCounts()
      ]);
    } catch (err: any) {
      console.error('Failed to add task:', err);
      setError('Failed to add task. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert any null values to undefined before passing to taskService
      const sanitizedUpdates = {
        title: updates.title,
        description: updates.description === null ? undefined : updates.description,
        dueDate: updates.dueDate === null ? undefined : updates.dueDate,
        priority: updates.priority,
        status: updates.status,
        remindBefore: updates.remindBefore === null ? undefined : updates.remindBefore
      };
      
      await taskService.updateTask(id, sanitizedUpdates);
      
      // Refresh tasks, filtered tasks and counts
      await Promise.all([
        fetchTasks(),
        fetchFilteredTasks(),
        fetchTaskCounts()
      ]);
    } catch (err: any) {
      console.error('Failed to update task:', err);
      setError('Failed to update task. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await taskService.deleteTask(id);
      
      // Refresh tasks, filtered tasks and counts
      await Promise.all([
        fetchTasks(),
        fetchFilteredTasks(),
        fetchTaskCounts()
      ]);
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const completeTask = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await taskService.markTaskAsCompleted(id);
      
      // Refresh tasks, filtered tasks and counts
      await Promise.all([
        fetchTasks(),
        fetchFilteredTasks(),
        fetchTaskCounts()
      ]);
    } catch (err: any) {
      console.error('Failed to complete task:', err);
      setError('Failed to complete task. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        isLoading,
        error,
        taskCounts,
        filteredTasks,
        addTask,
        updateTask,
        deleteTask,
        completeTask,
        activeFilter,
        setActiveFilter,
        fetchTasks
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}; 