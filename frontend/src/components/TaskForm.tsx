import React from 'react';
import styled from '@emotion/styled';
import { useForm } from 'react-hook-form';
import { Task } from '../services/taskApi';
import { useTasks } from '../context/TaskContext';
import { format } from 'date-fns';

type Priority = 'low' | 'medium' | 'high';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
}

type FormData = {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  dueTime: string;
  remindBefore: number;
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
`;

const FormContainer = styled.div`
  background-color: white;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 32rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  position: relative;
`;

const FormHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const FormTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 9999px;
  
  &:hover {
    background-color: #F3F4F6;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const Input = styled.input<{ hasError?: boolean }>`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.hasError ? '#EF4444' : '#D1D5DB'};
  border-radius: 0.375rem;
  
  &:focus {
    outline: none;
    border-color: #2563EB;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const Textarea = styled.textarea<{ hasError?: boolean }>`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.hasError ? '#EF4444' : '#D1D5DB'};
  border-radius: 0.375rem;
  resize: vertical;
  min-height: 6rem;
  
  &:focus {
    outline: none;
    border-color: #2563EB;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const ErrorText = styled.p`
  color: #EF4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

const PriorityContainer = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const PriorityOption = styled.label<{ priority: Priority; isSelected: boolean }>`
  flex: 1;
  text-align: center;
  padding: 0.5rem;
  border: 1px solid ${props => {
    if (props.isSelected) {
      switch (props.priority) {
        case 'high': return '#EF4444';
        case 'medium': return '#F59E0B';
        case 'low': return '#10B981';
        default: return '#D1D5DB';
      }
    }
    return '#D1D5DB';
  }};
  border-radius: 0.375rem;
  cursor: pointer;
  background-color: ${props => {
    if (props.isSelected) {
      switch (props.priority) {
        case 'high': return '#FEE2E2';
        case 'medium': return '#FEF3C7';
        case 'low': return '#D1FAE5';
        default: return 'transparent';
      }
    }
    return 'transparent';
  }};
  color: ${props => {
    switch (props.priority) {
      case 'high': return '#B91C1C';
      case 'medium': return '#92400E';
      case 'low': return '#065F46';
      default: return '#1F2937';
    }
  }};
  font-weight: ${props => props.isSelected ? '600' : '400'};
`;

const DateTimeContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
`;

const CancelButton = styled(Button)`
  background-color: white;
  border: 1px solid #D1D5DB;
  
  &:hover {
    background-color: #F9FAFB;
  }
`;

const SubmitButton = styled(Button)`
  background-color: #2563EB;
  color: white;
  border: none;
  
  &:hover {
    background-color: #1D4ED8;
  }
`;

const reminderOptions = [
  { value: 0, label: 'No reminder' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, task }) => {
  const { addTask, updateTask } = useTasks();
  const isEditMode = !!task;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>();
  
  const priorityValue = watch('priority');
  
  // Set form values when editing a task
  React.useEffect(() => {
    if (task) {
      const dueDate = task.dueDate ? new Date(task.dueDate) : new Date();
      
      setValue('title', task.title);
      setValue('description', task.description || '');
      setValue('priority', task.priority);
      setValue('dueDate', format(dueDate, 'yyyy-MM-dd'));
      setValue('dueTime', format(dueDate, 'HH:mm'));
      setValue('remindBefore', task.remindBefore || 30);
    } else {
      // Default values for new task
      const now = new Date();
      setValue('dueDate', format(now, 'yyyy-MM-dd'));
      setValue('dueTime', format(now, 'HH:mm'));
      setValue('priority', 'medium');
      setValue('remindBefore', 30);
    }
  }, [task, setValue]);
  
  const onSubmit = (data: FormData) => {
    const { dueDate, dueTime, ...rest } = data;
    const dueDateObj = new Date(`${dueDate}T${dueTime}`);
    
    if (isEditMode && task) {
      updateTask(task.id, {
        ...rest,
        dueDate: dueDateObj.toISOString(),
      });
    } else {
      addTask({
        ...rest,
        dueDate: dueDateObj.toISOString(),
      });
    }
    
    onClose();
    reset();
  };
  
  if (!isOpen) return null;
  
  return (
    <Overlay onClick={onClose}>
      <FormContainer onClick={e => e.stopPropagation()}>
        <FormHeader>
          <FormTitle>{isEditMode ? 'Edit Task' : 'Create New Task'}</FormTitle>
          <CloseButton onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </CloseButton>
        </FormHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              type="text"
              hasError={!!errors.title}
              placeholder="Enter task title"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && (
              <ErrorText>{errors.title.message}</ErrorText>
            )}
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter task description"
              {...register('description')}
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Priority</Label>
            <PriorityContainer>
              {(['low', 'medium', 'high'] as Priority[]).map((priority) => (
                <PriorityOption 
                  key={priority}
                  priority={priority}
                  isSelected={priorityValue === priority}
                >
                  <input
                    type="radio"
                    value={priority}
                    style={{ display: 'none' }}
                    {...register('priority')}
                  />
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </PriorityOption>
              ))}
            </PriorityContainer>
          </FormGroup>
          
          <DateTimeContainer>
            <FormGroup>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                hasError={!!errors.dueDate}
                {...register('dueDate', { required: 'Due date is required' })}
              />
              {errors.dueDate && (
                <ErrorText>{errors.dueDate.message}</ErrorText>
              )}
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="dueTime">Due Time</Label>
              <Input
                id="dueTime"
                type="time"
                hasError={!!errors.dueTime}
                {...register('dueTime', { required: 'Due time is required' })}
              />
              {errors.dueTime && (
                <ErrorText>{errors.dueTime.message}</ErrorText>
              )}
            </FormGroup>
          </DateTimeContainer>
          
          <FormGroup>
            <Label htmlFor="remindBefore">Reminder</Label>
            <Input
              as="select"
              id="remindBefore"
              {...register('remindBefore')}
            >
              {reminderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Input>
          </FormGroup>
          
          <ButtonGroup>
            <CancelButton type="button" onClick={onClose}>
              Cancel
            </CancelButton>
            <SubmitButton type="submit">
              {isEditMode ? 'Update Task' : 'Create Task'}
            </SubmitButton>
          </ButtonGroup>
        </form>
      </FormContainer>
    </Overlay>
  );
};

export default TaskForm; 