import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, LogOut, Moon, Sun } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useAuth } from '../services/authContext';
import { useTheme } from '../services/themeContext';
import { UserRole } from '../types';
import AppFooter from './AppFooter';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 font-sans text-main transition-colors duration-200 dark:bg-gray-950">
      <header className="sticky top-0 z-30 h-16 border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="rounded-md bg-brand-maroon p-1.5">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {APP_CONFIG.APP_NAME}
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user ? (
              <>
                <Link
                  to={user.role === UserRole.ADMIN ? '/admin' : '/dashboard'}
                  className="hidden rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200 sm:inline-flex"
                >
                  {user.role === UserRole.ADMIN ? 'Admin Dashboard' : 'My Dashboard'}
                </Link>
                {user.role === UserRole.USER && (
                  <Link
                    to="/calendar"
                    className="hidden rounded-lg bg-brand-maroon px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#7b171d] sm:inline-flex"
                  >
                    Open Calendar
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200 sm:inline-flex"
                >
                  Sign In
                </Link>
                <Link
                  to="/calendar"
                  className="inline-flex rounded-lg bg-brand-maroon px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#7b171d]"
                >
                  Open Calendar
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <AppFooter />
    </div>
  );
};

export default PublicLayout;
