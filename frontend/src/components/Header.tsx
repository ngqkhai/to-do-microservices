import React, { useState } from 'react';
import { Search, Menu, Plus, Bell, User } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  onAddTaskClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onAddTaskClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <button 
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 md:hidden"
          >
            <Menu size={20} />
          </button>
          
          <div className="relative ml-2 md:ml-0">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full md:w-64 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={onAddTaskClick}
            className="btn btn-primary flex items-center"
          >
            <Plus size={18} className="mr-1" />
            <span className="hidden md:inline">Add Task</span>
          </button>
          
          <button className="p-2 rounded-lg hover:bg-gray-100 relative">
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <User size={16} className="text-gray-600" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 