import type { IncomingHttpHeaders } from 'node:http';
import nodemailer from 'nodemailer';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { JWT } from 'google-auth-library';

type FirebaseAdminEnv = {
  FIREBASE_ADMIN_PROJECT_ID?: string;
  FIREBASE_ADMIN_CLIENT_EMAIL?: string;
  FIREBASE_ADMIN_PRIVATE_KEY?: string;
};

type EmailEnv = FirebaseAdminEnv & {
  EMAIL_ENABLED?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  ADMIN_NOTIFICATION_EMAILS?: string;
};

const APP_NAME = 'Meeting Booking System';
const FIREBASE_APP_NAME = 'meeting-booking-system-server';
const COMMUNICATION_SETTINGS_DOC_ID = 'communications';
const DATASTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const DEFAULT_DATABASE_ID = '(default)';

const BOOKING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];
type EmailTemplateKey =
  | 'invite'
  | 'booking_pending'
  | 'booking_approved'
  | 'booking_rejected';

type CommunicationSettings = {
  templates: Record<
    EmailTemplateKey,
    {
      subject: string;
      body: string;
      updatedAt?: number;
      updatedBy?: string;
    }
  >;
};

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

type InvitePayload = {
  event: 'invite';
  invite: {
    email: string;
    inviteUrl: string;
    invitedByName?: string;
  };
};

type BookingSubmittedPayload = {
  event: 'booking_submitted';
  booking: {
    id: string;
  };
};

type BookingStatusPayload = {
  event: 'booking_status';
  booking: {
    id: string;
    status?: BookingStatus;
  };
};

type EmailPayload = InvitePayload | BookingSubmittedPayload | BookingStatusPayload;

type EmailHandlerInput = {
  method?: string;
  rawBody: unknown;
  env: EmailEnv;
  headers?: IncomingHttpHeaders | Record<string, unknown>;
};

type EmailHandlerResult = {
  status: number;
  body: {
    ok: boolean;
    disabled?: boolean;
    message?: string;
  };
};

type StoredBooking = {
  id: string;
  userId: string;
  guestName: string;
  guestEmail: string;
  venueName: string;
  date: string;
  startTime: string;
  endTime: string;
  eventTitle: string;
  status: BookingStatus;
};

type ServerAuthenticatedUser = {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  isActive: boolean;
};

const EMAIL_TEMPLATE_PLACEHOLDERS: Record<EmailTemplateKey, string[]> = {
  invite: ['appName', 'recipientEmail', 'inviteUrl', 'invitedByName'],
  booking_pending: [
    'appName',
    'guestName',
    'guestEmail',
    'venueName',
    'date',
    'startTime',
    'endTime',
    'eventTitle',
    'bookingId',
    'status',
  ],
  booking_approved: [
    'appName',
    'guestName',
    'guestEmail',
    'venueName',
    'date',
    'startTime',
    'endTime',
    'eventTitle',
    'bookingId',
    'status',
  ],
  booking_rejected: [
    'appName',
    'guestName',
    'guestEmail',
    'venueName',
    'date',
    'startTime',
    'endTime',
    'eventTitle',
    'bookingId',
    'status',
  ],
};

const DEFAULT_EMAIL_TEMPLATES: CommunicationSettings['templates'] = {
  invite: {
    subject: `You have been invited to join ${APP_NAME}`,
    body:
      'Hello,\n\n{{invitedByName}} invited you to create your booking account in {{appName}}.\n\nCreate your account here:\n{{inviteUrl}}\n\nThis invitation was addressed to {{recipientEmail}}.\n\nIf you were not expecting this invite, you can ignore this email.',
  },
  booking_pending: {
    subject: 'Booking request received: {{eventTitle}}',
    body:
      'Hello {{guestName}},\n\nYour booking request has been submitted to {{appName}} and is now pending review.\n\nVenue: {{venueName}}\nDate: {{date}}\nTime: {{startTime}} - {{endTime}}\nEvent: {{eventTitle}}\nReference: {{bookingId}}\nStatus: {{status}}\n\nWe will notify you once a decision is made.',
  },
  booking_approved: {
    subject: 'Booking approved: {{eventTitle}}',
    body:
      'Hello {{guestName}},\n\nYour booking has been approved.\n\nVenue: {{venueName}}\nDate: {{date}}\nTime: {{startTime}} - {{endTime}}\nEvent: {{eventTitle}}\nReference: {{bookingId}}\nStatus: {{status}}\n\nPlease proceed with your meeting arrangements.',
  },
  booking_rejected: {
    subject: 'Booking rejected: {{eventTitle}}',
    body:
      'Hello {{guestName}},\n\nYour booking has been rejected.\n\nVenue: {{venueName}}\nDate: {{date}}\nTime: {{startTime}} - {{endTime}}\nEvent: {{eventTitle}}\nReference: {{bookingId}}\nStatus: {{status}}\n\nPlease contact the administrator if you need further clarification.',
  },
};

const PLACEHOLDER_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

let cachedFirestoreClient: JWT | null = null;
let cachedFirestoreClientKey = '';

const parseBody = (rawBody: unknown): EmailPayload | null => {
  if (!rawBody) {
    return null;
  }

  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody) as EmailPayload;
    } catch {
      return null;
    }
  }

  return rawBody as EmailPayload;
};

const readString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const normalizePrivateKey = (value?: string) =>
  value ? value.replace(/\\n/g, '\n') : undefined;

const getFirebaseAdminApp = (env: FirebaseAdminEnv): App => {
  const projectId = env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin credentials are not configured.');
  }

  if (getApps().some((app) => app.name === FIREBASE_APP_NAME)) {
    return getApp(FIREBASE_APP_NAME);
  }

  return initializeApp(
    {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    },
    FIREBASE_APP_NAME
  );
};

const getFirebaseAdminAuth = (env: FirebaseAdminEnv) =>
  getAuth(getFirebaseAdminApp(env));

const requireFirestoreCredentials = (env: FirebaseAdminEnv) => {
  const projectId = env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin credentials are not configured.');
  }

  return { projectId, clientEmail, privateKey };
};

const getFirestoreClient = (env: FirebaseAdminEnv) => {
  const { projectId, clientEmail, privateKey } = requireFirestoreCredentials(env);
  const cacheKey = `${projectId}:${clientEmail}:${privateKey.length}`;

  if (!cachedFirestoreClient || cachedFirestoreClientKey !== cacheKey) {
    cachedFirestoreClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [DATASTORE_SCOPE],
    });
    cachedFirestoreClientKey = cacheKey;
  }

  return {
    projectId,
    client: cachedFirestoreClient,
  };
};

const decodeFirestoreValue = (value: FirestoreValue | undefined): unknown => {
  if (!value) {
    return null;
  }

  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
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

const getFirestoreDocument = async (
  documentPath: string,
  env: FirebaseAdminEnv
): Promise<Record<string, unknown> | null> => {
  const { projectId, client } = getFirestoreClient(env);
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

const authenticateServerRequest = async (
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
    raw.role === USER_ROLE.ADMIN
      ? USER_ROLE.ADMIN
      : raw.role === USER_ROLE.USER
        ? USER_ROLE.USER
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

const getConfig = (env: EmailEnv) => {
  const smtpPort = Number(env.SMTP_PORT || '587');
  const smtpSecure = env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpUser = env.SMTP_USER;

  return {
    emailEnabled: env.EMAIL_ENABLED === 'true',
    smtpHost: env.SMTP_HOST,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass: env.SMTP_PASS,
    smtpFrom: env.SMTP_FROM || smtpUser,
    adminNotificationEmails: (env.ADMIN_NOTIFICATION_EMAILS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  };
};

const isEmailConfigured = (env: EmailEnv) => {
  const config = getConfig(env);
  return (
    config.emailEnabled &&
    Boolean(config.smtpHost && config.smtpUser && config.smtpPass && config.smtpFrom)
  );
};

const createTransporter = (env: EmailEnv) => {
  const config = getConfig(env);

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
};

const buildDefaultCommunicationSettings = (): CommunicationSettings => ({
  templates: {
    invite: { ...DEFAULT_EMAIL_TEMPLATES.invite },
    booking_pending: { ...DEFAULT_EMAIL_TEMPLATES.booking_pending },
    booking_approved: { ...DEFAULT_EMAIL_TEMPLATES.booking_approved },
    booking_rejected: { ...DEFAULT_EMAIL_TEMPLATES.booking_rejected },
  },
});

const renderTemplate = (input: string, tokens: Record<string, string>) =>
  input.replace(PLACEHOLDER_PATTERN, (_, token: string) => tokens[token] ?? '');

const normalizeTemplate = (
  key: EmailTemplateKey,
  raw: unknown
): CommunicationSettings['templates'][EmailTemplateKey] => {
  const defaults = buildDefaultCommunicationSettings().templates[key];

  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const data = raw as Record<string, unknown>;

  return {
    subject: readString(data.subject, defaults.subject),
    body: readString(data.body, defaults.body),
    updatedAt: readNumber(data.updatedAt),
    updatedBy: readString(data.updatedBy) || undefined,
  };
};

const loadCommunicationSettings = async (env: EmailEnv): Promise<CommunicationSettings> => {
  const defaults = buildDefaultCommunicationSettings();
  const raw = await getFirestoreDocument(
    `appSettings/${COMMUNICATION_SETTINGS_DOC_ID}`,
    env
  );

  if (!raw) {
    return defaults;
  }

  const templates =
    raw.templates && typeof raw.templates === 'object'
      ? (raw.templates as Record<string, unknown>)
      : {};

  return {
    templates: {
      invite: normalizeTemplate('invite', templates.invite),
      booking_pending: normalizeTemplate('booking_pending', templates.booking_pending),
      booking_approved: normalizeTemplate('booking_approved', templates.booking_approved),
      booking_rejected: normalizeTemplate('booking_rejected', templates.booking_rejected),
    },
  };
};

const fetchBookingById = async (
  bookingId: string,
  env: EmailEnv
): Promise<StoredBooking | null> => {
  const raw = await getFirestoreDocument(`bookings/${bookingId}`, env);

  if (!raw) {
    return null;
  }

  return {
    id: bookingId,
    userId: readString(raw.userId),
    guestName: readString(raw.guestName),
    guestEmail: readString(raw.guestEmail),
    venueName: readString(raw.venueName),
    date: readString(raw.date),
    startTime: readString(raw.startTime),
    endTime: readString(raw.endTime),
    eventTitle: readString(raw.eventTitle),
    status: readString(raw.status) as BookingStatus,
  };
};

const bookingDetails = (booking: StoredBooking) => `
Venue: ${booking.venueName}
Date: ${booking.date}
Time: ${booking.startTime} - ${booking.endTime}
Event: ${booking.eventTitle}
Reference: ${booking.id}
`;

const statusLabel = (status: BookingStatus) => {
  switch (status) {
    case BOOKING_STATUS.APPROVED:
      return 'approved';
    case BOOKING_STATUS.REJECTED:
      return 'rejected';
    case BOOKING_STATUS.CANCELLED:
      return 'cancelled';
    default:
      return status;
  }
};

const resolveEmailTemplate = (
  settings: CommunicationSettings,
  key: EmailTemplateKey
) => {
  const fallback = buildDefaultCommunicationSettings().templates[key];
  const current = settings.templates[key];

  return {
    subject: current.subject || fallback.subject,
    body: current.body || fallback.body,
  };
};

const buildBookingTokens = (booking: StoredBooking) => ({
  appName: APP_NAME,
  guestName: booking.guestName,
  guestEmail: booking.guestEmail,
  venueName: booking.venueName,
  date: booking.date,
  startTime: booking.startTime,
  endTime: booking.endTime,
  eventTitle: booking.eventTitle,
  bookingId: booking.id,
  status: statusLabel(booking.status),
});

const buildInviteTokens = (payload: InvitePayload['invite'], invitedByName: string) => ({
  appName: APP_NAME,
  recipientEmail: payload.email,
  inviteUrl: payload.inviteUrl,
  invitedByName,
});

const toSafeErrorMessage = (error: unknown) => {
  if (!(error instanceof Error) || !error.message.trim()) {
    return 'Unable to send email.';
  }

  const message = error.message.trim();
  const lower = message.toLowerCase();

  if (lower.includes('firebase admin credentials are not configured')) {
    return 'Server email setup is incomplete: Firebase Admin credentials are missing.';
  }

  if (
    lower.includes('invalid_grant') ||
    lower.includes('private key') ||
    lower.includes('decoding jwt') ||
    lower.includes('credential')
  ) {
    return 'Server email setup is invalid: Firebase Admin credentials could not be used.';
  }

  if (
    lower.includes('eauth') ||
    lower.includes('invalid login') ||
    lower.includes('authentication unsuccessful') ||
    lower.includes('535') ||
    lower.includes('534')
  ) {
    return 'SMTP authentication failed. Check SMTP username, password, and sender settings.';
  }

  if (
    lower.includes('econn') ||
    lower.includes('esocket') ||
    lower.includes('etimedout') ||
    lower.includes('enotfound') ||
    lower.includes('certificate')
  ) {
    return 'SMTP connection failed. Check SMTP host, port, security mode, and provider access rules.';
  }

  if (
    lower.includes('permission_denied') ||
    lower.includes('insufficient permission') ||
    lower.includes('firestore')
  ) {
    return 'Server could not read Firestore data needed for email delivery.';
  }

  return message;
};

export const handleEmailRequest = async ({
  method,
  rawBody,
  env,
  headers,
}: EmailHandlerInput): Promise<EmailHandlerResult> => {
  if (method !== 'POST') {
    return {
      status: 405,
      body: { ok: false, message: 'Method not allowed.' },
    };
  }

  if (!isEmailConfigured(env)) {
    return {
      status: 202,
      body: { ok: true, disabled: true },
    };
  }

  const body = parseBody(rawBody);

  if (!body?.event) {
    return {
      status: 400,
      body: { ok: false, message: 'Invalid email payload.' },
    };
  }

  let caller: ServerAuthenticatedUser;

  try {
    caller = await authenticateServerRequest(headers, env);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Authentication failed.';

    return {
      status: message.includes('configured') ? 500 : 401,
      body: {
        ok: false,
        message,
      },
    };
  }

  try {
    const mailer = createTransporter(env);
    const config = getConfig(env);
    const settings = await loadCommunicationSettings(env);

    if (body.event === 'invite') {
      if (caller.role !== USER_ROLE.ADMIN) {
        return {
          status: 403,
          body: { ok: false, message: 'Only admins may send invite emails.' },
        };
      }

      const template = resolveEmailTemplate(settings, 'invite');
      const tokens = buildInviteTokens(body.invite, caller.displayName);

      await mailer.sendMail({
        from: config.smtpFrom,
        to: body.invite.email,
        subject: renderTemplate(template.subject, tokens),
        text: renderTemplate(template.body, tokens),
      });

      return {
        status: 200,
        body: { ok: true },
      };
    }

    if (body.event === 'booking_submitted') {
      const booking = await fetchBookingById(body.booking.id, env);

      if (!booking) {
        return {
          status: 404,
          body: { ok: false, message: 'Booking not found.' },
        };
      }

      if (booking.userId !== caller.uid) {
        return {
          status: 403,
          body: {
            ok: false,
            message: 'You may only send the pending confirmation for your own booking.',
          },
        };
      }

      const template = resolveEmailTemplate(settings, 'booking_pending');
      const tokens = buildBookingTokens(booking);

      await mailer.sendMail({
        from: config.smtpFrom,
        to: booking.guestEmail,
        subject: renderTemplate(template.subject, tokens),
        text: renderTemplate(template.body, tokens),
      });

      if (config.adminNotificationEmails.length > 0) {
        await mailer.sendMail({
          from: config.smtpFrom,
          to: config.adminNotificationEmails,
          subject: `New booking request: ${booking.eventTitle}`,
          text: `A new booking request was submitted.\n\n${bookingDetails(booking)}`,
        });
      }

      return {
        status: 200,
        body: { ok: true },
      };
    }

    const booking = await fetchBookingById(body.booking.id, env);

    if (!booking) {
      return {
        status: 404,
        body: { ok: false, message: 'Booking not found.' },
      };
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      if (caller.uid !== booking.userId && caller.role !== USER_ROLE.ADMIN) {
        return {
          status: 403,
          body: {
            ok: false,
            message: 'You may only send cancellation email for your own booking.',
          },
        };
      }

      await mailer.sendMail({
        from: config.smtpFrom,
        to: booking.guestEmail,
        subject: `Booking cancelled: ${booking.eventTitle}`,
        text: `Hello ${booking.guestName},\n\nYour booking has been cancelled.\n\n${bookingDetails(booking)}`,
      });

      return {
        status: 200,
        body: { ok: true },
      };
    }

    if (caller.role !== USER_ROLE.ADMIN) {
      return {
        status: 403,
        body: {
          ok: false,
          message: 'Only admins may send approval or rejection emails.',
        },
      };
    }

    const templateKey =
      booking.status === BOOKING_STATUS.APPROVED
        ? 'booking_approved'
        : booking.status === BOOKING_STATUS.REJECTED
          ? 'booking_rejected'
          : null;

    if (!templateKey) {
      return {
        status: 400,
        body: {
          ok: false,
          message: 'Booking status does not support templated email delivery.',
        },
      };
    }

    const template = resolveEmailTemplate(settings, templateKey);
    const tokens = buildBookingTokens(booking);

    await mailer.sendMail({
      from: config.smtpFrom,
      to: booking.guestEmail,
      subject: renderTemplate(template.subject, tokens),
      text: renderTemplate(template.body, tokens),
    });

    return {
      status: 200,
      body: { ok: true },
    };
  } catch (error) {
    console.error('Email handler failed:', {
      event: body.event,
      callerUid: caller.uid,
      error,
    });

    return {
      status: 500,
      body: { ok: false, message: toSafeErrorMessage(error) },
    };
  }
};

export default async function handler(req: any, res: any) {
  try {
    const result = await handleEmailRequest({
      method: req.method,
      rawBody: req.body,
      env: process.env,
      headers: req.headers,
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('API send-email route failed:', error);

    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'Email API crashed before a response could be returned.';

    res.status(500).json({
      ok: false,
      message,
    });
  }
}
