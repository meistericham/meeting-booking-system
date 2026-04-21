import { auth } from '../firebase';
import { Booking, BookingStatus } from '../types';

const EMAIL_ENABLED = import.meta.env.VITE_EMAIL_ENABLED === 'true';
const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || '/api/send-email';

type EmailEventBody =
  | {
      event: 'invite';
      invite: {
        email: string;
        inviteUrl: string;
        invitedByName: string;
      };
    }
  | {
      event: 'booking_submitted';
      booking: Pick<
        Booking,
        | 'id'
        | 'guestName'
        | 'guestEmail'
        | 'venueName'
        | 'date'
        | 'startTime'
        | 'endTime'
        | 'eventTitle'
      >;
    }
  | {
      event: 'booking_status';
      booking: Pick<
        Booking,
        | 'id'
        | 'guestName'
        | 'guestEmail'
        | 'venueName'
        | 'date'
        | 'startTime'
        | 'endTime'
        | 'eventTitle'
      > & { status: BookingStatus };
    };

const postEmailEvent = async (body: EmailEventBody) => {
  if (!EMAIL_ENABLED) {
    return;
  }

  if (!auth.currentUser) {
    throw new Error('You must be signed in to send email notifications.');
  }

  const token = await auth.currentUser.getIdToken();

  const response = await fetch(EMAIL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  let responseBody: { disabled?: boolean; message?: string } | null = null;
  let responseText = '';

  if ((response.headers.get('content-type') || '').includes('application/json')) {
    try {
      responseBody = (await response.json()) as { disabled?: boolean };
    } catch {
      responseBody = null;
    }
  } else {
    try {
      responseText = (await response.text()).trim();
    } catch {
      responseText = '';
    }
  }

  if (response.status === 404) {
    throw new Error(
      'Email endpoint is not available. Use a deployed environment or run a local API server before enabling email notifications.'
    );
  }

  if (!response.ok) {
    throw new Error(
      responseBody?.message ||
        responseText ||
        'Unable to queue email notification.'
    );
  }

  if (responseBody?.disabled) {
    throw new Error('Email notifications are currently disabled for this environment.');
  }
};

export const getEmailDeliveryWarning = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error && error.message.trim()) {
    return `${fallbackMessage} ${error.message}`;
  }

  return fallbackMessage;
};

export const sendInviteEmail = async (invite: {
  email: string;
  inviteUrl: string;
  invitedByName: string;
}) => {
  await postEmailEvent({
    event: 'invite',
    invite,
  });
};

export const sendBookingSubmittedNotifications = async (
  booking: Pick<
    Booking,
    'id' | 'guestName' | 'guestEmail' | 'venueName' | 'date' | 'startTime' | 'endTime' | 'eventTitle'
  >
) => {
  await postEmailEvent({
    event: 'booking_submitted',
    booking,
  });
};

export const sendBookingStatusEmail = async (
  booking: Pick<
    Booking,
    'id' | 'guestName' | 'guestEmail' | 'venueName' | 'date' | 'startTime' | 'endTime' | 'eventTitle'
  > & { status: BookingStatus }
) => {
  await postEmailEvent({
    event: 'booking_status',
    booking,
  });
};
