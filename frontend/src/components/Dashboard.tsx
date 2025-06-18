import React from 'react';
import styled from '@emotion/styled';
import { useTasks } from '../context/TaskContext';

const Container = styled.div`
  padding: 1.5rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background-color: white;
  border-radius: 0.5rem;
  padding: 1.25rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: #6B7280;
  font-size: 0.875rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const RecentActivityContainer = styled.div`
  background-color: white;
  border-radius: 0.5rem;
  padding: 1.25rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

const ActivityList = styled.ul`
  list-style: none;
  padding: 0;
`;

const ActivityItem = styled.li`
  padding: 0.75rem 0;
  border-bottom: 1px solid #E5E7EB;
  
  &:last-child {
    border-bottom: none;
  }
`;

const ActivityTitle = styled.div`
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const ActivityMeta = styled.div`
  color: #6B7280;
  font-size: 0.75rem;
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 1rem;
  color: #6B7280;
`;

const ErrorMessage = styled.div`
  color: #EF4444;
  padding: 1rem;
  background-color: #FEF2F2;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
`;

const Dashboard: React.FC = () => {
  const { tasks, isLoading, error, taskCounts } = useTasks();
  
  // Get recent tasks (sorted by updatedAt)
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  
  if (isLoading && tasks.length === 0) {
    return (
      <Container>
        <Title>Dashboard</Title>
        <LoadingIndicator>Loading dashboard data...</LoadingIndicator>
      </Container>
    );
  }
  
  return (
    <Container>
      <Title>Dashboard</Title>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      <StatsGrid>
        <StatCard>
          <StatValue>{taskCounts.all}</StatValue>
          <StatLabel>All Tasks</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>{taskCounts.today}</StatValue>
          <StatLabel>Due Today</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>{taskCounts.upcoming}</StatValue>
          <StatLabel>Upcoming</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>{taskCounts.overdue}</StatValue>
          <StatLabel>Overdue</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>{taskCounts.completed}</StatValue>
          <StatLabel>Completed</StatLabel>
        </StatCard>
      </StatsGrid>
      
      <SectionTitle>Recent Activity</SectionTitle>
      <RecentActivityContainer>
        {isLoading ? (
          <LoadingIndicator>Loading recent activity...</LoadingIndicator>
        ) : recentTasks.length > 0 ? (
          <ActivityList>
            {recentTasks.map(task => (
              <ActivityItem key={task.id}>
                <ActivityTitle>{task.title}</ActivityTitle>
                <ActivityMeta>
                  {task.status === 'completed' ? 'Completed' : 'Updated'} on{' '}
                  {new Date(task.updatedAt).toLocaleString()}
                </ActivityMeta>
              </ActivityItem>
            ))}
          </ActivityList>
        ) : (
          <p>No recent activity</p>
        )}
      </RecentActivityContainer>
    </Container>
  );
};

export default Dashboard; 