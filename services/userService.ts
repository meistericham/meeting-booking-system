import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { AppUser, UserRole } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const normalizeAppUser = (
  uid: string,
  raw: unknown
): AppUser | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const email = readString(raw.email);
  const displayName = readString(raw.displayName, email || 'User');
  const role =
    raw.role === UserRole.ADMIN
      ? UserRole.ADMIN
      : raw.role === UserRole.USER
        ? UserRole.USER
        : null;

  if (!email || !role) {
    return null;
  }

  const avatar = isRecord(raw.avatar)
    ? {
        bgColor: readString(raw.avatar.bgColor) || undefined,
      }
    : undefined;

  return {
    uid,
    email,
    displayName,
    role,
    isActive: typeof raw.isActive === 'boolean' ? raw.isActive : true,
    avatar,
    phoneNumber: readString(raw.phoneNumber) || undefined,
    organization: readString(raw.organization) || undefined,
    createdAt: readNumber(raw.createdAt),
    updatedAt: readNumber(raw.updatedAt),
  };
};

export const fetchUserById = async (uid: string): Promise<AppUser | null> => {
  const userDocRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userDocRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeAppUser(uid, snapshot.data());
};

export const fetchUsers = async (): Promise<AppUser[]> => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);

  return snapshot.docs
    .map((userDoc) => normalizeAppUser(userDoc.id, userDoc.data()))
    .filter((user): user is AppUser => Boolean(user))
    .sort((a, b) => {
      if (a.role !== b.role) {
        return a.role === 'admin' ? -1 : 1;
      }

      return a.displayName.localeCompare(b.displayName);
    });
};

export const fetchActiveAdminUsers = async (): Promise<AppUser[]> => {
  const usersRef = collection(db, 'users');
  const adminsQuery = query(usersRef, where('role', '==', UserRole.ADMIN));
  const snapshot = await getDocs(adminsQuery);

  return snapshot.docs
    .map((userDoc) => normalizeAppUser(userDoc.id, userDoc.data()))
    .filter(
      (user): user is AppUser =>
        Boolean(user) && user.role === UserRole.ADMIN && user.isActive !== false
    );
};

export const updateUserActiveState = async (
  uid: string,
  isActive: boolean
): Promise<void> => {
  await setDoc(
    doc(db, 'users', uid),
    {
      isActive,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};
