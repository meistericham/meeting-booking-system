import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/dataService';
import { Notification, UserRole } from '../types';

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!user) return;
    const all = await fetchNotifications(user.uid, user.role);
    
    // Server-side filtering is done in fetchNotifications(userId, role)
    // We still apply a small safety filter client-side.
    const filtered = all.filter((n) => {
      const matchesUser = n.targetUserId ? n.targetUserId === user.uid : true;
      return matchesUser;
    });

    setNotifications(filtered);
  };

  useEffect(() => {
    loadNotifications();

    // Keep polling conservative to avoid burning Firestore reads.
    // Also only poll while the dropdown is open.
    const REFRESH_MS = 60 * 1000; // 1 minute
    if (!isOpen) return;

    const interval = window.setInterval(loadNotifications, REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [user, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationAsRead(id);
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = async () => {
      if(!user) return;
      await markAllNotificationsAsRead(user.uid, user.role);
      setNotifications(prev => prev.map(n => ({...n, isRead: true})));
  }

  const getIcon = (type: string) => {
    switch (type) {
        case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
        case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
        default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTimeAgo = (timestamp: number) => {
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return new Date(timestamp).toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</h3>
            {unreadCount > 0 && (
                <button 
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                    Mark all read
                </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                    No notifications yet.
                </div>
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {notifications.map(notif => (
                        <li 
                            key={notif.id} 
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className={`p-4 flex gap-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${!notif.isRead ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                {getIcon(notif.type)}
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm ${!notif.isRead ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {notif.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {getTimeAgo(notif.timestamp)}
                                </p>
                            </div>
                            {!notif.isRead && (
                                <div className="flex-shrink-0 self-center">
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full block"></span>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
