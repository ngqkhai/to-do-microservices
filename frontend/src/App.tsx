import React, { useState } from 'react';
import styled from '@emotion/styled';
import { TaskProvider } from './context/TaskContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import Auth from './components/Auth';
import { Task } from './services/taskApi';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
`;

const MainContent = styled.main`
  flex: 1;
  overflow-y: auto;
  background-color: #F8FAFC;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: white;
  border-bottom: 1px solid #E5E7EB;
`;

const PageTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const AddButton = styled.button`
  background-color: #2563EB;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: #1D4ED8;
  }
  
  svg {
    margin-right: 0.5rem;
  }
`;

const LogoutButton = styled.button`
  background-color: transparent;
  color: #4B5563;
  border: 1px solid #D1D5DB;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: #F3F4F6;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 1rem;
`;

const UserAvatar = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background-color: #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4B5563;
  font-weight: 600;
`;

const UserName = styled.span`
  font-weight: 500;
`;

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  
  const handleAddTask = () => {
    setSelectedTask(undefined);
    setTaskFormOpen(true);
  };
  
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setTaskFormOpen(true);
  };
  
  const handleTaskFormClose = () => {
    setTaskFormOpen(false);
    setSelectedTask(undefined);
  };

  // If not authenticated, show Auth component
  if (!user) {
    return <Auth />;
  }
  
  return (
    <AppContainer>
      <Sidebar 
        activeView={activeView}
        onViewChange={setActiveView}
      />
      
      <MainContent>
        <Header>
          <PageTitle>
            {activeView === 'dashboard' ? 'Dashboard' : 
             activeView === 'all' ? 'All Tasks' :
             activeView === 'today' ? 'Today\'s Tasks' :
             activeView === 'upcoming' ? 'Upcoming Tasks' :
             activeView === 'overdue' ? 'Overdue Tasks' : 'Completed Tasks'}
          </PageTitle>
          
          <HeaderActions>
            <UserInfo>
              <UserAvatar>{user.full_name.charAt(0)}</UserAvatar>
              <UserName>{user.full_name}</UserName>
            </UserInfo>
            
            <AddButton onClick={handleAddTask}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Task
            </AddButton>
            
            <LogoutButton onClick={logout}>
              Logout
            </LogoutButton>
          </HeaderActions>
        </Header>
        
        {activeView === 'dashboard' ? (
          <Dashboard />
        ) : (
          <TaskList 
            filter={activeView}
            onEditTask={handleEditTask}
          />
        )}
      </MainContent>
      
      <TaskForm 
        isOpen={taskFormOpen}
        onClose={handleTaskFormClose}
        task={selectedTask}
      />
    </AppContainer>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <TaskProvider>
        <AppContent />
      </TaskProvider>
    </AuthProvider>
  );
};

export default App;
