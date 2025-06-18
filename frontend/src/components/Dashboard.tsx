import React, { useState, useEffect } from 'react';
import { Task, CreateTaskData, tasksAPI, User } from '../services/api';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue' | 'today'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, filter, searchQuery]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tasksAPI.getTasks();
      setTasks(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      );
    }

    // Apply status/category filter
    const now = new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    switch (filter) {
      case 'pending':
        filtered = filtered.filter(task => task.status === 'pending');
        break;
      case 'in_progress':
        filtered = filtered.filter(task => task.status === 'in_progress');
        break;
      case 'completed':
        filtered = filtered.filter(task => task.status === 'completed');
        break;
      case 'overdue':
        filtered = filtered.filter(task => 
          task.dueDate && 
          new Date(task.dueDate) < now && 
          task.status !== 'completed'
        );
        break;
      case 'today':
        filtered = filtered.filter(task => 
          task.dueDate && 
          new Date(task.dueDate) <= today &&
          new Date(task.dueDate) >= new Date(today.getTime() - 24 * 60 * 60 * 1000)
        );
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredTasks(filtered);
  };

  const handleCreateTask = async (data: CreateTaskData) => {
    try {
      setLoading(true);
      await tasksAPI.createTask(data);
      await loadTasks();
      setShowTaskForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (data: CreateTaskData) => {
    if (!editingTask) return;
    
    try {
      setLoading(true);
      await tasksAPI.updateTask(editingTask.id, data);
      await loadTasks();
      setEditingTask(undefined);
      setShowTaskForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await tasksAPI.markCompleted(taskId);
      await loadTasks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await tasksAPI.deleteTask(taskId);
      await loadTasks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const getTaskCounts = () => {
    const now = new Date();
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed').length,
    };
  };

  const taskCounts = getTaskCounts();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-700">TaskMaster</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.username}!</span>
              <button
                onClick={onLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-900">{taskCounts.total}</div>
            <div className="text-sm text-gray-500">Total Tasks</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600">{taskCounts.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">{taskCounts.inProgress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">{taskCounts.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-600">{taskCounts.overdue}</div>
            <div className="text-sm text-gray-500">Overdue</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due Today</option>
            </select>
          </div>

          <button
            onClick={() => {
              setEditingTask(undefined);
              setShowTaskForm(true);
            }}
            className="btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tasks Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'Get started by creating your first task.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </main>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
          onCancel={() => {
            setShowTaskForm(false);
            setEditingTask(undefined);
          }}
          isLoading={loading}
        />
      )}
    </div>
  );
};

export default Dashboard; 