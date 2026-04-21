import { APP_CONFIG } from './appConfig';
import type { CommunicationSettings, EmailTemplateKey } from '../types';

export const COMMUNICATION_SETTINGS_DOC_ID = 'communications';

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
  invite: 'Invitation',
  booking_pending: 'Meeting Pending Confirmation',
  booking_approved: 'Meeting Approval',
  booking_rejected: 'Meeting Rejection',
};

export const EMAIL_TEMPLATE_PLACEHOLDERS: Record<EmailTemplateKey, string[]> = {
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

export const DEFAULT_EMAIL_TEMPLATES: CommunicationSettings['templates'] = {
  invite: {
    subject: `You have been invited to join ${APP_CONFIG.APP_NAME}`,
    body:
      'Hello,\n\n{{invitedByName}} invited you to create your booking account in {{appName}}.\n\nCreate your account here:\n{{inviteUrl}}\n\nThis invitation was addressed to {{recipientEmail}}.\n\nIf you were not expecting this invite, you can ignore this email.',
  },
  booking_pending: {
    subject: `Booking request received: {{eventTitle}}`,
    body:
      'Hello {{guestName}},\n\nYour booking request has been submitted to {{appName}} and is now pending review.\n\nVenue: {{venueName}}\nDate: {{date}}\nTime: {{startTime}} - {{endTime}}\nEvent: {{eventTitle}}\nReference: {{bookingId}}\nStatus: {{status}}\n\nWe will notify you once a decision is made.',
  },
  booking_approved: {
    subject: `Booking approved: {{eventTitle}}`,
    body:
      'Hello {{guestName}},\n\nYour booking has been approved.\n\nVenue: {{venueName}}\nDate: {{date}}\nTime: {{startTime}} - {{endTime}}\nEvent: {{eventTitle}}\nReference: {{bookingId}}\nStatus: {{status}}\n\nPlease proceed with your meeting arrangements.',
  },
  booking_rejected: {
    subject: `Booking rejected: {{eventTitle}}`,
    body:
      'Hello {{guestName}},\n\nYour booking has been rejected.\n\nVenue: {{venueName}}\nDate: {{date}}\nTime: {{startTime}} - {{endTime}}\nEvent: {{eventTitle}}\nReference: {{bookingId}}\nStatus: {{status}}\n\nPlease contact the administrator if you need further clarification.',
  },
};

const PLACEHOLDER_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export const extractPlaceholders = (value: string) => {
  const placeholders = new Set<string>();

  for (const match of value.matchAll(PLACEHOLDER_PATTERN)) {
    if (match[1]) {
      placeholders.add(match[1]);
    }
  }

  return Array.from(placeholders);
};

export const findUnknownPlaceholders = (
  key: EmailTemplateKey,
  value: string
) => {
  const allowed = new Set(EMAIL_TEMPLATE_PLACEHOLDERS[key]);
  return extractPlaceholders(value).filter((token) => !allowed.has(token));
};

export const buildDefaultCommunicationSettings = (): CommunicationSettings => ({
  templates: {
    invite: { ...DEFAULT_EMAIL_TEMPLATES.invite },
    booking_pending: { ...DEFAULT_EMAIL_TEMPLATES.booking_pending },
    booking_approved: { ...DEFAULT_EMAIL_TEMPLATES.booking_approved },
    booking_rejected: { ...DEFAULT_EMAIL_TEMPLATES.booking_rejected },
  },
});

export const renderTemplate = (
  input: string,
  tokens: Record<string, string>
) =>
  input.replace(PLACEHOLDER_PATTERN, (_, token: string) => tokens[token] ?? '');
