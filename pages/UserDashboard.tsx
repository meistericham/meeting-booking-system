import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import StatusBadge from '../components/StatusBadge';
import SummaryCard from '../components/SummaryCard';
import { getUserDashboardNav } from '../config/dashboardNavigation';
import { useAuth } from '../services/authContext';
import { getEmailDeliveryWarning, sendBookingStatusEmail } from '../services/emailService';
import { cancelBooking, fetchBookingsByUser } from '../services/dataService';
import { Booking, BookingStatus } from '../types';

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [warning, setWarning] = useState('');
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

  const totalBookings = bookings.length;
  const pendingCount = bookings.filter((booking) => booking.status === BookingStatus.PENDING).length;
  const approvedCount = bookings.filter((booking) => booking.status === BookingStatus.APPROVED).length;
  const rejectedCount = bookings.filter((booking) => booking.status === BookingStatus.REJECTED).length;

  const handleCancelBooking = async (booking: Booking) => {
    if (!user) {
      return;
    }

    setActionBookingId(booking.id);
    setError('');
    setNotice('');
    setWarning('');

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

      try {
        await sendBookingStatusEmail({
          id: booking.id,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          venueName: booking.venueName,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          eventTitle: booking.eventTitle,
          status: BookingStatus.CANCELLED,
        });
        setNotice('Booking cancelled successfully.');
      } catch (emailError) {
        setWarning(
          getEmailDeliveryWarning(
            emailError,
            'Booking was cancelled, but the cancellation email could not be sent.'
          )
        );
      }
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
    <DashboardShell
      badge="User Workspace"
      title={`Welcome back, ${user?.displayName || 'User'}`}
      description="Your dashboard now shows a quick overview of meeting bookings, approval progress, and the latest requests in one place."
      userLabel={user?.displayName || user?.email}
      navItems={getUserDashboardNav(location.pathname)}
      headerActions={
        <>
          <Link
            to="/calendar"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-maroon px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Open calendar hub
          </Link>
          <button
            type="button"
            onClick={() => void loadBookings()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-red-300 hover:text-red-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-400 dark:hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </>
      }
      summary={
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Meeting Bookings"
            value={totalBookings}
            detail="Total requests submitted"
            icon={CalendarDays}
            tone="blue"
          />
          <SummaryCard
            label="Approved"
            value={approvedCount}
            detail="Meetings cleared to proceed"
            icon={CheckCircle2}
            tone="green"
          />
          <SummaryCard
            label="Rejected"
            value={rejectedCount}
            detail="Requests not approved"
            icon={XCircle}
            tone="red"
          />
          <SummaryCard
            label="Pending"
            value={pendingCount}
            detail="Waiting for admin review"
            icon={Clock3}
            tone="amber"
          />
        </div>
      }
    >
      <div className="grid gap-8 xl:grid-cols-[0.4fr_0.6fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-maroon/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Account Snapshot
            </div>
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

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
            <div className="mt-4 grid gap-3">
              <Link
                to="/calendar"
                className="inline-flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
              >
                <span>Open calendar hub</span>
                <CalendarDays className="h-4 w-4" />
              </Link>
              <Link
                to="/calendar"
                className="inline-flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
              >
                <span>Book from calendar hub</span>
                <CheckCircle2 className="h-4 w-4" />
              </Link>
              <Link
                to="/settings"
                className="inline-flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
              >
                <span>Update profile</span>
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section
          id="my-bookings-section"
          className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                My Bookings
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Track your requests, filter by status, and cancel any active meeting you no longer need.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {([
              'all',
              BookingStatus.PENDING,
              BookingStatus.APPROVED,
              BookingStatus.REJECTED,
              BookingStatus.CANCELLED,
            ] as const).map((value) => {
              const active = statusFilter === value;
              const label =
                value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1);

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

          {(error || warning || notice) && (
            <div
              className={`mt-6 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${
                error
                  ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300'
                  : warning
                    ? 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300'
                    : 'border border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300'
              }`}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error || warning || notice}</span>
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
        </section>
      </div>
    </DashboardShell>
  );
};

export default UserDashboard;
