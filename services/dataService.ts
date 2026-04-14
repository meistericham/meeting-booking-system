import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  query,
  where,
  Timestamp,
  arrayUnion,
  orderBy,
  writeBatch,
  setDoc,
  serverTimestamp,
  limit,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../firebase';
import { Room, Booking, BookingStatus, User, Unit, Notification, UserRole, UserInvite, Ticket, TicketMessage, TicketStatus, TicketType } from '../types';
import { colorFromString } from '../utils/avatar';
import { logger } from '../utils/logger';

// --- ROOMS ---

export const fetchRooms = async (): Promise<Room[]> => {
  try {
    const roomsRef = collection(db, 'rooms');
    const snapshot = await getDocs(roomsRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Room));
  } catch (error: any) {
    logger.error('Error fetching rooms:', error);
    throw new Error('Failed to fetch rooms');
  }
};

export const createRoom = async (room: Omit<Room, 'id'>): Promise<void> => {
  try {
    const roomsRef = collection(db, 'rooms');
    await addDoc(roomsRef, room);
  } catch (error: any) {
    logger.error('Error creating room:', error);
    throw new Error('Failed to create room');
  }
};

export const deleteRoom = async (roomId: string): Promise<void> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await deleteDoc(roomRef);
  } catch (error: any) {
    logger.error('Error deleting room:', error);
    throw new Error('Failed to delete room');
  }
};

// --- BOOKINGS ---

// --- ARCHIVE (Housekeeping) ---
export const fetchArchiveCandidatesByMonth = async (payload: {
  year: number;
  month: number; // 1-12
}): Promise<Booking[]> => {
  const { year, month } = payload;
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  const nowMs = Date.now();

  const bookingsRef = collection(db, 'bookings');
  const q = query(
    bookingsRef,
    where('startTime', '>=', Timestamp.fromMillis(start.getTime())),
    where('startTime', '<', Timestamp.fromMillis(end.getTime()))
  );

  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data: any = d.data();
      return {
        ...data,
        id: d.id,
        startTime: data.startTime?.toMillis?.() || data.startTime,
        endTime: data.endTime?.toMillis?.() || data.endTime,
        createdAt: data.createdAt?.toMillis?.() || data.createdAt,
      } as Booking;
    })
    .filter((b) => {
      const archived = (b as any).archived === true;
      return !archived && b.endTime < nowMs;
    });
};

export const fetchArchiveCandidatesByCutoffDays = async (payload: {
  days: number;
}): Promise<Booking[]> => {
  const cutoffMs = Date.now() - payload.days * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();

  const bookingsRef = collection(db, 'bookings');

  // Some legacy/externally-written records may store endTime as a Firestore Timestamp OR as a number (ms).
  // We query both forms and merge results.
  const qTs = query(bookingsRef, where('endTime', '<', Timestamp.fromMillis(cutoffMs)));
  const qMs = query(bookingsRef, where('endTime', '<', cutoffMs));

  const [snapTs, snapMs] = await Promise.all([
    getDocs(qTs),
    getDocs(qMs).catch(() => ({ docs: [] as any[] })),
  ]);

  const merged = new Map<string, Booking>();

  const consume = (docs: any[]) => {
    for (const d of docs) {
      const data: any = d.data();
      const b: Booking = {
        ...data,
        id: d.id,
        startTime: data.startTime?.toMillis?.() || data.startTime,
        endTime: data.endTime?.toMillis?.() || data.endTime,
        createdAt: data.createdAt?.toMillis?.() || data.createdAt,
      } as Booking;
      merged.set(b.id, b);
    }
  };

  consume(snapTs.docs);
  consume(snapMs.docs);

  return Array.from(merged.values()).filter((b) => {
    const archived = (b as any).archived === true;
    return !archived && typeof b.endTime === 'number' && b.endTime < nowMs;
  });
};

export const archiveBookingsBulk = async (payload: {
  bookingIds: string[];
  archivedBy: string;
  archivedReason: Booking['archivedReason'];
}): Promise<{ updated: number }> => {
  const ids = Array.from(new Set(payload.bookingIds)).filter(Boolean);
  if (ids.length === 0) return { updated: 0 };

  const patch: any = {
    archived: true,
    archivedAt: serverTimestamp(),
    archivedBy: payload.archivedBy,
    archivedReason: payload.archivedReason || 'MANUAL_MONTH',
  };

  let updated = 0;
  // Firestore batch limit is 500 operations
  const chunkSize = 450;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.update(doc(db, 'bookings', id), patch);
    }
    await batch.commit();
    updated += chunk.length;
  }

  return { updated };
};

export const fetchBookings = async (): Promise<Booking[]> => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const snapshot = await getDocs(bookingsRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Convert Firestore Timestamps to milliseconds
        startTime: data.startTime?.toMillis?.() || data.startTime,
        endTime: data.endTime?.toMillis?.() || data.endTime,
        createdAt: data.createdAt?.toMillis?.() || data.createdAt
      } as Booking;
    });
  } catch (error: any) {
    logger.error('Error fetching bookings:', error);
    throw new Error('Failed to fetch bookings');
  }
};

export const checkForClash = async (
  roomId: string, 
  startTime: number, 
  endTime: number, 
  excludeBookingId?: string
): Promise<boolean> => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('roomId', '==', roomId),
      where('status', 'in', [BookingStatus.APPROVED, BookingStatus.BLOCKED])
    );
    
    const snapshot = await getDocs(q);
    
    const relevantBookings = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: data.startTime?.toMillis?.() || data.startTime,
          endTime: data.endTime?.toMillis?.() || data.endTime
        };
      })
      .filter(b => b.id !== excludeBookingId);

    // Check for overlaps: (StartA < EndB) and (EndA > StartB)
    return relevantBookings.some(b => startTime < b.endTime && endTime > b.startTime);
  } catch (error: any) {
    logger.error('Error checking for clash:', error);
    return false;
  }
};

export const createBooking = async (booking: Omit<Booking, 'id'>): Promise<string> => {
  try {
    logger.debug('📝 Creating booking in Firestore...');
    logger.debug('📝 Booking data:', { roomId: booking.roomId, roomName: booking.roomName, status: booking.status });
    
    // Check for clash
    const isClash = await checkForClash(booking.roomId, booking.startTime, booking.endTime);
    
    if (isClash) {
      throw new Error('Booking clash detected! This slot is already taken or under maintenance.');
    }

    const bookingsRef = collection(db, 'bookings');
    
    // Convert timestamps to Firestore Timestamps
    const bookingData = {
      ...booking,
      startTime: Timestamp.fromMillis(booking.startTime),
      endTime: Timestamp.fromMillis(booking.endTime),
      createdAt: Timestamp.fromMillis(booking.createdAt)
    };

    // Add document and capture the reference
    logger.debug('🔗 Calling Firestore addDoc()...');
    const docRef = await addDoc(bookingsRef, bookingData);
    
    // Sync the Firestore document ID to the 'id' field inside the document
    logger.debug('🔗 Syncing document ID to id field...');
    await updateDoc(docRef, { id: docRef.id });
    
    logger.debug('✅ Booking created in Firestore with ID:', docRef.id);
    logger.debug('✅ Document path: bookings/', docRef.id);
    logger.debug('✅ Real Firestore ID returned (NOT mock, NOT client-generated)');
    
    return docRef.id;  // Return the REAL Firestore-generated document ID
  } catch (error: any) {
    // ⛔ NO FALLBACK IDs - Always throw the real error
    logger.error('❌ FIRESTORE ERROR - createBooking failed:');
    logger.error('❌ Error code:', error.code);
    logger.error('❌ Error message:', error.message);
    
    // Handle specific Firestore errors
    if (error.code === 'permission-denied') {
      logger.error('❌ Permission Denied - User does not have permission to write to bookings collection');
      throw new Error(`Firestore Permission Denied: You do not have permission to create bookings. Contact administrator.`);
    }
    
    if (error.code === 'unauthenticated') {
      logger.error('❌ Unauthenticated - User is not logged in');
      throw new Error(`You must be logged in to create a booking.`);
    }
    
    if (error.code === 'unavailable') {
      logger.error('❌ Service Unavailable - Firestore is temporarily unavailable');
      throw new Error(`Firestore is temporarily unavailable. Please try again later.`);
    }
    
    logger.error('❌ Booking data attempted:', booking);
    logger.error('❌ Full error object:', error);
    
    // Throw the original error if not a specific Firestore error
    throw error;
  }
};

export const updateBookingStatus = async (bookingId: string, status: BookingStatus): Promise<void> => {
  try {
    logger.debug('Attempting to update booking:', bookingId, 'to status:', status);

    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      throw new Error(`Booking not found for ID: ${bookingId}`);
    }

    const booking = bookingSnap.data() as any;

    // If approving, check for clash one last time
    if (status === BookingStatus.APPROVED) {
      const startTime = booking.startTime?.toMillis?.() || booking.startTime;
      const endTime = booking.endTime?.toMillis?.() || booking.endTime;
      const isClash = await checkForClash(booking.roomId, startTime, endTime, bookingId);

      if (isClash) {
        throw new Error('Cannot approve: Time slot clash detected with another approved booking.');
      }
    }

    // Update parent booking
    await updateDoc(bookingRef, { status });

    // Cascade status to auto-combined child bookings (Santubong/Niah blocks, etc.)
    // When parent is approved, children should be approved too; otherwise other users may still see
    // "Reserved (Pending Approval)" for the child rooms.
    const bookingsRef = collection(db, 'bookings');
    const qChildren = query(bookingsRef, where('combinedGroupId', '==', bookingId), where('isCombinedChild', '==', true));
    const childrenSnap = await getDocs(qChildren);

    if (!childrenSnap.empty) {
      const nextChildStatus =
        status === BookingStatus.APPROVED
          ? BookingStatus.APPROVED
          : status === BookingStatus.REJECTED || status === BookingStatus.CANCELLED
            ? BookingStatus.CANCELLED
            : null;

      if (nextChildStatus) {
        const batch = writeBatch(db);
        childrenSnap.docs.forEach((d) => {
          batch.update(d.ref, { status: nextChildStatus });
        });
        await batch.commit();
      }
    }
  } catch (error: any) {
    logger.error('Error updating booking status (full):', error);
    logger.error('Error updating booking status - message:', error?.message);
    logger.error('Error updating booking status - code:', error?.code);
    throw error;
  }
};

export const cancelBooking = async (payload: {
  bookingId: string;
  cancelledBy: string;
  cancelledByRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  cancelReasonCode: string;
  cancelReasonNote?: string;
}): Promise<void> => {
  try {
    const bookingRef = doc(db, 'bookings', payload.bookingId);

    // Cancel parent
    await updateDoc(bookingRef, {
      status: BookingStatus.CANCELLED,
      cancelReasonCode: payload.cancelReasonCode,
      cancelReasonNote: payload.cancelReasonNote || null,
      cancelledBy: payload.cancelledBy,
      cancelledByRole: payload.cancelledByRole,
      cancelledAt: serverTimestamp(),
    } as any);

    // Cascade cancel to auto-combined child bookings
    const bookingsRef = collection(db, 'bookings');
    const qChildren = query(bookingsRef, where('combinedGroupId', '==', payload.bookingId), where('isCombinedChild', '==', true));
    const childrenSnap = await getDocs(qChildren);

    if (!childrenSnap.empty) {
      const batch = writeBatch(db);
      childrenSnap.docs.forEach((d) => {
        batch.update(d.ref, {
          status: BookingStatus.CANCELLED,
          cancelReasonCode: payload.cancelReasonCode,
          cancelReasonNote: payload.cancelReasonNote || null,
          cancelledBy: payload.cancelledBy,
          cancelledByRole: payload.cancelledByRole,
          cancelledAt: serverTimestamp(),
        } as any);
      });
      await batch.commit();
    }
  } catch (error: any) {
    logger.error('Error cancelling booking:', error);
    throw error;
  }
};

export const rejectBooking = async (payload: {
  bookingId: string;
  rejectedBy: string;
  rejectedByRole: 'ADMIN' | 'SUPER_ADMIN';
  rejectionReasonCode: string;
  rejectionReasonNote?: string;
}): Promise<void> => {
  try {
    const bookingRef = doc(db, 'bookings', payload.bookingId);

    // Reject parent
    await updateDoc(bookingRef, {
      status: BookingStatus.REJECTED,
      rejectionReasonCode: payload.rejectionReasonCode,
      rejectionReasonNote: payload.rejectionReasonNote || null,
      rejectedBy: payload.rejectedBy,
      rejectedAt: serverTimestamp(),
    } as any);

    // Cascade release to auto-combined child bookings
    const bookingsRef = collection(db, 'bookings');
    const qChildren = query(bookingsRef, where('combinedGroupId', '==', payload.bookingId), where('isCombinedChild', '==', true));
    const childrenSnap = await getDocs(qChildren);

    if (!childrenSnap.empty) {
      const batch = writeBatch(db);
      childrenSnap.docs.forEach((d) => {
        batch.update(d.ref, {
          status: BookingStatus.CANCELLED,
          cancelReasonCode: `Parent rejected: ${payload.rejectionReasonCode}`,
          cancelReasonNote: payload.rejectionReasonNote || null,
          cancelledBy: payload.rejectedBy,
          cancelledByRole: payload.rejectedByRole,
          cancelledAt: serverTimestamp(),
        } as any);
      });
      await batch.commit();
    }
  } catch (error: any) {
    logger.error('Error rejecting booking:', error);
    throw error;
  }
};

export const deleteBooking = async (bookingId: string): Promise<void> => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await deleteDoc(bookingRef);
  } catch (error: any) {
    logger.error('Error deleting booking:', error);
    throw new Error('Failed to delete booking');
  }
};

export const fetchPendingBookingsCount = async (): Promise<number> => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('status', '==', BookingStatus.PENDING));

    // Prefer count aggregation (fast, bandwidth-light). If unavailable, fallback to getDocs.
    try {
      const snap = await getCountFromServer(q);
      return snap.data().count || 0;
    } catch {
      const snapshot = await getDocs(q);
      return snapshot.size;
    }
  } catch (error: any) {
    logger.error('Error fetching pending bookings count:', error);
    return 0;
  }
};

export const markBookingAsPrinted = async (bookingId: string): Promise<void> => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, { isPrinted: true });
  } catch (error: any) {
    logger.error('Error marking booking as printed:', error);
    throw new Error('Failed to mark booking as printed');
  }
};

// --- MAINTENANCE BLOCKS ---

export const createMaintenanceBlock = async (
  roomId: string, 
  roomName: string, 
  startTime: number, 
  endTime: number, 
  reason: string
): Promise<string> => {
  try {
    logger.debug('🔧 Creating maintenance block in Firestore...');
    logger.debug('🔧 Block details:', { roomId, roomName, reason });
    
    const maintenanceBooking: Omit<Booking, 'id'> = {
      userId: 'system',
      userEmail: 'system@roomSync',
      roomId,
      roomName,
      startTime,
      endTime,
      purpose: reason,
      status: BookingStatus.BLOCKED,
      type: 'maintenance',
      createdAt: Date.now(),
      unit: 'Facilities',
      bookingCategory: 'standard'
    };

    logger.debug('🔗 Calling createBooking() to add maintenance block...');
    const blockId = await createBooking(maintenanceBooking);
    
    logger.debug('✅ Maintenance block created in Firestore with ID:', blockId);
    logger.debug('✅ Real Firestore ID returned (NOT mock, NOT client-generated)');
    return blockId;
  } catch (error: any) {
    // ⛔ NO FALLBACK IDs - Always throw the real error
    logger.error('❌ FIRESTORE ERROR - createMaintenanceBlock failed:');
    logger.error('❌ Error code:', error.code);
    logger.error('❌ Error message:', error.message);
    
    // Handle specific Firestore errors
    if (error.code === 'permission-denied') {
      logger.error('❌ Permission Denied - User does not have permission to create maintenance blocks');
      throw new Error(`Firestore Permission Denied: You do not have permission to create maintenance blocks. Contact administrator.`);
    }
    
    if (error.code === 'unauthenticated') {
      logger.error('❌ Unauthenticated - User is not logged in');
      throw new Error(`You must be logged in to create a maintenance block.`);
    }
    
    logger.error('❌ Maintenance block details attempted:', { roomId, roomName, reason });
    logger.error('❌ Full error object:', error);
    
    // Throw the original error if not a specific Firestore error
    throw error;
  }
};

// --- UNITS ---

export const fetchUnits = async (): Promise<Unit[]> => {
  try {
    const unitsRef = collection(db, 'units');
    const snapshot = await getDocs(unitsRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Unit));
  } catch (error: any) {
    logger.error('Error fetching units:', error);
    throw new Error('Failed to fetch units');
  }
};

export const createUnit = async (name: string): Promise<Unit> => {
  try {
    const unitsRef = collection(db, 'units');
    const docRef = await addDoc(unitsRef, { name });
    
    return {
      id: docRef.id,
      name
    };
  } catch (error: any) {
    logger.error('Error creating unit:', error);
    throw new Error('Failed to create unit');
  }
};

export const updateUnit = async (id: string, name: string): Promise<void> => {
  try {
    const unitRef = doc(db, 'units', id);
    await updateDoc(unitRef, { name });
  } catch (error: any) {
    logger.error('Error updating unit:', error);
    throw new Error('Failed to update unit');
  }
};

export const deleteUnit = async (id: string): Promise<void> => {
  try {
    const unitRef = doc(db, 'units', id);
    await deleteDoc(unitRef);
  } catch (error: any) {
    logger.error('Error deleting unit:', error);
    throw new Error('Failed to delete unit');
  }
};

// --- USERS ---

export const fetchUsers = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uid: (doc.data().uid as string) || '',
      email: (doc.data().email as string) || doc.id
    } as User));
  } catch (error: any) {
    logger.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
};

export const updateUser = async (updatedUser: User): Promise<void> => {
  try {
    const emailKey = updatedUser.email.trim().toLowerCase();
    const docId = updatedUser.id || updatedUser.uid || emailKey;
    if (!docId) {
      throw new Error('User ID is required to update a user.');
    }
    const userRef = doc(db, 'users', docId);
    const updateData: Partial<User> = {
      displayName: updatedUser.displayName,
      role: updatedUser.role,
      department: updatedUser.department || null,
      status: updatedUser.status || 'ACTIVE',
      avatarUrl: updatedUser.avatarUrl || null,
      avatar: updatedUser.avatar || null,
      canApproveUsers: updatedUser.canApproveUsers ?? false
    };

    if (updatedUser.uid) {
      updateData.uid = updatedUser.uid;
    }

    await updateDoc(userRef, updateData);
  } catch (error: any) {
    logger.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }
};

export const createUser = async (user: UserInvite): Promise<void> => {
  try {
    const emailKey = user.email.trim().toLowerCase();
    if (!emailKey) {
      throw new Error('Email is required to invite a user.');
    }
    const userRef = doc(db, 'users', emailKey);
    await setDoc(userRef, {
      email: emailKey,
      displayName: user.displayName || null,
      role: user.role,
      createdAt: serverTimestamp(),
      department: user.department || null,
      status: 'PENDING',
      avatarUrl: user.avatarUrl || null,
      avatar: { bgColor: colorFromString(emailKey) }
    }, { merge: true });
  } catch (error: any) {
    logger.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
};

export const deleteUser = async (email: string): Promise<void> => {
  try {
    const emailKey = email.trim().toLowerCase();
    if (!emailKey) {
      throw new Error('Email is required to delete a user.');
    }
    const userRef = doc(db, 'users', emailKey);
    await deleteDoc(userRef);
  } catch (error: any) {
    logger.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
};

// --- NOTIFICATIONS ---

export const fetchNotifications = async (userId: string, role: UserRole): Promise<Notification[]> => {
  try {
    const notificationsRef = collection(db, 'notifications');

    // We avoid downloading the entire collection.
    // Firestore doesn't support OR queries in the old style, so we run multiple targeted queries and merge.
    const baseConstraints = [orderBy('timestamp', 'desc'), limit(50)];

    const queries: any[] = [
      // Broadcast notifications (only non-targeted)
      query(notificationsRef, where('recipientRole', '==', 'all'), where('targetUserId', '==', null), ...baseConstraints),
      // Role notifications (only non-targeted)
      query(notificationsRef, where('recipientRole', '==', role), where('targetUserId', '==', null), ...baseConstraints),
      // Direct-to-user notifications (must match your role to satisfy rules)
      query(notificationsRef, where('targetUserId', '==', userId), where('recipientRole', '==', role), ...baseConstraints),
    ];

    // Keep previous behaviour: Super Admin can also see Admin notifications (only non-targeted)
    if (role === UserRole.SUPER_ADMIN) {
      queries.push(query(notificationsRef, where('recipientRole', '==', UserRole.ADMIN), where('targetUserId', '==', null), ...baseConstraints));
    }

    const snapshots = await Promise.all(queries.map((q) => getDocs(q)));

    const byId = new Map<string, Notification>();
    for (const snap of snapshots) {
      for (const d of snap.docs) {
        const data: any = d.data();
        byId.set(d.id, {
          id: d.id,
          ...data,
          timestamp: data.timestamp?.toMillis?.() || data.timestamp,
        } as Notification);
      }
    }

    return [...byId.values()]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 50);
  } catch (error: any) {
    // Use console to avoid any runtime logger symbol issues in production bundles
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
};

export const addNotification = async (
  notif: Omit<Notification, 'id' | 'timestamp' | 'isRead'>
): Promise<void> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    
    await addDoc(notificationsRef, {
      ...notif,
      createdBy: (notif as any).createdBy || null,
      targetUserId: (notif as any).targetUserId || null,
      isRead: false,
      timestamp: Timestamp.now()
    });
  } catch (error: any) {
    logger.error('Error adding notification:', error);
    throw new Error('Failed to add notification');
  }
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  try {
    const notifRef = doc(db, 'notifications', id);
    await updateDoc(notifRef, { isRead: true });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
};

export const markAllNotificationsAsRead = async (userId: string, role: UserRole): Promise<void> => {
  try {
    const notificationsRef = collection(db, 'notifications');

    // NOTE: Mark-all-read does not need ordering; removing orderBy avoids requiring composite indexes
    // across (recipientRole/targetUserId/isRead/timestamp) which can fail in production.
    const baseConstraints = [where('isRead', '==', false), limit(200)];
    const queries: any[] = [
      query(notificationsRef, where('recipientRole', '==', 'all'), where('targetUserId', '==', null), ...baseConstraints),
      query(notificationsRef, where('recipientRole', '==', role), where('targetUserId', '==', null), ...baseConstraints),
      query(notificationsRef, where('targetUserId', '==', userId), where('recipientRole', '==', role), ...baseConstraints),
    ];

    if (role === UserRole.SUPER_ADMIN) {
      queries.push(query(notificationsRef, where('recipientRole', '==', UserRole.ADMIN), where('targetUserId', '==', null), ...baseConstraints));
    }

    const snapshots = await Promise.all(queries.map((q) => getDocs(q)));
    const toUpdate = new Map<string, any>();
    for (const snap of snapshots) {
      for (const d of snap.docs) {
        toUpdate.set(d.id, d.ref);
      }
    }

    const refs = [...toUpdate.values()];
    if (refs.length === 0) return;

    const batch = writeBatch(db);
    refs.forEach((ref) => batch.update(ref, { isRead: true }));
    await batch.commit();
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark notifications as read');
  }
};

// --- TICKETS ---

const toMillis = (value: any): number => value?.toMillis?.() || value || 0;

const normalizeTicket = (docSnap: any): Ticket => {
  const data = docSnap.data();
  const messages = (data.messages || []).map((msg: any) => ({
    ...msg,
    createdAt: toMillis(msg.createdAt)
  }));

  return {
    ...data,
    id: docSnap.id,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    messages
  } as Ticket;
};

const buildTicketMessage = (
  text: string,
  senderId: string,
  senderRole: UserRole.USER | UserRole.SUPER_ADMIN
): TicketMessage => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  senderId,
  senderRole,
  text,
  createdAt: Date.now()
});

export const createTicket = async (payload: {
  uid: string;
  userEmail: string;
  userRole: UserRole.USER | UserRole.ADMIN;
  type: TicketType;
  subject: string;
  message: string;
}): Promise<string> => {
  try {
    const ticketsRef = collection(db, 'tickets');
    const initialMessage = {
      ...buildTicketMessage(payload.message, payload.uid, UserRole.USER),
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(ticketsRef, {
      uid: payload.uid,
      userEmail: payload.userEmail,
      userRole: payload.userRole,
      type: payload.type,
      subject: payload.subject,
      status: 'Pending' as TicketStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isReadByUser: true,
      isReadByAdmin: false,
      messages: [initialMessage]
    });

    await updateDoc(docRef, { ticketId: docRef.id });
    return docRef.id;
  } catch (error: any) {
    logger.error('Error creating ticket:', error);
    throw new Error('Failed to create ticket');
  }
};

export const fetchUserTickets = async (uid: string): Promise<Ticket[]> => {
  try {
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, where('uid', '==', uid), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(normalizeTicket);
  } catch (error: any) {
    logger.error('Error fetching user tickets:', error);
    throw new Error('Failed to fetch tickets');
  }
};

export const fetchAllTickets = async (): Promise<Ticket[]> => {
  try {
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(normalizeTicket);
  } catch (error: any) {
    logger.error('Error fetching tickets:', error);
    throw new Error('Failed to fetch tickets');
  }
};

export const addTicketMessage = async (
  ticketId: string,
  senderId: string,
  senderRole: UserRole.USER | UserRole.SUPER_ADMIN,
  text: string
): Promise<TicketMessage> => {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    const newMessage = {
      ...buildTicketMessage(text, senderId, senderRole),
      createdAt: Timestamp.now()
    };

    const update: Record<string, any> = {
      messages: arrayUnion(newMessage),
      updatedAt: serverTimestamp()
    };

    if (senderRole === UserRole.SUPER_ADMIN) {
      update.isReadByUser = false;
      update.isReadByAdmin = true;
      update.status = 'Replied';
    } else {
      update.isReadByAdmin = false;
      update.isReadByUser = true;
      update.status = 'Pending';
    }

    await updateDoc(ticketRef, update);
    return { ...newMessage, createdAt: Date.now() } as TicketMessage;
  } catch (error: any) {
    logger.error('Error adding ticket message:', error);
    throw new Error('Failed to send message');
  }
};

export const updateTicketStatus = async (ticketId: string, status: TicketStatus): Promise<void> => {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
      status,
      updatedAt: serverTimestamp(),
      isReadByUser: false,
      isReadByAdmin: true
    });
  } catch (error: any) {
    logger.error('Error updating ticket status:', error);
    throw new Error('Failed to update ticket status');
  }
};

export const updateTicketStatusByUser = async (ticketId: string, status: TicketStatus): Promise<void> => {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
      status,
      updatedAt: serverTimestamp(),
      isReadByAdmin: false,
      isReadByUser: true
    });
  } catch (error: any) {
    logger.error('Error updating ticket status:', error);
    throw new Error('Failed to update ticket status');
  }
};

export const markTicketReadByUser = async (ticketId: string): Promise<void> => {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, { isReadByUser: true });
  } catch (error: any) {
    logger.error('Error marking ticket as read by user:', error);
    throw new Error('Failed to update ticket read state');
  }
};

export const markTicketReadByAdmin = async (ticketId: string): Promise<void> => {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, { isReadByAdmin: true });
  } catch (error: any) {
    logger.error('Error marking ticket as read by admin:', error);
    throw new Error('Failed to update ticket read state');
  }
};

// --- SYSTEM UTILITIES ---

export const clearAllData = async (): Promise<void> => {
  try {
    const collections = ['rooms', 'bookings', 'units', 'notifications'];
    
    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      const batch = writeBatch(db);

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    }
  } catch (error: any) {
    logger.error('Error clearing data:', error);
    throw new Error('Failed to clear data');
  }
};
