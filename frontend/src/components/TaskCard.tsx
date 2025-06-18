import React from 'react';
import { format, isAfter, isBefore, addMinutes } from 'date-fns';
import { Task } from '../services/api';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, onEdit, onDelete }) => {
  const isOverdue = task.dueDate && isAfter(new Date(), new Date(task.dueDate));
  const isDueToday = task.dueDate && 
    format(new Date(task.dueDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    return format(date, 'MMM dd, yyyy - HH:mm');
  };

  return (
    <div className={`card transition-all duration-200 hover:shadow-md ${
      isOverdue && task.status !== 'completed' ? 'border-red-300 bg-red-50' : ''
    } ${task.status === 'completed' ? 'opacity-75' : ''}`}>
      
      {/* Header with priority and status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
            {task.priority.toUpperCase()}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
            {task.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        
        {isOverdue && task.status !== 'completed' && (
          <span className="text-red-600 text-xs font-medium">OVERDUE</span>
        )}
        {isDueToday && !isOverdue && task.status !== 'completed' && (
          <span className="text-orange-600 text-xs font-medium">DUE TODAY</span>
        )}
      </div>

      {/* Task title */}
      <h3 className={`text-lg font-semibold text-gray-900 mb-2 ${
        task.status === 'completed' ? 'line-through text-gray-500' : ''
      }`}>
        {task.title}
      </h3>

      {/* Task description */}
      {task.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Due date and reminder info */}
      {task.dueDate && (
        <div className="mb-4">
          <div className="flex items-center text-sm text-gray-500 mb-1">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Due: {formatDueDate(task.dueDate)}
          </div>
          {task.remindBefore && (
            <div className="flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5V9a6 6 0 10-11.31 3" />
              </svg>
              Reminder: {task.remindBefore} min before
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        {task.status !== 'completed' ? (
          <button
            onClick={() => onComplete(task.id)}
            className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Complete</span>
          </button>
        ) : (
          <span className="flex items-center space-x-1 text-green-600 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Completed</span>
          </span>
        )}

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onEdit(task)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Completion timestamp */}
      {task.completedAt && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Completed on {format(new Date(task.completedAt), 'MMM dd, yyyy - HH:mm')}
          </span>
        </div>
      )}
    </div>
  );
};

export default TaskCard; 