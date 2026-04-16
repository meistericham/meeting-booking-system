import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LogOut,
  MailPlus,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { APP_CONFIG } from '../config/appConfig';
import { useAuth } from '../services/authContext';
import { sendBookingStatusEmail, sendInviteEmail } from '../services/emailService';
import { fetchApprovedEmailInvites, upsertApprovedEmailInvite } from '../services/inviteService';
import { fetchBookings, updateBookingStatus } from '../services/dataService';
import { ApprovedEmailInvite, Booking, BookingStatus } from '../types';

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatDateTime = (value?: number) => {
  if (!value) {
    return 'Not sent yet';
  }

  return new Date(value).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invites, setInvites] = useState<ApprovedEmailInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>(BookingStatus.PENDING);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusyEmail, setInviteBusyEmail] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      const [bookingsData, invitesData] = await Promise.all([
        fetchBookings(),
        fetchApprovedEmailInvites(),
      ]);
      setBookings(bookingsData);
      setInvites(invitesData);
    } catch {
      setError('Unable to load dashboard data right now.');
      setBookings([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) {
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
  }, [bookings, dateFilter, searchTerm, statusFilter]);

  const buildInviteUrl = (email: string) =>
    `${window.location.origin}/#/signup?email=${encodeURIComponent(email)}`;

  const handleInviteUpsert = async (email: string) => {
    if (!user) {
      return;
    }

    setInviteBusyEmail(email);
    setError('');
    setNotice('');

    try {
      const invite = await upsertApprovedEmailInvite(email, user.uid);
      const refreshedInvites = await fetchApprovedEmailInvites();
      setInvites(refreshedInvites);

      void sendInviteEmail({
        email: invite.email,
        inviteUrl: buildInviteUrl(invite.email),
        invitedByName: user.displayName,
      }).catch(() => undefined);

      setNotice(`Invite queued for ${invite.email}.`);
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : 'Unable to send invite right now.'
      );
    } finally {
      setInviteBusyEmail(null);
    }
  };

  const handleCreateInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!inviteEmail.trim()) {
      setError('Invite email is required.');
      return;
    }

    await handleInviteUpsert(inviteEmail.trim());
    setInviteEmail('');
  };

  const handleStatusUpdate = async (booking: Booking, status: BookingStatus) => {
    if (!user) {
      return;
    }

    setActionBookingId(booking.id);
    setError('');
    setNotice('');

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

      void sendBookingStatusEmail({
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        venueName: booking.venueName,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        eventTitle: booking.eventTitle,
        status,
      }).catch(() => undefined);

      setNotice(`Booking ${status} successfully.`);
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

  const pendingCount = bookings.filter((booking) => booking.status === BookingStatus.PENDING).length;
  const approvedCount = bookings.filter((booking) => booking.status === BookingStatus.APPROVED).length;
  const rejectedCount = bookings.filter((booking) => booking.status === BookingStatus.REJECTED).length;
  const cancelledCount = bookings.filter((booking) => booking.status === BookingStatus.CANCELLED).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-brand-maroon dark:text-gray-400 dark:hover:text-red-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to public site
            </Link>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:text-red-300">
                {APP_CONFIG.APP_NAME}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                Booking Dashboard
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Review pending requests, manage statuses, and maintain the invite-only user list.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="text-gray-500 dark:text-gray-400">Signed in as</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {user?.displayName || user?.email}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboardData()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-maroon px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-900/10">
            <p className="text-sm text-amber-700 dark:text-amber-300">Pending</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
          </div>
          <div className="rounded-3xl border border-green-200 bg-green-50 p-5 dark:border-green-900/40 dark:bg-green-900/10">
            <p className="text-sm text-green-700 dark:text-green-300">Approved</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{approvedCount}</p>
          </div>
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-900/10">
            <p className="text-sm text-red-700 dark:text-red-300">Rejected</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{rejectedCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/30">
            <p className="text-sm text-slate-700 dark:text-slate-300">Cancelled</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{cancelledCount}</p>
          </div>
        </div>

        {(error || notice) && (
          <div
            className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
              error
                ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300'
                : 'border border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300'
            }`}
          >
            {error || notice}
          </div>
        )}

        <div className="mt-8 grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Invite Management
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Add invited user emails to the allowlist and resend invite emails when needed.
                </p>
              </div>

              <form onSubmit={(event) => void handleCreateInvite(event)} className="grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="sr-only" htmlFor="invite-email">
                  Invite email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="user@company.com"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={inviteBusyEmail !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-maroon px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {inviteBusyEmail === inviteEmail.trim().toLowerCase() ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MailPlus className="h-4 w-4" />
                  )}
                  Add invite
                </button>
              </form>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
              </div>
            ) : invites.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                No invites created yet.
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.2em] text-gray-400">
                    <tr>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Last Sent</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {invites.map((invite) => {
                      const isBusy = inviteBusyEmail === invite.email;
                      const isClaimed = Boolean(invite.claimedAt);

                      return (
                        <tr key={invite.id}>
                          <td className="py-4 font-medium text-gray-900 dark:text-white">
                            {invite.email}
                          </td>
                          <td className="py-4">
                            {isClaimed ? (
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                Claimed
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                Awaiting signup
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-gray-500 dark:text-gray-400">
                            {formatDateTime(invite.lastSentAt)}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              type="button"
                              disabled={isBusy || isClaimed}
                              onClick={() => void handleInviteUpsert(invite.email)}
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Resend
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Booking Moderation
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Pending bookings are shown by default. Filter by date, status, or requester as
                  needed.
                </p>
              </div>

              <div className="grid gap-3 xl:grid-cols-[auto_auto_1fr]">
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
                    placeholder="Search requester, email, venue, or event"
                    className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </label>
              </div>
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
                      <th className="pb-3">Venue</th>
                      <th className="pb-3">Schedule</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredBookings.map((booking) => {
                      const isUpdating = actionBookingId === booking.id;
                      const isExpanded = expandedBookingId === booking.id;

                      return (
                        <React.Fragment key={booking.id}>
                          <tr>
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
                                      <p className="mt-1">{booking.organization || 'No organization provided'}</p>
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
                                  {booking.status === BookingStatus.CANCELLED && booking.cancelledAt && (
                                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                                      Cancelled on {formatDateTime(booking.cancelledAt)}
                                    </div>
                                  )}
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
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
