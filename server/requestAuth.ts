import type { IncomingHttpHeaders } from 'node:http';
import { getFirebaseAdminAuth, type FirebaseAdminEnv } from './firebaseAdmin';
import { getFirestoreDocument } from './firestoreAdmin';
import { UserRole } from '../types';

export type ServerAuthenticatedUser = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
};

const readString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value.trim() : fallback;

const extractBearerToken = (headers?: IncomingHttpHeaders | Record<string, unknown>) => {
  const authorizationHeader =
    headers && 'authorization' in headers ? headers.authorization : undefined;
  const legacyAuthorizationHeader =
    headers && 'Authorization' in headers ? headers.Authorization : undefined;
  const authorization =
    typeof authorizationHeader === 'string'
      ? authorizationHeader
      : typeof legacyAuthorizationHeader === 'string'
        ? legacyAuthorizationHeader
        : '';

  if (!authorization.startsWith('Bearer ')) {
    return '';
  }

  return authorization.slice('Bearer '.length).trim();
};

export const authenticateServerRequest = async (
  headers: IncomingHttpHeaders | Record<string, unknown> | undefined,
  env: FirebaseAdminEnv
): Promise<ServerAuthenticatedUser> => {
  const token = extractBearerToken(headers);

  if (!token) {
    throw new Error('Missing authorization token.');
  }

  const decoded = await getFirebaseAdminAuth(env).verifyIdToken(token);
  const raw = await getFirestoreDocument(`users/${decoded.uid}`, env);

  if (!raw) {
    throw new Error('Authenticated user is not provisioned for this application.');
  }
  const role =
    raw.role === UserRole.ADMIN
      ? UserRole.ADMIN
      : raw.role === UserRole.USER
        ? UserRole.USER
        : null;

  if (!role) {
    throw new Error('Authenticated user has an invalid role.');
  }

  const isActive = typeof raw.isActive === 'boolean' ? raw.isActive : true;

  if (!isActive) {
    throw new Error('Authenticated user is inactive.');
  }

  return {
    uid: decoded.uid,
    email: readString(raw.email, decoded.email || ''),
    displayName: readString(raw.displayName, decoded.email || 'User'),
    role,
    isActive,
  };
};
