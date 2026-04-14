import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../services/authContext';
import UpdateNoticeGate from './UpdateNoticeGate';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  
  // Task 1: State Management for Sidebar
  // Default to true (open) on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If no user, we might be on a public page if misused, but App.tsx handles separation now.
  // We keep this check for safety.
  const showSidebar = !!user;

  return (
    <div className="flex h-screen bg-app font-sans text-main overflow-hidden">
      
      {/* Sidebar */}
      {showSidebar && (
        <>
          <div
            className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:static md:translate-x-0 ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar 
              isOpen={isSidebarOpen} 
              toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
              onMobileClose={() => setIsMobileMenuOpen(false)}
            />
          </div>
          {isMobileMenuOpen && (
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />
          )}
        </>
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-950 transition-colors duration-200 relative">
        
        {/* Top Header */}
        <Navbar onMobileMenuToggle={() => setIsMobileMenuOpen(prev => !prev)} />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className="min-h-full flex flex-col">
             {/* Page Content */}
             <div className="flex-1">
                 <div className="px-6 py-6 md:px-8 lg:px-10">
                   {children}
                 </div>
             </div>

             {/* Footer stays at bottom */}
             <footer className="py-6 mt-auto text-center border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300">
                <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">
                  System Design by{' '}
                  <a
                    href="https://mohdhisyamudin.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    Mohd Hisyamudin
                  </a>{' '}
                  | Created with AI
                </p>
             </footer>
          </div>
        </main>
      </div>
      <UpdateNoticeGate />
    </div>
  );
};

export default Layout;
