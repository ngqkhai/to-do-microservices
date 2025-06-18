import React from 'react';
import styled from '@emotion/styled';
import { useTasks } from '../context/TaskContext';
import StyledTaskCard from './StyledTaskCard';
import { Task } from '../services/taskApi';

interface TaskListProps {
  filter: string;
  onEditTask: (task: Task) => void;
}

const Container = styled.div`
  padding: 1.5rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
`;

const EmptyStateIcon = styled.div`
  background-color: #F3F4F6;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  
  svg {
    color: #9CA3AF;
  }
`;

const EmptyStateTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const EmptyStateText = styled.p`
  color: #6B7280;
  max-width: 24rem;
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 2rem;
  color: #6B7280;
`;

const ErrorMessage = styled.div`
  color: #EF4444;
  padding: 1rem;
  background-color: #FEF2F2;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
`;

const getFilterTitle = (filter: string): string => {
  switch (filter) {
    case 'all':
      return 'All Tasks';
    case 'today':
      return 'Today\'s Tasks';
    case 'upcoming':
      return 'Upcoming Tasks';
    case 'overdue':
      return 'Overdue Tasks';
    case 'completed':
      return 'Completed Tasks';
    default:
      return 'Tasks';
  }
};

const TaskList: React.FC<TaskListProps> = ({ filter, onEditTask }) => {
  const { 
    tasks, 
    completeTask, 
    deleteTask, 
    isLoading, 
    error,
    filteredTasks: {
      today,
      upcoming,
      overdue,
      completed
    }
  } = useTasks();
  
  let currentTasks = tasks;
  
  switch (filter) {
    case 'today':
      currentTasks = today;
      break;
    case 'upcoming':
      currentTasks = upcoming;
      break;
    case 'overdue':
      currentTasks = overdue;
      break;
    case 'completed':
      currentTasks = completed;
      break;
    default:
      // Keep all tasks
  }
  
  // Sort tasks: high priority first, then by due date
  const sortedTasks = [...currentTasks].sort((a, b) => {
    // First sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by due date
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  
  if (isLoading && tasks.length === 0) {
    return (
      <Container>
        <Title>{getFilterTitle(filter)}</Title>
        <LoadingIndicator>Loading tasks...</LoadingIndicator>
      </Container>
    );
  }
  
  return (
    <Container>
      <Title>{getFilterTitle(filter)}</Title>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {isLoading && <LoadingIndicator>Refreshing tasks...</LoadingIndicator>}
      
      {!isLoading && sortedTasks.length > 0 ? (
        sortedTasks.map(task => (
          <StyledTaskCard
            key={task.id}
            task={task}
            onComplete={completeTask}
            onDelete={deleteTask}
            onEdit={onEditTask}
          />
        ))
      ) : !isLoading && (
        <EmptyState>
          <EmptyStateIcon>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </EmptyStateIcon>
          <EmptyStateTitle>No {filter.toLowerCase()} tasks</EmptyStateTitle>
          <EmptyStateText>
            {filter === 'all'
              ? 'You don\'t have any tasks yet. Create a new task to get started.'
              : `You don't have any ${filter.toLowerCase()} tasks.`}
          </EmptyStateText>
        </EmptyState>
      )}
    </Container>
  );
};

export default TaskList; 