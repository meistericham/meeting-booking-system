import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authContext';
import { useTheme } from '../services/themeContext';
import { LogIn, UserCog, Sun, Moon, Calendar, Menu } from 'lucide-react';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  onMobileMenuToggle?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);
  
  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
      <div className="h-full px-4 md:px-8 flex justify-between items-center">
        
        {/* Mobile: Logo & Menu Toggle (Visible only on mobile) */}
        <div className="flex md:hidden items-center gap-3">
           {/* Placeholder for a mobile drawer toggle if needed later */}
           <button
              onClick={onMobileMenuToggle}
              className="p-2 -ml-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
           </button>
           
           <Link to="/" className="flex items-center gap-2">
              <div className="p-1.5 bg-brand-maroon rounded-md">
                 <Calendar className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">e-RUAI</span>
           </Link>
        </div>

        {/* Desktop: Breadcrumbs or Title (Optional, leaving empty for spacing for now) */}
        <div className="hidden md:flex items-center text-sm font-medium text-gray-500 dark:text-gray-300">
            {/* Dynamic Breadcrumbs could go here */}
            {user && (
                <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}{' '}
                    | {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
            )}
        </div>

        {/* Right Side Utilities */}
        <div className="flex items-center gap-2 md:gap-4 ml-auto">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <>
              <NotificationBell />

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{user.displayName}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 capitalize">{user.role.replace('_', ' ')}</span>
              </div>
              
              <Link 
                to="/settings"
                className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:text-brand-maroon hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                title="Account Settings"
              >
                <UserCog className="w-5 h-5" />
              </Link>
            </>
          ) : (
            <Link 
              to="/login"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-maroon hover:bg-[#7b171d] rounded-lg transition-colors shadow-sm"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
