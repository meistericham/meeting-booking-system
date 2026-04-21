import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AppNotification } from '../types';

const readString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value.trim() : fallback;

const readNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return null;
};

const mapNotification = (snapshotDoc: { id: string; data: () => unknown }): AppNotification => {
  const raw = snapshotDoc.data();
  const data =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    id: snapshotDoc.id,
    recipientUserId: readString(data.recipientUserId),
    type: readString(data.type) as AppNotification['type'],
    title: readString(data.title),
    message: readString(data.message),
    link: readString(data.link),
    bookingId: readString(data.bookingId),
    readAt: readNumberOrNull(data.readAt),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  };
};

export const subscribeToNotifications = (
  userId: string,
  onChange: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
) => {
  const notificationsQuery = query(
    collection(db, 'notifications'),
    where('recipientUserId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      onChange(snapshot.docs.map(mapNotification));
    },
    (error) => {
      onError?.(error);
    }
  );
};

export const subscribeToUnreadNotificationCount = (
  userId: string,
  onChange: (count: number) => void,
  onError?: (error: Error) => void
) => {
  const unreadQuery = query(
    collection(db, 'notifications'),
    where('recipientUserId', '==', userId),
    where('readAt', '==', null)
  );

  return onSnapshot(
    unreadQuery,
    (snapshot) => {
      onChange(snapshot.size);
    },
    (error) => {
      onError?.(error);
    }
  );
};

export const markNotificationAsRead = async (notificationId: string) => {
  await updateDoc(doc(db, 'notifications', notificationId), {
    readAt: Date.now(),
  });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const unreadQuery = query(
    collection(db, 'notifications'),
    where('recipientUserId', '==', userId),
    where('readAt', '==', null)
  );
  const snapshot = await getDocs(unreadQuery);

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(db);
  snapshot.docs.forEach((snapshotDoc) => {
    batch.update(snapshotDoc.ref, {
      readAt: Date.now(),
    });
  });

  await batch.commit();
};
