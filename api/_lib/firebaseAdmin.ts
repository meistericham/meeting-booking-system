import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export type FirebaseAdminEnv = {
  FIREBASE_ADMIN_PROJECT_ID?: string;
  FIREBASE_ADMIN_CLIENT_EMAIL?: string;
  FIREBASE_ADMIN_PRIVATE_KEY?: string;
};

const APP_NAME = 'meeting-booking-system-server';

export const normalizePrivateKey = (value?: string) =>
  value ? value.replace(/\\n/g, '\n') : undefined;

export const getFirebaseAdminApp = (env: FirebaseAdminEnv): App => {
  const projectId = env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin credentials are not configured.');
  }

  if (getApps().some((app) => app.name === APP_NAME)) {
    return getApp(APP_NAME);
  }

  return initializeApp(
    {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    },
    APP_NAME
  );
};

export const getFirebaseAdminAuth = (env: FirebaseAdminEnv) =>
  getAuth(getFirebaseAdminApp(env));
