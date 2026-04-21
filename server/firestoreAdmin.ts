import { JWT } from 'google-auth-library';
import { FirebaseAdminEnv, normalizePrivateKey } from './firebaseAdmin';

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

type FirestoreDocumentResponse = {
  fields?: Record<string, FirestoreValue>;
};

const DATASTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const DEFAULT_DATABASE_ID = '(default)';

let cachedClient: JWT | null = null;
let cachedClientKey = '';

const requireCredentials = (env: FirebaseAdminEnv) => {
  const projectId = env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin credentials are not configured.');
  }

  return { projectId, clientEmail, privateKey };
};

const getClient = (env: FirebaseAdminEnv) => {
  const { projectId, clientEmail, privateKey } = requireCredentials(env);
  const cacheKey = `${projectId}:${clientEmail}:${privateKey.length}`;

  if (!cachedClient || cachedClientKey !== cacheKey) {
    cachedClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [DATASTORE_SCOPE],
    });
    cachedClientKey = cacheKey;
  }

  return {
    projectId,
    client: cachedClient,
  };
};

const decodeFirestoreValue = (value: FirestoreValue | undefined): unknown => {
  if (!value) {
    return null;
  }

  if ('stringValue' in value) {
    return value.stringValue;
  }

  if ('integerValue' in value) {
    return Number(value.integerValue);
  }

  if ('doubleValue' in value) {
    return value.doubleValue;
  }

  if ('booleanValue' in value) {
    return value.booleanValue;
  }

  if ('timestampValue' in value) {
    return value.timestampValue;
  }

  if ('nullValue' in value) {
    return null;
  }

  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map((entry) => decodeFirestoreValue(entry));
  }

  if ('mapValue' in value) {
    return decodeFirestoreFields(value.mapValue.fields || {});
  }

  return null;
};

const decodeFirestoreFields = (fields: Record<string, FirestoreValue>) =>
  Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)])
  );

export const getFirestoreDocument = async (
  documentPath: string,
  env: FirebaseAdminEnv
): Promise<Record<string, unknown> | null> => {
  const { projectId, client } = getClient(env);
  const normalizedPath = documentPath.replace(/^\/+/, '');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${DEFAULT_DATABASE_ID}/documents/${normalizedPath}`;
  try {
    const response = await client.request<FirestoreDocumentResponse>({
      url,
      method: 'GET',
    });

    if (!response.data?.fields) {
      return {};
    }

    return decodeFirestoreFields(response.data.fields);
  } catch (error) {
    const status =
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'status' in error.response &&
      typeof error.response.status === 'number'
        ? error.response.status
        : null;

    if (status === 404) {
      return null;
    }

    throw error;
  }
};
