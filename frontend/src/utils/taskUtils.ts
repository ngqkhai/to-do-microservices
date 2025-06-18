import { format, formatDistanceToNow, isAfter, isBefore, isToday, isTomorrow, startOfTomorrow } from 'date-fns';
import { Task } from '../services/taskApi';

export type Priority = 'high' | 'medium' | 'low';
export type Status = 'pending' | 'in_progress' | 'completed';

export const getPriorityColor = (priority: Priority): string => {
  switch (priority) {
    case 'high':
      return 'text-red-600';
    case 'medium':
      return 'text-orange-500';
    case 'low':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

export const getPriorityBadgeClass = (priority: Priority): string => {
  switch (priority) {
    case 'high':
      return 'badge-high';
    case 'medium':
      return 'badge-medium';
    case 'low':
      return 'badge-low';
    default:
      return '';
  }
};

export const getStatusColor = (status: Status): string => {
  switch (status) {
    case 'completed':
      return 'text-success';
    case 'in_progress':
      return 'text-primary';
    case 'pending':
      return 'text-text-muted';
    default:
      return 'text-gray-500';
  }
};

export const formatDueDate = (dueDate: string | null): string => {
  if (!dueDate) return 'No due date';
  
  const date = new Date(dueDate);
  
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  } else if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`;
  } else {
    return format(date, 'MMM d, yyyy \'at\' h:mm a');
  }
};

export const formatRelativeTime = (dueDate: string | null): string => {
  if (!dueDate) return 'No due date';
  
  const date = new Date(dueDate);
  const now = new Date();
  
  if (isBefore(date, now)) {
    return `Overdue by ${formatDistanceToNow(date)}`;
  } else {
    return `Due in ${formatDistanceToNow(date)}`;
  }
};

export const isOverdue = (dueDate: string | null): boolean => {
  if (!dueDate) return false;
  return isBefore(new Date(dueDate), new Date());
};

export const isToday_ = (dueDate: string | null): boolean => {
  if (!dueDate) return false;
  return isToday(new Date(dueDate));
};

export const isUpcoming = (dueDate: string | null): boolean => {
  if (!dueDate) return false;
  const date = new Date(dueDate);
  const tomorrow = startOfTomorrow();
  return isAfter(date, tomorrow);
}; 