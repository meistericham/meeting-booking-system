import React, { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../services/authContext';
import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  CalendarRange, 
  List, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
  Inbox,
  X,
  BookOpen,
  LifeBuoy,
  Megaphone
} from 'lucide-react';
import { APP_VERSION } from '../data/changelog';
import { fetchPendingBookingsCount, fetchUserTickets, fetchUsers } from '../services/dataService';
import Avatar from './ui/Avatar';
import { logger } from '../utils/logger';

// Task 2: Accept Props
interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle, onMobileClose }) => {
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingMeetingCount, setPendingMeetingCount] = useState(0);
  const [unreadTicketCount, setUnreadTicketCount] = useState(0);
  
  if (!user) return null;

  const canSeeApprovals =
    user.role === UserRole.SUPER_ADMIN ||
    (user.role === UserRole.ADMIN && user.canApproveUsers === true);

  const canSeeAdminConsole =
    user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;

  logger.debug('User Permissions:', user?.role, user?.canApproveUsers);

  const normalizeStatus = (status?: string) => {
    if (!status) return 'ACTIVE';
    const normalized = status.toUpperCase();
    if (normalized === 'INVITED') return 'PENDING';
    if (normalized === 'INACTIVE') return 'REJECTED';
    if (normalized === 'PENDING' || normalized === 'ACTIVE' || normalized === 'REJECTED') {
      return normalized;
    }
    return 'ACTIVE';
  };

  useEffect(() => {
    let mounted = true;
    const loadPending = async () => {
      if (!canSeeApprovals) return;
      try {
        const allUsers = await fetchUsers();
        const count = allUsers.filter((u) => normalizeStatus(u.status) === 'PENDING').length;
        if (mounted) setPendingCount(count);
      } catch (error) {
        logger.error('Failed to load pending user count', error);
      }
    };

    loadPending();
    return () => {
      mounted = false;
    };
  }, [canSeeApprovals]);

  useEffect(() => {
    let mounted = true;

    const loadPendingMeetings = async () => {
      if (!canSeeAdminConsole) return;
      try {
        const count = await fetchPendingBookingsCount();
        if (mounted) setPendingMeetingCount(count);
      } catch (error) {
        logger.error('Failed to load pending meeting count', error);
      }
    };

    loadPendingMeetings();
    // Polling too frequently burns Firestore reads. Keep it conservative.
    const interval = window.setInterval(loadPendingMeetings, 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [canSeeAdminConsole]);

  useEffect(() => {
    let mounted = true;

    const loadUnreadTickets = async () => {
      try {
        const tickets = await fetchUserTickets(user.uid);
        const count = tickets.filter((t) => !t.isReadByUser).length;
        if (mounted) setUnreadTicketCount(count);
      } catch (error) {
        logger.error('Failed to load unread ticket count', error);
      }
    };

    loadUnreadTickets();
    // Keep badge fresh, but avoid aggressive polling (Firestore reads add up fast)
    const interval = window.setInterval(loadUnreadTickets, 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [user.uid]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { to: '/calendar', label: 'Availability', icon: <CalendarRange className="w-5 h-5" />, roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { to: '/my-bookings', label: 'My Bookings', icon: <List className="w-5 h-5" />, roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { to: '/support', label: 'Help & Support', icon: <LifeBuoy className="w-5 h-5" />, roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN], badge: unreadTicketCount },
    { type: 'divider' },
    ...(canSeeApprovals ? [{
      to: '/user-approvals',
      label: 'New Requests',
      icon: <Inbox className="w-5 h-5" />,
      roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      badge: pendingCount
    }] : []),
    { to: '/admin', label: 'Admin Console', icon: <ShieldCheck className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN], badge: pendingMeetingCount },
    { to: '/admin/inbox', label: 'Support Inbox', icon: <Inbox className="w-5 h-5" />, roles: [UserRole.SUPER_ADMIN] },
    { to: '/super-admin', label: 'System Config', icon: <Settings className="w-5 h-5" />, roles: [UserRole.SUPER_ADMIN] },
    { to: '/super-admin/update-notice', label: 'Update Notices', icon: <Megaphone className="w-5 h-5" />, roles: [UserRole.SUPER_ADMIN] },
    { to: '/system-evolution', label: 'System Evolution', icon: <History className="w-5 h-5" />, roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { to: '/user-guide', label: 'User Guide', icon: <BookOpen className="w-5 h-5" />, roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
  ];

  const profileOnlyItems = [
    { to: '/profile', label: 'Profile', icon: <Settings className="w-5 h-5" />, roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN] }
  ];

  return (
    <aside 
      className={`
        h-screen bg-brand-maroon text-gray-200 flex flex-col 
        transition-all duration-300 ease-in-out
        w-64 ${isOpen ? 'md:w-64' : 'md:w-20'} 
      `}
    >
      {/* Mobile Close Button */}
      <div className="md:hidden flex justify-end px-3 pt-3">
        <button
          type="button"
          onClick={() => onMobileClose?.()}
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-200 hover:bg-black/20"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {/* Branding Section & Toggle */}
      <div className={`flex items-center border-b border-white/10 transition-all duration-300 ${isOpen ? 'px-6 py-4 justify-between' : 'px-0 py-4 justify-center'}`}>
        
        {/* Logo Area */}
        <Link to="/dashboard" className="flex items-center gap-3 group overflow-hidden">
          <div className="bg-white rounded-xl p-3 shadow-lg mx-auto mb-6 flex items-center justify-center w-36 h-16 overflow-hidden">
            <img src="/stb-logo.png" alt="Sarawak Tourism Board" className="w-full h-auto object-contain" />
          </div>
        </Link>
      </div>

      {/* Collapse Toggle Button (Dedicated Row) */}
      <div className={`flex items-center ${isOpen ? 'justify-end px-4 py-2' : 'justify-center py-4'}`}>
        <button 
            onClick={() => {
              if (window.innerWidth < 768) {
                onMobileClose?.();
              } else {
                toggle();
              }
            }}
            className="p-1.5 rounded-md text-gray-200 hover:text-white hover:bg-black/20 transition-colors"
            title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1 scrollbar-thin">
        {isOpen && <p className="px-2 text-xs font-bold text-gray-200/70 uppercase tracking-wider mb-2 animate-in fade-in duration-300">Menu</p>}
        
        {(user.status === 'PENDING' ? profileOnlyItems : navItems).map((item: any, idx) => {
          if (item.type === 'divider') {
            const hasNextRole = navItems.slice(idx + 1).some((n: any) => n.roles && n.roles.includes(user.role));
            return hasNextRole ? <div key={idx} className="my-4 border-t border-gray-100 dark:border-gray-800" /> : null;
          }

          if (item.roles && !item.roles.includes(user.role)) return null;

          // External link item
          if (item.type === 'external') {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                title={!isOpen ? item.label : ''}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group border-l-4
                  text-gray-200/90 border-transparent hover:bg-black/10 hover:text-white
                  ${!isOpen ? 'justify-center' : ''}
                `}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                <span className={`whitespace-nowrap transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
                  {item.label}
                </span>

                {!isOpen && (
                  <div className="absolute left-16 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </a>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to!}
              title={!isOpen ? item.label : ''} // Tooltip when collapsed
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group border-l-4
                ${isActive 
                  ? 'bg-black/20 text-white border-yellow-400' 
                  : 'text-gray-200/90 border-transparent hover:bg-black/10 hover:text-white'
                }
                ${!isOpen ? 'justify-center' : ''}
              `}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                  {item.icon}
              </div>

              {/* Label */}
              <span className={`whitespace-nowrap transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
                  {item.label}
              </span>
              {isOpen && typeof item.badge === 'number' && item.badge > 0 && (
                <span className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {item.badge}
                </span>
              )}

              {/* Floating Tooltip for Collapsed Mode (Optional visual flair) */}
              {!isOpen && (
                  <div className="absolute left-16 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                  </div>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="mt-auto text-center text-xs text-white/40 mb-4">
        <Link
          to="/system-evolution"
          className="cursor-pointer hover:text-white/70 transition-colors"
        >
          v{APP_VERSION}
        </Link>
      </div>

      {/* Sidebar Footer / User Info */}
      <div className="p-4 border-t border-white/10 flex flex-col gap-3">
        {/* Sign out: keep it visible on mobile */}
        <button
          onClick={() => {
            logout();
            onMobileClose?.();
          }}
          title={!isOpen ? 'Sign Out' : ''}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-gray-200 hover:bg-black/20 p-2 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="md:hidden">Sign Out</span>
          <span className={`hidden md:inline ${isOpen ? '' : 'md:hidden'}`}>Sign Out</span>
        </button>

        <div className={`bg-black/20 rounded-xl p-3 flex items-center gap-3 transition-all duration-300 ${!isOpen ? 'justify-center bg-transparent p-0' : ''}`}>
          <div className="flex-shrink-0">
            {/* Use deterministic initials avatar with user-configurable color */}
            {/** @ts-ignore */}
            <Avatar user={user} size="sm" />
          </div>

          {/* User Details - Hidden when collapsed */}
          <div className={`flex-1 min-w-0 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
            <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
            <p className="text-[10px] text-gray-200/70 capitalize truncate">{user.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;
