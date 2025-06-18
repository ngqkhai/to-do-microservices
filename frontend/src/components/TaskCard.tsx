import React, { useState } from 'react';
import { Task } from '../services/taskApi';
import { 
  formatDueDate, 
  formatRelativeTime, 
  getPriorityBadgeClass, 
  isOverdue 
} from '../utils/taskUtils';
import { Check, Clock, Trash, Edit, AlertTriangle } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit }) => {
  const { completeTask, deleteTask } = useTasks();
  const [isHovered, setIsHovered] = useState(false);
  
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    completeTask(task.id);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask(task.id);
  };
  
  const handleEdit = () => {
    onEdit(task);
  };
  
  const isTaskOverdue = isOverdue(task.dueDate);
  const isCompleted = task.status === 'completed';
  
  return (
    <div 
      className="card mb-4 cursor-pointer"
      onClick={handleEdit}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start">
        <button 
          onClick={handleComplete}
          className={`flex-shrink-0 w-6 h-6 rounded-full border ${
            isCompleted 
              ? 'bg-success border-success' 
              : 'border-gray-300 hover:border-primary'
          } flex items-center justify-center mr-3 mt-1`}
        >
          {isCompleted && <Check size={14} className="text-white" />}
        </button>
        
        <div className="flex-grow">
          <div className="flex items-center justify-between">
            <h3 className={`font-medium ${isCompleted ? 'line-through text-gray-400' : ''}`}>
              {task.title}
            </h3>
            <div className="flex items-center">
              <span className={`badge ${getPriorityBadgeClass(task.priority)} mr-2`}>
                {task.priority}
              </span>
              {isHovered ? (
                <div className="flex space-x-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <Edit size={16} className="text-gray-500" />
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <Trash size={16} className="text-gray-500" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          
          {task.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center mt-2 text-xs text-gray-500">
            <div className={`flex items-center ${isTaskOverdue && !isCompleted ? 'text-danger' : ''}`}>
              {isTaskOverdue && !isCompleted ? (
                <AlertTriangle size={14} className="mr-1" />
              ) : (
                <Clock size={14} className="mr-1" />
              )}
              <span>{formatDueDate(task.dueDate)}</span>
            </div>
            <span className="mx-2">•</span>
            <span>{formatRelativeTime(task.dueDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard; 