export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export interface UserAvatarPrefs {
  bgColor?: string;
}

export interface User {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  avatar?: UserAvatarPrefs;
  // New Fields for User Management
  department?: string;
  status?: 'PENDING' | 'ACTIVE' | 'REJECTED';
  createdAt?: number; // Add createdAt field
  canApproveUsers?: boolean;
}

export type UserInvite = Pick<User, 'email' | 'displayName' | 'role' | 'department'> & {
  avatarUrl?: string;
};

export interface Room {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];
  googleCalendarId?: string;
  imageUrl?: string;
}

export interface Unit {
  id: string;
  name: string;
}

export enum BookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked' // New status for maintenance
}

export type BookingType = 'meeting' | 'maintenance' | 'special';

export interface Booking {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  roomId: string;
  roomName: string;
  startTime: number; // Timestamp
  endTime: number;   // Timestamp
  purpose: string; // Displayed as "Meeting Title" in UI
  
  // Strict typing for status and type
  status: BookingStatus;
  type: BookingType; 
  
  createdAt: number;
  // New Fields
  unit?: string;
  pax?: number;
  refreshment?: string;
  requestedEquipment?: string[];
  specialRequest?: string;

  // Cancellation / Rejection audit
  cancelReasonCode?: string;
  cancelReasonNote?: string;
  cancelledBy?: string;
  cancelledByRole?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  cancelledAt?: any;

  rejectionReasonCode?: string;
  rejectionReasonNote?: string;
  rejectedBy?: string;
  rejectedAt?: any;

  // Track printing status
  isPrinted?: boolean;

  // Archiving (admin housekeeping)
  archived?: boolean;
  archivedAt?: any;
  archivedBy?: string;
  archivedReason?: 'AUTO_5_DAYS' | 'MANUAL_MONTH' | 'MANUAL_5_DAYS';

  // Category for Special Occasions
  bookingCategory?: 'standard' | 'special';
}

export interface Notification {
  id: string;
  recipientRole: UserRole | 'all';
  targetUserId?: string; // Optional: If set, only this specific user sees it
  createdBy?: string; // uid of sender/creator (used for rules/audit)
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  timestamp: number;
}

export type TicketType = 'Feedback' | 'Enquiry' | 'Bug';
export type TicketStatus = 'Pending' | 'Replied' | 'Resolved' | 'Closed';

export interface TicketMessage {
  id: string;
  senderId: string;
  senderRole: UserRole.USER | UserRole.SUPER_ADMIN;
  text: string;
  createdAt: number;
}

export interface Ticket {
  id: string;
  ticketId?: string;
  uid: string;
  userEmail: string;
  userRole: UserRole.USER | UserRole.ADMIN;
  type: TicketType;
  subject: string;
  status: TicketStatus;
  createdAt: number;
  updatedAt: number;
  isReadByUser: boolean;
  isReadByAdmin: boolean;
  messages: TicketMessage[];
}
