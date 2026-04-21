// --- Enums ---

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum BookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export type EventType = 'meeting' | 'seminar' | 'workshop' | 'reception' | 'other';
export type CalendarDayStatus = 'open' | 'partial' | 'full';
export type EmailTemplateKey =
  | 'invite'
  | 'booking_pending'
  | 'booking_approved'
  | 'booking_rejected';
export type NotificationType =
  | 'booking_pending'
  | 'booking_approved'
  | 'booking_rejected';

// --- Interfaces ---

export interface UserAvatarPrefs {
  bgColor?: string;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive?: boolean;
  avatar?: UserAvatarPrefs;
  phoneNumber?: string;
  organization?: string;
  createdAt?: number;
  updatedAt?: number;
}

export type AdminUser = AppUser & {
  role: UserRole.ADMIN;
};

export interface ApprovedEmailInvite {
  id: string;
  email: string;
  role: UserRole.USER;
  invitedBy: string;
  invitedAt: number;
  claimedAt?: number;
  lastSentAt?: number;
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  capacity: number;
  amenities: string[];
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export type VenueInput = Omit<Venue, 'id'>;

export interface Booking {
  id: string;
  userId: string;
  venueId: string;
  venueName: string;

  // Snapshot of user contact info at booking time
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  organization?: string;

  // Timing
  date: string;
  startTime: string;
  endTime: string;
  startTimestamp: number;
  endTimestamp: number;

  // Details
  eventTitle: string;
  eventType: EventType;
  expectedPax: number;
  specialRequests?: string;

  // Status
  status: BookingStatus;

  // Audit
  createdAt: number;
  adminNotes?: string;
  processedBy?: string;
  processedAt?: number;
  cancelledAt?: number;
  cancelledBy?: string;
}

export type CreateBookingInput = Omit<
  Booking,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'adminNotes'
  | 'processedBy'
  | 'processedAt'
  | 'cancelledAt'
  | 'cancelledBy'
>;

export interface SignupInput {
  displayName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  organization?: string;
}

export interface TimeSlot {
  id: string;
  label: string;
  start: string;
  end: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
  updatedAt?: number;
  updatedBy?: string;
}

export interface CommunicationSettings {
  templates: Record<EmailTemplateKey, EmailTemplate>;
}

export interface AppNotification {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  bookingId: string;
  readAt: number | null;
  createdAt: number;
}
