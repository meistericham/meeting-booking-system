import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import StatusBadge from '../components/StatusBadge';
import { getAdminDashboardNav } from '../config/dashboardNavigation';
import { useAuth } from '../services/authContext';
import { getEmailDeliveryWarning, sendBookingStatusEmail } from '../services/emailService';
import {
  fetchBookings,
  fetchVenues,
  updateBookingStatus,
} from '../services/dataService';
import { Booking, BookingStatus, Venue } from '../types';

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatDateTime = (value?: number) => {
  if (!value) {
    return 'Not processed yet';
  }

  return new Date(value).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AdminBookingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [warning, setWarning] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>(
    (searchParams.get('status') as 'all' | BookingStatus | null) ?? BookingStatus.PENDING
  );
  const focusBookingId = searchParams.get('bookingId');
  const [roomFilter, setRoomFilter] = useState(searchParams.get('venueId') ?? 'all');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '');
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') ?? '');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [bookingsData, venuesData] = await Promise.all([
        fetchBookings(),
        fetchVenues(),
      ]);
      setBookings(bookingsData);
      setVenues(venuesData);
    } catch {
      setError('Unable to load booking moderation right now.');
      setBookings([]);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setStatusFilter(
      (searchParams.get('status') as 'all' | BookingStatus | null) ?? BookingStatus.PENDING
    );
    setExpandedBookingId(searchParams.get('bookingId'));
    setRoomFilter(searchParams.get('venueId') ?? 'all');
    setSearchTerm(searchParams.get('q') ?? '');
    setDateFilter(searchParams.get('date') ?? '');
  }, [searchParams]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) {
        return false;
      }

      if (roomFilter !== 'all' && booking.venueId !== roomFilter) {
        return false;
      }

      if (dateFilter && booking.date !== dateFilter) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const search = searchTerm.toLowerCase();
      return [
        booking.guestName,
        booking.guestEmail,
        booking.venueName,
        booking.eventTitle,
      ].some((value) => value.toLowerCase().includes(search));
    });
  }, [bookings, dateFilter, roomFilter, searchTerm, statusFilter]);

  const handleStatusUpdate = async (booking: Booking, status: BookingStatus) => {
    if (!user) {
      return;
    }

    setActionBookingId(booking.id);
    setError('');
    setNotice('');
    setWarning('');

    try {
      await updateBookingStatus(booking.id, status, user.uid);
      setBookings((current) =>
        current.map((currentBooking) =>
          currentBooking.id === booking.id
            ? {
                ...currentBooking,
                status,
                processedAt: Date.now(),
                processedBy: user.uid,
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
          status,
        });
        setNotice(`Booking ${status} successfully.`);
      } catch (emailError) {
        setWarning(
          getEmailDeliveryWarning(
            emailError,
            `Booking ${status} successfully, but the status email could not be sent.`
          )
        );
      }
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to update booking status.'
      );
    } finally {
      setActionBookingId(null);
    }
  };

  return (
    <DashboardShell
      badge="Admin Bookings"
      title="Booking Moderation"
      description="Review pending requests, filter by room or date, and handle approval decisions from one focused page."
      userLabel={user?.displayName || user?.email}
      navItems={getAdminDashboardNav(location.pathname)}
      headerActions={
        <>
          <button
            type="button"
            onClick={() => void loadData()}
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
    >
      {(error || warning || notice) && (
        <div
          className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
            error
              ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300'
              : warning
                ? 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300'
              : 'border border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300'
          }`}
        >
          {error || warning || notice}
        </div>
      )}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-3 border-b border-gray-200 pb-6 dark:border-gray-800 xl:grid-cols-[auto_auto_auto_1fr]">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as 'all' | BookingStatus)
            }
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          >
            <option value={BookingStatus.PENDING}>Pending</option>
            <option value="all">All statuses</option>
            <option value={BookingStatus.APPROVED}>Approved</option>
            <option value={BookingStatus.REJECTED}>Rejected</option>
            <option value={BookingStatus.CANCELLED}>Cancelled</option>
          </select>

          <select
            value={roomFilter}
            onChange={(event) => setRoomFilter(event.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          >
            <option value="all">All rooms</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />

          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search requester, email, room, or event"
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              No bookings match the current filters.
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Adjust the filters or refresh to see the latest requests.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-gray-400">
                <tr>
                  <th className="pb-3">Requester</th>
                  <th className="pb-3">Room</th>
                  <th className="pb-3">Schedule</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredBookings.map((booking) => {
                  const isUpdating = actionBookingId === booking.id;
                  const isExpanded = expandedBookingId === booking.id;
                  const isFocused = focusBookingId === booking.id;

                  return (
                    <React.Fragment key={booking.id}>
                      <tr className={isFocused ? 'bg-brand-maroon/5 dark:bg-brand-maroon/10' : ''}>
                        <td className="py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {booking.guestName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {booking.guestEmail}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {booking.venueName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {booking.expectedPax} guests
                          </div>
                        </td>
                        <td className="py-4 text-gray-600 dark:text-gray-300">
                          <div>{formatDate(booking.date)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {booking.startTime} - {booking.endTime}
                          </div>
                        </td>
                        <td className="py-4">
                          <StatusBadge status={booking.status} />
                        </td>
                        <td className="py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedBookingId((current) =>
                                  current === booking.id ? null : booking.id
                                )
                              }
                              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                            >
                              {isExpanded ? 'Hide details' : 'View details'}
                            </button>
                            {booking.status === BookingStatus.PENDING && (
                              <>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() =>
                                    void handleStatusUpdate(booking, BookingStatus.APPROVED)
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() =>
                                    void handleStatusUpdate(booking, BookingStatus.REJECTED)
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                  )}
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="pb-4">
                            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                                    Event
                                  </p>
                                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                                    {booking.eventTitle}
                                  </p>
                                  <p className="mt-1 capitalize">{booking.eventType}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                                    Contact
                                  </p>
                                  <p className="mt-1">{booking.guestPhone}</p>
                                  <p className="mt-1">
                                    {booking.organization || 'No organization provided'}
                                  </p>
                                </div>
                              </div>
                              {booking.specialRequests && (
                                <div className="mt-4">
                                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                                    Special requests
                                  </p>
                                  <p className="mt-1">{booking.specialRequests}</p>
                                </div>
                              )}
                              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                                Last processed: {formatDateTime(booking.processedAt)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardShell>
  );
};

export default AdminBookingsPage;
