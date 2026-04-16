import {
  CalendarDays,
  CheckCircle2,
  Home,
  LayoutDashboard,
  MapPin,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { UserRole } from '../types';
import { DashboardNavItem } from '../components/DashboardShell';

const matchesPath = (activePath: string, candidate: string) =>
  activePath === candidate || activePath.startsWith(`${candidate}/`);

export const getUserDashboardNav = (activePath: string): DashboardNavItem[] => [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/dashboard',
    active: matchesPath(activePath, '/dashboard'),
  },
  {
    label: 'Calendar',
    icon: CalendarDays,
    to: '/calendar',
    active: matchesPath(activePath, '/calendar'),
  },
  {
    label: 'Book Venue',
    icon: CheckCircle2,
    to: '/book',
    active: matchesPath(activePath, '/book'),
  },
  {
    label: 'Settings',
    icon: Settings,
    to: '/settings',
    active: matchesPath(activePath, '/settings'),
  },
  {
    label: 'Public Site',
    icon: Home,
    to: '/',
  },
];

export const getAdminDashboardNav = (activePath: string): DashboardNavItem[] => [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    to: '/admin',
    active: activePath === '/admin',
  },
  {
    label: 'Calendar',
    icon: CalendarDays,
    to: '/calendar',
    active: matchesPath(activePath, '/calendar'),
  },
  {
    label: 'Bookings',
    icon: ShieldCheck,
    to: '/admin/bookings',
    active: matchesPath(activePath, '/admin/bookings'),
  },
  {
    label: 'Users',
    icon: Users,
    to: '/admin/users',
    active: matchesPath(activePath, '/admin/users'),
  },
  {
    label: 'Rooms',
    icon: MapPin,
    to: '/admin/rooms',
    active: matchesPath(activePath, '/admin/rooms'),
  },
  {
    label: 'Settings',
    icon: Settings,
    to: '/settings',
    active: matchesPath(activePath, '/settings'),
  },
  {
    label: 'Public Site',
    icon: Home,
    to: '/',
  },
];

export const getDashboardNav = (role: UserRole, activePath: string): DashboardNavItem[] =>
  role === UserRole.ADMIN
    ? getAdminDashboardNav(activePath)
    : getUserDashboardNav(activePath);
