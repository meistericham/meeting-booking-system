import { Room, Booking, BookingStatus, User, UserRole, Unit, Notification } from '../types';

export const INITIAL_ROOMS: Room[] = [
  { 
    id: 'r_baruk', 
    name: 'Baruk Meeting Room', 
    capacity: 30, 
    equipment: ['Projector', 'Video Conf', 'Sound System', 'Whiteboard'], 
    imageUrl: 'https://picsum.photos/800/600?random=10' 
  },
  { 
    id: 'r_keliring', 
    name: 'Keliring Meeting Room', 
    capacity: 15, 
    equipment: ['Projector', 'Video Conf', 'Whiteboard'], 
    imageUrl: 'https://picsum.photos/800/600?random=11' 
  },
  { 
    id: 'r_rajang', 
    name: 'Rajang Meeting Room', 
    capacity: 12, 
    equipment: ['Smart TV', 'Video Conf', 'Whiteboard'], 
    imageUrl: 'https://picsum.photos/800/600?random=12' 
  },
  { 
    id: 'r_santubong', 
    name: 'Santubong Meeting Room', 
    capacity: 10, 
    equipment: ['Smart TV', 'Whiteboard'], 
    imageUrl: 'https://picsum.photos/800/600?random=13' 
  },
  { 
    id: 'r_niah', 
    name: 'Niah Meeting Room', 
    capacity: 8, 
    equipment: ['Smart TV', 'Whiteboard'], 
    imageUrl: 'https://picsum.photos/800/600?random=14' 
  },
  { 
    id: 'r_gading', 
    name: 'Gading Discussion Room', 
    capacity: 4, 
    equipment: ['Whiteboard'], 
    imageUrl: 'https://picsum.photos/800/600?random=15' 
  },
];

export const INITIAL_UNITS: Unit[] = [
  { id: 'u-1', name: 'Corporate Strategy' },
  { id: 'u-2', name: 'Marketing' },
  { id: 'u-3', name: 'Events' },
  { id: 'u-4', name: 'Admin' },
  { id: 'u-5', name: 'Finance' },
  { id: 'u-6', name: 'Human Resource' },
  { id: 'u-7', name: 'Digital' }
];

// Helper to generate dates relative to today
const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);
const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

// Set specific times
const setTime = (date: Date, hour: number) => {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk-sample-1',
    userId: 'user-1',
    userEmail: 'alice@example.com',
    roomId: 'r_baruk',
    roomName: 'Baruk Meeting Room',
    startTime: setTime(today, 14), // Today 2pm
    endTime: setTime(today, 16),   // Today 4pm
    purpose: 'Quarterly Review',
    status: BookingStatus.APPROVED,
    type: 'meeting',
    createdAt: Date.now() - 100000,
    pax: 12,
    refreshment: 'Coffee',
    unit: 'Marketing',
    isPrinted: true,
    bookingCategory: 'standard'
  },
  {
    id: 'bk-sample-2',
    userId: 'admin-1',
    userEmail: 'admin@example.com',
    roomId: 'r_baruk',
    roomName: 'Baruk Meeting Room',
    startTime: setTime(tomorrow, 9), // Tomorrow 9am
    endTime: setTime(tomorrow, 11),  // Tomorrow 11am
    purpose: 'Board Meeting',
    status: BookingStatus.APPROVED,
    type: 'meeting',
    createdAt: Date.now() - 80000,
    pax: 20,
    unit: 'Admin',
    isPrinted: false,
    bookingCategory: 'standard'
  },
  {
    id: 'bk-sample-3',
    userId: 'user-2',
    userEmail: 'bob@example.com',
    roomId: 'r_keliring',
    roomName: 'Keliring Meeting Room',
    startTime: setTime(today, 10),
    endTime: setTime(today, 12),
    purpose: 'Client Call',
    status: BookingStatus.APPROVED,
    type: 'meeting',
    createdAt: Date.now() - 50000,
    unit: 'Corporate Strategy',
    isPrinted: false,
    bookingCategory: 'standard'
  },
  {
    id: 'bk-sample-4',
    userId: 'user-1',
    userEmail: 'alice@example.com',
    roomId: 'r_baruk',
    roomName: 'Baruk Meeting Room',
    startTime: setTime(dayAfter, 13),
    endTime: setTime(dayAfter, 14),
    purpose: 'Quick Sync',
    status: BookingStatus.PENDING,
    type: 'meeting', 
    createdAt: Date.now() - 20000,
    unit: 'Marketing',
    isPrinted: false,
    bookingCategory: 'standard'
  },
  {
    id: 'bk-maint-1',
    userId: 'system',
    userEmail: 'system@roomSync',
    roomId: 'r_niah',
    roomName: 'Niah Meeting Room',
    startTime: setTime(today, 8),
    endTime: setTime(today, 18), // All day
    purpose: 'Aircond Repair',
    status: BookingStatus.BLOCKED,
    type: 'maintenance',
    createdAt: Date.now(),
    unit: 'Facilities',
    isPrinted: false,
    bookingCategory: 'standard'
  },
  {
    id: 'bk-special-1',
    userId: 'admin-1',
    userEmail: 'admin@example.com',
    roomId: 'r_rajang',
    roomName: 'Rajang Meeting Room',
    startTime: setTime(nextWeek, 8),
    endTime: setTime(new Date(nextWeek.getTime() + 86400000 * 4), 18), // 5 days later
    purpose: 'EXTERNAL AUDITORS',
    status: BookingStatus.APPROVED,
    type: 'meeting',
    createdAt: Date.now(),
    unit: 'Finance',
    pax: 5,
    isPrinted: false,
    bookingCategory: 'special'
  }
];

export const INITIAL_USERS: User[] = [
  {
    uid: 'super-1',
    displayName: 'Sarah Connor',
    email: 'sarah@admin.com',
    role: UserRole.SUPER_ADMIN,
    department: 'Executive Board',
    status: 'active',
    avatarUrl: 'https://ui-avatars.com/api/?name=Sarah+Connor&background=7c3aed&color=fff'
  },
  {
    uid: 'admin-1',
    displayName: 'John Doe',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    department: 'Facilities Management',
    status: 'active',
    avatarUrl: 'https://ui-avatars.com/api/?name=John+Doe&background=4f46e5&color=fff'
  },
  {
    uid: 'user-1',
    displayName: 'Alice Johnson',
    email: 'alice@example.com',
    role: UserRole.USER,
    department: 'Marketing',
    status: 'active',
    avatarUrl: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=gray&color=fff'
  },
  {
    uid: 'user-2',
    displayName: 'Bob Smith',
    email: 'bob@example.com',
    role: UserRole.USER,
    department: 'Engineering',
    status: 'active',
    avatarUrl: 'https://ui-avatars.com/api/?name=Bob+Smith&background=gray&color=fff'
  },
  {
    uid: 'user-3',
    displayName: 'Charlie Brown',
    email: 'charlie@example.com',
    role: UserRole.USER,
    department: 'Sales',
    status: 'inactive',
    avatarUrl: 'https://ui-avatars.com/api/?name=Charlie+Brown&background=gray&color=fff'
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    recipientRole: UserRole.ADMIN,
    message: 'System initialization complete.',
    type: 'info',
    isRead: false,
    timestamp: Date.now()
  }
];
