import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  BellRing,
  CheckCheck,
  Loader2,
  LogOut,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import SummaryCard from '../components/SummaryCard';
import { getDashboardNav } from '../config/dashboardNavigation';
import { useAuth } from '../services/authContext';
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from '../services/notificationService';
import { AppNotification, UserRole } from '../types';

const formatDateTime = (value: number) =>
  new Date(value).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const NotificationsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError('');

    return subscribeToNotifications(
      user.uid,
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message || 'Unable to load notifications.');
        setLoading(false);
      }
    );
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.readAt == null).length,
    [notifications]
  );

  const handleMarkRead = async (notification: AppNotification) => {
    if (notification.readAt != null) {
      return;
    }

    try {
      await markNotificationAsRead(notification.id);
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : 'Unable to update notification.'
      );
    }
  };

  const handleMarkAllRead = async () => {
    if (!user || unreadCount === 0) {
      return;
    }

    setActionBusy(true);
    setError('');

    try {
      await markAllNotificationsAsRead(user.uid);
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : 'Unable to mark all notifications as read.'
      );
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <DashboardShell
      badge="Notification Center"
      title="Notifications"
      description="Track booking activity in one place, keep up with pending requests, and clear unread updates once reviewed."
      userLabel={user?.displayName || user?.email}
      navItems={getDashboardNav(user?.role ?? UserRole.USER, location.pathname)}
      headerActions={
        <>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={actionBusy || unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
          >
            {actionBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Mark all read
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-red-300 hover:text-red-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-400 dark:hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </>
      }
      summary={
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Unread"
            value={unreadCount}
            detail="Notifications waiting for review"
            icon={BellRing}
            tone="amber"
          />
          <SummaryCard
            label="Total"
            value={notifications.length}
            detail="Stored notification history"
            icon={Bell}
            tone="blue"
          />
          <SummaryCard
            label="Read"
            value={notifications.length - unreadCount}
            detail="Items already reviewed"
            icon={CheckCheck}
            tone="green"
          />
        </div>
      }
    >
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No notifications yet
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              New booking updates will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const unread = notification.readAt == null;

              return (
                <article
                  key={notification.id}
                  className={`rounded-3xl border p-5 transition-colors ${
                    unread
                      ? 'border-brand-maroon/30 bg-brand-maroon/5 dark:border-red-300/30 dark:bg-brand-maroon/10'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </h2>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                            unread
                              ? 'bg-brand-maroon text-white dark:bg-red-300 dark:text-gray-900'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {unread ? 'Unread' : 'Read'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {notification.message}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={notification.link}
                        onClick={() => void handleMarkRead(notification)}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-maroon px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#74161c]"
                      >
                        Open
                      </Link>
                      {unread && (
                        <button
                          type="button"
                          onClick={() => void handleMarkRead(notification)}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </DashboardShell>
  );
};

export default NotificationsPage;
