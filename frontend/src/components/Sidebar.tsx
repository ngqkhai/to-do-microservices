import React from 'react';
import styled from '@emotion/styled';
import { useTasks } from '../context/TaskContext';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const SidebarContainer = styled.aside`
  width: 240px;
  background-color: white;
  border-right: 1px solid #E5E7EB;
  height: 100%;
  padding: 1.5rem 1rem;
`;

const Logo = styled.h1`
  color: #2563EB;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 2rem;
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const NavItem = styled.li<{ active: boolean }>`
  margin-bottom: 0.5rem;
  
  button {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: none;
    background-color: ${props => props.active ? '#EFF6FF' : 'transparent'};
    color: ${props => props.active ? '#2563EB' : '#1F2937'};
    font-weight: ${props => props.active ? '600' : '400'};
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: ${props => props.active ? '#EFF6FF' : '#F9FAFB'};
    }
  }
`;

const Badge = styled.span`
  background-color: #E5E7EB;
  color: #4B5563;
  border-radius: 9999px;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  margin-left: auto;
`;

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const { taskCounts } = useTasks();
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'all', label: 'All Tasks', count: taskCounts.all },
    { id: 'today', label: 'Today', count: taskCounts.today },
    { id: 'upcoming', label: 'Upcoming', count: taskCounts.upcoming },
    { id: 'overdue', label: 'Overdue', count: taskCounts.overdue },
    { id: 'completed', label: 'Completed', count: taskCounts.completed }
  ];
  
  return (
    <SidebarContainer>
      <Logo>TaskMaster</Logo>
      
      <NavList>
        {navItems.map(item => (
          <NavItem key={item.id} active={activeView === item.id}>
            <button onClick={() => onViewChange(item.id)}>
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <Badge>{item.count}</Badge>
              )}
            </button>
          </NavItem>
        ))}
      </NavList>
    </SidebarContainer>
  );
};

export default Sidebar; 