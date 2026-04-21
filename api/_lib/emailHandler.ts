import type { IncomingHttpHeaders } from 'node:http';
import nodemailer from 'nodemailer';
import { APP_CONFIG } from '../../config/appConfig';
import {
  buildDefaultCommunicationSettings,
  COMMUNICATION_SETTINGS_DOC_ID,
  renderTemplate,
} from '../../config/communications';
import type { CommunicationSettings, EmailTemplateKey } from '../../types';
import type { FirebaseAdminEnv } from './firebaseAdmin';
import { getFirestoreDocument } from './firestoreAdmin';
import { authenticateServerRequest } from './requestAuth';

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

export type EmailHandlerResult = {
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

const transporter = (env: EmailEnv) => {
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
  appName: APP_CONFIG.APP_NAME,
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
  appName: APP_CONFIG.APP_NAME,
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

  let caller;

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
    const mailer = transporter(env);
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
