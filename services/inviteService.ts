import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ApprovedEmailInvite, UserRole } from '../types';

export const normalizeInviteEmail = (email: string) => email.trim().toLowerCase();

const mapInvite = (snapshotDoc: { id: string; data: () => unknown }) =>
  ({
    id: snapshotDoc.id,
    ...(snapshotDoc.data() as Omit<ApprovedEmailInvite, 'id'>),
  }) as ApprovedEmailInvite;

export const fetchApprovedEmailInviteByEmail = async (
  email: string
): Promise<ApprovedEmailInvite | null> => {
  const normalizedEmail = normalizeInviteEmail(email);
  const inviteRef = doc(db, 'approvedEmails', normalizedEmail);
  const snapshot = await getDoc(inviteRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapInvite(snapshot);
};

export const fetchApprovedEmailInvites = async (): Promise<ApprovedEmailInvite[]> => {
  const invitesRef = collection(db, 'approvedEmails');
  const invitesQuery = query(invitesRef, orderBy('invitedAt', 'desc'));
  const snapshot = await getDocs(invitesQuery);

  return snapshot.docs.map(mapInvite);
};

export const upsertApprovedEmailInvite = async (
  email: string,
  invitedBy: string
): Promise<ApprovedEmailInvite> => {
  const normalizedEmail = normalizeInviteEmail(email);
  const inviteRef = doc(db, 'approvedEmails', normalizedEmail);
  const existingInvite = await getDoc(inviteRef);
  const timestamp = Date.now();

  if (existingInvite.exists()) {
    const invite = mapInvite(existingInvite);

    if (invite.claimedAt) {
      throw new Error('This invite has already been claimed.');
    }

    await setDoc(
      inviteRef,
      {
        lastSentAt: timestamp,
        invitedBy,
      },
      { merge: true }
    );
  } else {
    await setDoc(inviteRef, {
      email: normalizedEmail,
      role: UserRole.USER,
      invitedBy,
      invitedAt: timestamp,
      lastSentAt: timestamp,
    });
  }

  const savedInvite = await getDoc(inviteRef);
  return mapInvite(savedInvite);
};
