import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock3, Loader2, Mail, Phone } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../services/authContext';
import { fetchBookingById } from '../services/dataService';
import { Booking } from '../types';

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const BookingConfirmationPage: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBooking = async () => {
      if (!id || !user) {
        setError('Booking reference is missing.');
        setLoading(false);
        return;
      }

      try {
        const data = await fetchBookingById(id);

        if (!data || data.userId !== user.uid) {
          setError('Booking request not found.');
        } else {
          setBooking(data);
        }
      } catch {
        setError('Unable to load your booking request right now.');
      } finally {
        setLoading(false);
      }
    };

    void loadBooking();
  }, [id, user]);

  return (
    <PublicLayout>
      <section className="bg-gray-50 py-12 dark:bg-gray-950 md:py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
            </div>
          ) : error || !booking ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Confirmation unavailable
              </h1>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {error || 'We could not find that booking request.'}
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  to="/book"
                  className="rounded-xl bg-brand-maroon px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c]"
                >
                  Create a new booking
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-green-700 dark:bg-green-900/20 dark:text-green-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Request submitted
                    </div>
                    <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
                      Booking confirmation
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                      Your booking request has been recorded under your account and is now
                      waiting for admin review.
                    </p>
                  </div>
                  <StatusBadge status={booking.status} className="self-start" />
                </div>

                <div className="mt-6 rounded-2xl bg-gray-50 p-5 dark:bg-gray-800/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Reference ID
                  </p>
                  <p className="mt-2 break-all text-lg font-semibold text-gray-900 dark:text-white">
                    {booking.id}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Booking details
                  </h2>
                  <dl className="mt-5 space-y-4 text-sm">
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Venue</dt>
                      <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                        {booking.venueName}
                      </dd>
                    </div>
                    <div className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 h-4 w-4 text-brand-maroon dark:text-red-300" />
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Date</dt>
                        <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                          {formatDate(booking.date)}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-4 w-4 text-brand-maroon dark:text-red-300" />
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Time slot</dt>
                        <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                          {booking.startTime} - {booking.endTime}
                        </dd>
                      </div>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Event</dt>
                      <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                        {booking.eventTitle}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Expected pax</dt>
                      <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                        {booking.expectedPax}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Contact snapshot
                  </h2>
                  <dl className="mt-5 space-y-4 text-sm">
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Booked by</dt>
                      <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                        {booking.guestName}
                      </dd>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 text-brand-maroon dark:text-red-300" />
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                        <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                          {booking.guestEmail}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 text-brand-maroon dark:text-red-300" />
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
                        <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                          {booking.guestPhone}
                        </dd>
                      </div>
                    </div>
                    {booking.organization && (
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Organization</dt>
                        <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                          {booking.organization}
                        </dd>
                      </div>
                    )}
                    {booking.specialRequests && (
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Special requests</dt>
                        <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                          {booking.specialRequests}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/dashboard"
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                >
                  Back to dashboard
                </Link>
                <Link
                  to="/book"
                  className="rounded-xl bg-brand-maroon px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c]"
                >
                  Book another venue
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default BookingConfirmationPage;
