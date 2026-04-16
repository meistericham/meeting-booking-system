import nodemailer from 'nodemailer';
import { BookingStatus } from '../types';

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const ADMIN_NOTIFICATION_EMAILS = (process.env.ADMIN_NOTIFICATION_EMAILS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

type InvitePayload = {
  event: 'invite';
  invite: {
    email: string;
    inviteUrl: string;
    invitedByName: string;
  };
};

type BookingSubmittedPayload = {
  event: 'booking_submitted';
  booking: {
    id: string;
    guestName: string;
    guestEmail: string;
    venueName: string;
    date: string;
    startTime: string;
    endTime: string;
    eventTitle: string;
  };
};

type BookingStatusPayload = {
  event: 'booking_status';
  booking: {
    id: string;
    guestName: string;
    guestEmail: string;
    venueName: string;
    date: string;
    startTime: string;
    endTime: string;
    eventTitle: string;
    status: BookingStatus;
  };
};

type EmailPayload = InvitePayload | BookingSubmittedPayload | BookingStatusPayload;

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

const isEmailConfigured = () =>
  EMAIL_ENABLED && Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM);

const transporter = () =>
  nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

const bookingDetails = (booking: {
  venueName: string;
  date: string;
  startTime: string;
  endTime: string;
  eventTitle: string;
  id: string;
}) => `
Venue: ${booking.venueName}
Date: ${booking.date}
Time: ${booking.startTime} - ${booking.endTime}
Event: ${booking.eventTitle}
Reference: ${booking.id}
`;

const statusLabel = (status: BookingStatus) => {
  switch (status) {
    case BookingStatus.APPROVED:
      return 'approved';
    case BookingStatus.REJECTED:
      return 'rejected';
    case BookingStatus.CANCELLED:
      return 'cancelled';
    default:
      return status;
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'Method not allowed.' });
    return;
  }

  if (!isEmailConfigured()) {
    res.status(202).json({ ok: true, disabled: true });
    return;
  }

  const body = parseBody(req.body);

  if (!body?.event) {
    res.status(400).json({ ok: false, message: 'Invalid email payload.' });
    return;
  }

  try {
    const mailer = transporter();

    if (body.event === 'invite') {
      await mailer.sendMail({
        from: SMTP_FROM,
        to: body.invite.email,
        subject: 'You have been invited to join the venue booking system',
        text: `Hello,\n\n${body.invite.invitedByName} invited you to create your booking account.\n\nCreate your account here:\n${body.invite.inviteUrl}\n\nIf you were not expecting this invite, you can ignore this email.`,
      });
    }

    if (body.event === 'booking_submitted') {
      const submittedText = `Hello ${body.booking.guestName},\n\nYour booking request has been submitted and is now pending review.\n\n${bookingDetails(body.booking)}`;

      await mailer.sendMail({
        from: SMTP_FROM,
        to: body.booking.guestEmail,
        subject: `Booking request received: ${body.booking.eventTitle}`,
        text: submittedText,
      });

      if (ADMIN_NOTIFICATION_EMAILS.length > 0) {
        await mailer.sendMail({
          from: SMTP_FROM,
          to: ADMIN_NOTIFICATION_EMAILS,
          subject: `New booking request: ${body.booking.eventTitle}`,
          text: `A new booking request was submitted.\n\n${bookingDetails(body.booking)}`,
        });
      }
    }

    if (body.event === 'booking_status') {
      const label = statusLabel(body.booking.status);
      await mailer.sendMail({
        from: SMTP_FROM,
        to: body.booking.guestEmail,
        subject: `Booking ${label}: ${body.booking.eventTitle}`,
        text: `Hello ${body.booking.guestName},\n\nYour booking has been ${label}.\n\n${bookingDetails(body.booking)}`,
      });
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Email handler failed:', error);
    res.status(500).json({ ok: false, message: 'Unable to send email.' });
  }
}
