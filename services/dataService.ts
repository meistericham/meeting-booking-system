import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  AppNotification,
  Booking,
  BookingStatus,
  CreateBookingInput,
  Venue,
  VenueInput,
} from '../types';
import { fetchActiveAdminUsers } from './userService';

const ACTIVE_BOOKING_STATUSES = [BookingStatus.APPROVED, BookingStatus.PENDING];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

const readNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const readBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const readStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

const mapVenue = (snapshotDoc: { id: string; data: () => unknown }): Venue => {
  const raw = snapshotDoc.data();

  if (!isRecord(raw)) {
    return {
      id: snapshotDoc.id,
      name: 'Untitled Venue',
      description: 'Venue details will be added soon.',
      capacity: 1,
      amenities: [],
      isActive: true,
      sortOrder: Number.MAX_SAFE_INTEGER,
    };
  }

  const imageUrl = readString(raw.imageUrl);
  const capacity = Math.max(1, readNumber(raw.capacity, 1));

  return {
    id: snapshotDoc.id,
    name: readString(raw.name, 'Untitled Venue'),
    description: readString(raw.description, 'Venue details will be added soon.'),
    capacity,
    amenities: readStringArray(raw.amenities),
    imageUrl: imageUrl || undefined,
    isActive: readBoolean(raw.isActive, true),
    sortOrder: readNumber(raw.sortOrder, Number.MAX_SAFE_INTEGER),
  };
};

const mapBooking = (snapshotDoc: { id: string; data: () => unknown }) =>
  ({
    id: snapshotDoc.id,
    ...(snapshotDoc.data() as Omit<Booking, 'id'>),
  }) as Booking;

const buildNotificationBase = (
  input: Omit<AppNotification, 'id'>
): Omit<AppNotification, 'id'> => ({
  ...input,
  readAt: input.readAt ?? null,
});

const buildPendingNotificationForOwner = (
  bookingId: string,
  booking: CreateBookingInput
) =>
  buildNotificationBase({
    recipientUserId: booking.userId,
    type: 'booking_pending',
    title: 'Booking pending review',
    message: `${booking.eventTitle} at ${booking.venueName} is pending admin review.`,
    link: `/confirmation/${bookingId}`,
    bookingId,
    readAt: null,
    createdAt: Date.now(),
  });

const buildPendingNotificationForAdmin = (
  bookingId: string,
  booking: CreateBookingInput,
  adminUid: string
) =>
  buildNotificationBase({
    recipientUserId: adminUid,
    type: 'booking_pending',
    title: 'New booking pending review',
    message: `${booking.guestName} submitted ${booking.eventTitle} for ${booking.venueName}.`,
    link: `/admin/bookings?bookingId=${bookingId}`,
    bookingId,
    readAt: null,
    createdAt: Date.now(),
  });

const buildDecisionNotification = (
  booking: Booking,
  status: BookingStatus.APPROVED | BookingStatus.REJECTED
) =>
  buildNotificationBase({
    recipientUserId: booking.userId,
    type: status === BookingStatus.APPROVED ? 'booking_approved' : 'booking_rejected',
    title:
      status === BookingStatus.APPROVED
        ? 'Booking approved'
        : 'Booking rejected',
    message: `${booking.eventTitle} at ${booking.venueName} was ${status}.`,
    link: `/confirmation/${booking.id}`,
    bookingId: booking.id,
    readAt: null,
    createdAt: Date.now(),
  });

export const fetchVenues = async (): Promise<Venue[]> => {
  const venuesRef = collection(db, 'venues');
  const snapshot = await getDocs(venuesRef);

  return snapshot.docs.map(mapVenue).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.name.localeCompare(b.name);
  });
};

export const fetchVenueById = async (venueId: string): Promise<Venue | null> => {
  const venueRef = doc(db, 'venues', venueId);
  const snapshot = await getDoc(venueRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapVenue(snapshot);
};

export const fetchBookings = async (): Promise<Booking[]> => {
  const bookingsRef = collection(db, 'bookings');
  const bookingsQuery = query(bookingsRef);
  const snapshot = await getDocs(bookingsQuery);

  return snapshot.docs
    .map(mapBooking)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
};

export const fetchBookingsByUser = async (userId: string): Promise<Booking[]> => {
  const bookingsRef = collection(db, 'bookings');
  const bookingsQuery = query(bookingsRef, where('userId', '==', userId));
  const snapshot = await getDocs(bookingsQuery);

  return snapshot.docs
    .map(mapBooking)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
};

export const fetchBookingById = async (bookingId: string): Promise<Booking | null> => {
  const bookingRef = doc(db, 'bookings', bookingId);
  const snapshot = await getDoc(bookingRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapBooking(snapshot);
};

export const fetchBookingsByDateRange = async (
  startDate: string,
  endDate: string
): Promise<Booking[]> => {
  const bookingsRef = collection(db, 'bookings');
  const bookingsQuery = query(
    bookingsRef,
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  const snapshot = await getDocs(bookingsQuery);

  return snapshot.docs
    .map(mapBooking)
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }

      return a.startTimestamp - b.startTimestamp;
    });
};

export const fetchActiveBookingsByDate = async (dateStr: string): Promise<Booking[]> => {
  const bookingsRef = collection(db, 'bookings');
  const bookingsQuery = query(
    bookingsRef,
    where('date', '==', dateStr),
    where('status', 'in', ACTIVE_BOOKING_STATUSES)
  );
  const snapshot = await getDocs(bookingsQuery);

  return snapshot.docs.map(mapBooking);
};

export const fetchAvailabilityForDate = async (
  venueId: string,
  dateStr: string
): Promise<Booking[]> => {
  const bookingsRef = collection(db, 'bookings');
  const bookingsQuery = query(
    bookingsRef,
    where('venueId', '==', venueId),
    where('date', '==', dateStr),
    where('status', 'in', ACTIVE_BOOKING_STATUSES)
  );
  const snapshot = await getDocs(bookingsQuery);

  return snapshot.docs.map(mapBooking);
};

export const checkForClash = async (
  venueId: string,
  startTimestamp: number,
  endTimestamp: number,
  excludeBookingId?: string
): Promise<boolean> => {
  const bookingsRef = collection(db, 'bookings');
  const bookingsQuery = query(
    bookingsRef,
    where('venueId', '==', venueId),
    where('status', 'in', ACTIVE_BOOKING_STATUSES)
  );
  const snapshot = await getDocs(bookingsQuery);

  return snapshot.docs
    .map(mapBooking)
    .filter((booking) => booking.id !== excludeBookingId)
    .some(
      (booking) =>
        startTimestamp < booking.endTimestamp && endTimestamp > booking.startTimestamp
    );
};

export const createBooking = async (booking: CreateBookingInput): Promise<string> => {
  if (booking.startTimestamp >= booking.endTimestamp) {
    throw new Error('End time must be after start time.');
  }

  const isClash = await checkForClash(
    booking.venueId,
    booking.startTimestamp,
    booking.endTimestamp
  );

  if (isClash) {
    throw new Error('This time slot is already booked. Please choose a different slot.');
  }

  const bookingsRef = collection(db, 'bookings');
  const notificationsRef = collection(db, 'notifications');
  const bookingRef = doc(bookingsRef);
  const adminUsers = await fetchActiveAdminUsers();
  const batch = writeBatch(db);
  const createdAt = Date.now();

  batch.set(bookingRef, {
    ...booking,
    status: BookingStatus.PENDING,
    createdAt,
  });

  const ownerNotificationRef = doc(notificationsRef);
  batch.set(
    ownerNotificationRef,
    buildPendingNotificationForOwner(bookingRef.id, booking)
  );

  adminUsers.forEach((adminUser) => {
    const adminNotificationRef = doc(notificationsRef);
    batch.set(
      adminNotificationRef,
      buildPendingNotificationForAdmin(bookingRef.id, booking, adminUser.uid)
    );
  });

  await batch.commit();

  return bookingRef.id;
};

export const updateBookingStatus = async (
  bookingId: string,
  status: BookingStatus,
  adminUid: string,
  adminNotes?: string
): Promise<void> => {
  const bookingRef = doc(db, 'bookings', bookingId);
  const bookingSnapshot = await getDoc(bookingRef);

  if (!bookingSnapshot.exists()) {
    throw new Error('Booking not found.');
  }

  const booking = mapBooking(bookingSnapshot);

  if (status === BookingStatus.CANCELLED) {
    throw new Error('Use the cancellation flow to cancel a booking.');
  }

  if (status === BookingStatus.APPROVED) {
    const hasClash = await checkForClash(
      booking.venueId,
      booking.startTimestamp,
      booking.endTimestamp,
      bookingId
    );

    if (hasClash) {
      throw new Error('Cannot approve: time slot conflicts with another approved booking.');
    }
  }

  const updatePayload: Record<string, string | number> = {
    status,
    processedBy: adminUid,
    processedAt: Date.now(),
  };

  if (adminNotes?.trim()) {
    updatePayload.adminNotes = adminNotes.trim();
  }

  const batch = writeBatch(db);
  batch.update(bookingRef, updatePayload);

  if (status === BookingStatus.APPROVED || status === BookingStatus.REJECTED) {
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(
      notificationRef,
      buildDecisionNotification(booking, status)
    );
  }

  await batch.commit();
};

export const cancelBooking = async (bookingId: string, userId: string): Promise<void> => {
  const bookingRef = doc(db, 'bookings', bookingId);
  const bookingSnapshot = await getDoc(bookingRef);

  if (!bookingSnapshot.exists()) {
    throw new Error('Booking not found.');
  }

  const booking = mapBooking(bookingSnapshot);

  if (booking.userId !== userId) {
    throw new Error('You cannot cancel this booking.');
  }

  if (
    booking.status !== BookingStatus.PENDING &&
    booking.status !== BookingStatus.APPROVED
  ) {
    throw new Error('Only pending or approved bookings can be cancelled.');
  }

  await updateDoc(bookingRef, {
    status: BookingStatus.CANCELLED,
    cancelledAt: Date.now(),
    cancelledBy: userId,
  });
};

const sanitizeVenueInput = (input: VenueInput): VenueInput => {
  const imageUrl = input.imageUrl?.trim();

  return {
    name: input.name.trim(),
    description: input.description.trim(),
    capacity: Math.max(1, Number(input.capacity) || 1),
    amenities: Array.isArray(input.amenities)
      ? input.amenities.map((item) => item.trim()).filter(Boolean)
      : [],
    ...(imageUrl ? { imageUrl } : {}),
    isActive: Boolean(input.isActive),
    sortOrder: Number.isFinite(Number(input.sortOrder))
      ? Number(input.sortOrder)
      : Number.MAX_SAFE_INTEGER,
  };
};

export const saveVenue = async (
  input: VenueInput,
  venueId?: string
): Promise<string> => {
  const payload = sanitizeVenueInput(input);

  if (venueId) {
    await setDoc(doc(db, 'venues', venueId), payload);
    return venueId;
  }

  const venuesRef = collection(db, 'venues');
  const docRef = await addDoc(venuesRef, payload);
  return docRef.id;
};

export const updateVenueActiveState = async (
  venueId: string,
  isActive: boolean
): Promise<void> => {
  await updateDoc(doc(db, 'venues', venueId), { isActive });
};
