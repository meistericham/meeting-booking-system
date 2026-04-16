import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CalendarDays,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../services/authContext';
import { sendBookingStatusEmail } from '../services/emailService';
import { cancelBooking, fetchBookingsByUser } from '../services/dataService';
import { Booking, BookingStatus } from '../types';

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);

  const loadBookings = async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchBookingsByUser(user.uid);
      setBookings(data);
    } catch {
      setError('Unable to load your bookings right now.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, [user]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') {
      return bookings;
    }

    return bookings.filter((booking) => booking.status === statusFilter);
  }, [bookings, statusFilter]);

  const handleCancelBooking = async (booking: Booking) => {
    if (!user) {
      return;
    }

    setActionBookingId(booking.id);
    setError('');

    try {
      await cancelBooking(booking.id, user.uid);
      setBookings((current) =>
        current.map((currentBooking) =>
          currentBooking.id === booking.id
            ? {
                ...currentBooking,
                status: BookingStatus.CANCELLED,
                cancelledAt: Date.now(),
                cancelledBy: user.uid,
              }
            : currentBooking
        )
      );

      void sendBookingStatusEmail({
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        venueName: booking.venueName,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        eventTitle: booking.eventTitle,
        status: BookingStatus.CANCELLED,
      }).catch(() => undefined);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : 'Unable to cancel this booking.'
      );
    } finally {
      setActionBookingId(null);
    }
  };

  return (
    <PublicLayout>
      <section className="bg-gray-50 py-10 dark:bg-gray-950 md:py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-maroon/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  User Dashboard
                </div>
                <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
                  Welcome back, {user?.displayName}
                </h1>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  Review your booking statuses, cancel active requests if needed, and request
                  another venue when you are ready.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/book"
                    className="rounded-xl bg-brand-maroon px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c]"
                  >
                    Book a venue
                  </Link>
                  <Link
                    to="/venue"
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                  >
                    Browse venues
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Account Snapshot
                </h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                      {user?.email}
                    </dd>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-brand-maroon dark:text-red-300" />
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
                      <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                        {user?.phoneNumber || 'Not provided yet'}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-brand-maroon dark:text-red-300" />
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Organization</dt>
                      <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                        {user?.organization || 'Not provided yet'}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-900/10">
                  <p className="text-sm text-amber-700 dark:text-amber-300">Pending</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {bookings.filter((booking) => booking.status === BookingStatus.PENDING).length}
                  </p>
                </div>
                <div className="rounded-3xl border border-green-200 bg-green-50 p-5 dark:border-green-900/40 dark:bg-green-900/10">
                  <p className="text-sm text-green-700 dark:text-green-300">Approved</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {bookings.filter((booking) => booking.status === BookingStatus.APPROVED).length}
                  </p>
                </div>
                <div className="rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-900/10">
                  <p className="text-sm text-red-700 dark:text-red-300">Rejected</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {bookings.filter((booking) => booking.status === BookingStatus.REJECTED).length}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/30">
                  <p className="text-sm text-slate-700 dark:text-slate-300">Cancelled</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {bookings.filter((booking) => booking.status === BookingStatus.CANCELLED).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    My Bookings
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Track your booking requests and cancel any active request you no longer need.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadBookings()}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {(['all', BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.REJECTED, BookingStatus.CANCELLED] as const).map((value) => {
                  const active = statusFilter === value;
                  const label = value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1);

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatusFilter(value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-brand-maroon text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {error && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="py-16 text-center">
                  <CalendarDays className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                    No bookings found
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Once you submit a booking request, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {filteredBookings.map((booking) => {
                    const isCancelling = actionBookingId === booking.id;
                    const canCancel =
                      booking.status === BookingStatus.PENDING ||
                      booking.status === BookingStatus.APPROVED;

                    return (
                      <article
                        key={booking.id}
                        className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {booking.eventTitle}
                              </h3>
                              <StatusBadge status={booking.status} />
                            </div>

                            <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                                  Venue
                                </div>
                                <div className="mt-1 font-medium text-gray-900 dark:text-white">
                                  {booking.venueName}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                                  Schedule
                                </div>
                                <div className="mt-1 font-medium text-gray-900 dark:text-white">
                                  {formatDate(booking.date)}
                                </div>
                                <div>
                                  {booking.startTime} - {booking.endTime}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                                  Type
                                </div>
                                <div className="mt-1 font-medium capitalize text-gray-900 dark:text-white">
                                  {booking.eventType}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                                  Pax
                                </div>
                                <div className="mt-1 font-medium text-gray-900 dark:text-white">
                                  {booking.expectedPax} guests
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {canCancel ? (
                              <button
                                type="button"
                                disabled={isCancelling}
                                onClick={() => void handleCancelBooking(booking)}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isCancelling ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Cancel booking
                              </button>
                            ) : (
                              <div className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                No actions available
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default UserDashboard;
