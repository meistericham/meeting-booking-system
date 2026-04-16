import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, BookingStatus, CreateBookingInput, Venue } from '../types';

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
  const docRef = await addDoc(bookingsRef, {
    ...booking,
    status: BookingStatus.PENDING,
    createdAt: Date.now(),
  });

  return docRef.id;
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

  await updateDoc(bookingRef, updatePayload);
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
