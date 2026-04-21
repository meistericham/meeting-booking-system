import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { subscribeToUnreadNotificationCount } from '../services/notificationService';
import { useAuth } from '../services/authContext';
import { useTheme } from '../services/themeContext';
import AppFooter from './AppFooter';

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'meeting-booking-system.sidebar-collapsed';

export interface DashboardNavItem {
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
  active?: boolean;
}

interface DashboardShellProps {
  badge: string;
  title: string;
  description: string;
  userLabel?: string;
  navItems: DashboardNavItem[];
  headerActions?: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
}

const DashboardShell: React.FC<DashboardShellProps> = ({
  badge,
  title,
  description,
  userLabel,
  navItems,
  headerActions,
  summary,
  children,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === 'true';
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_COLLAPSE_STORAGE_KEY,
      sidebarCollapsed ? 'true' : 'false'
    );
  }, [sidebarCollapsed]);

  React.useEffect(() => {
    if (!user) {
      setUnreadNotificationCount(0);
      return;
    }

    return subscribeToUnreadNotificationCount(
      user.uid,
      (count) => setUnreadNotificationCount(count),
      () => setUnreadNotificationCount(0)
    );
  }, [user]);

  const renderNavItem = (item: DashboardNavItem, mobile = false) => {
    const collapsedDesktop = !mobile && sidebarCollapsed;
    const baseClasses = mobile
      ? `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          item.active
            ? 'bg-brand-maroon text-white'
            : 'bg-white text-gray-700 hover:text-brand-maroon dark:bg-gray-900 dark:text-gray-200 dark:hover:text-red-200'
        }`
      : `flex w-full items-center rounded-2xl py-3 text-sm font-medium transition-colors ${
          collapsedDesktop ? 'justify-center px-0' : 'gap-3 px-4'
        } ${
          item.active
            ? 'bg-brand-maroon text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-brand-maroon dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-red-200'
        }`;

    if (item.to) {
      return (
        <Link
          key={item.label}
          to={item.to}
          onClick={() => setSidebarOpen(false)}
          className={baseClasses}
          title={collapsedDesktop ? item.label : undefined}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          <span className={collapsedDesktop ? 'sr-only' : ''}>{item.label}</span>
        </Link>
      );
    }

    return (
      <button
        key={item.label}
        type="button"
        onClick={() => {
          item.onClick?.();
          setSidebarOpen(false);
        }}
        className={baseClasses}
        title={collapsedDesktop ? item.label : undefined}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        <span className={collapsedDesktop ? 'sr-only' : ''}>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 text-main dark:bg-gray-950">
      <div className="flex min-h-screen">
        <div
          className={`fixed inset-0 z-40 bg-gray-950/40 transition-opacity lg:hidden ${
            sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
        />

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white px-5 py-6 transition-transform dark:border-gray-800 dark:bg-gray-900 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${sidebarCollapsed ? 'lg:w-24 lg:px-3' : 'lg:w-72'}`}
        >
          <div className="flex items-center justify-between">
            <Link
              to="/"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}
            >
              <div className="rounded-xl bg-brand-maroon p-2">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className={sidebarCollapsed ? 'hidden' : ''}>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:text-red-300">
                  {badge}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {APP_CONFIG.APP_NAME}
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            className="mt-5 hidden items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200 lg:inline-flex"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span className="ml-2">Collapse</span>
              </>
            )}
          </button>

          {userLabel && !sidebarCollapsed && (
            <div className="mt-8 rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Signed in as
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {userLabel}
              </div>
            </div>
          )}

          <nav className="mt-6 flex flex-col gap-2">
            {navItems.map((item) => renderNavItem(item))}
          </nav>

          <div className="mt-auto space-y-4 pt-6">
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex w-full items-center justify-center rounded-2xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200 ${
                sidebarCollapsed ? 'px-0' : 'gap-2 px-4'
              }`}
              title={sidebarCollapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className={sidebarCollapsed ? 'sr-only' : ''}>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </span>
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-0">
          <header className="border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-8">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="rounded-2xl border border-gray-200 bg-white p-3 text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200 lg:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  <div>
                    <div className="inline-flex items-center rounded-full bg-brand-maroon/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
                      {badge}
                    </div>
                    <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                      {title}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {description}
                    </p>
                  </div>
                </div>

                {(user || headerActions) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {user && (
                      <Link
                        to="/notifications"
                        className={`relative inline-flex items-center justify-center rounded-2xl border p-3 transition-colors ${
                          location.pathname.startsWith('/notifications')
                            ? 'border-brand-maroon text-brand-maroon dark:border-red-300 dark:text-red-200'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200'
                        }`}
                        aria-label="Open notifications"
                        title="Notifications"
                      >
                        <Bell className="h-5 w-5" />
                        {unreadNotificationCount > 0 && (
                          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-maroon px-1.5 text-[11px] font-semibold text-white dark:bg-red-300 dark:text-gray-900">
                            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                          </span>
                        )}
                      </Link>
                    )}
                    {headerActions}
                  </div>
                )}
              </div>

              <div className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {navItems.map((item) => renderNavItem(item, true))}
              </div>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 md:px-8">
            {summary && <div className="mb-8">{summary}</div>}
            {children}
          </main>

          <AppFooter />
        </div>
      </div>
    </div>
  );
};

export default DashboardShell;
