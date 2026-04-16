import { Booking, BookingStatus } from '../types';

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
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Unable to queue email notification.');
  }
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
