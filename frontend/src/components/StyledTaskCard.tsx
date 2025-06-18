import React from 'react';
import styled from '@emotion/styled';
import { Task } from '../services/taskApi';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const Title = styled.h3<{ completed: boolean }>`
  font-weight: 500;
  margin: 0;
  ${props => props.completed && 'text-decoration: line-through; color: #9CA3AF;'}
`;

const Description = styled.p`
  font-size: 0.875rem;
  color: #6B7280;
  margin: 0.5rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Badge = styled.span<{ priority: 'high' | 'medium' | 'low' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  
  ${props => {
    switch (props.priority) {
      case 'high':
        return 'background-color: #FEE2E2; color: #B91C1C;';
      case 'medium':
        return 'background-color: #FEF3C7; color: #92400E;';
      case 'low':
        return 'background-color: #D1FAE5; color: #065F46;';
      default:
        return '';
    }
  }}
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #6B7280;
  margin-top: 0.5rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  
  &:hover {
    background-color: #F3F4F6;
  }
`;

const StyledTaskCard: React.FC<TaskCardProps> = ({ task, onComplete, onDelete, onEdit }) => {
  const isCompleted = task.status === 'completed';
  
  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <Card onClick={() => onEdit(task)}>
      <CardHeader>
        <Title completed={isCompleted}>{task.title}</Title>
        <Badge priority={task.priority}>{task.priority}</Badge>
      </CardHeader>
      
      {task.description && (
        <Description>{task.description}</Description>
      )}
      
      <Footer>
        <div style={{ flex: 1 }}>Due: {formatDueDate(task.dueDate)}</div>
        <ButtonGroup>
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              onComplete(task.id);
            }}
          >
            {isCompleted ? 'Undo' : 'Complete'}
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
          >
            Delete
          </Button>
        </ButtonGroup>
      </Footer>
    </Card>
  );
};

export default StyledTaskCard; 