import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import SummaryCard from '../components/SummaryCard';
import { getAdminDashboardNav } from '../config/dashboardNavigation';
import { useAuth } from '../services/authContext';
import { fetchApprovedEmailInvites } from '../services/inviteService';
import { fetchBookings, fetchVenues } from '../services/dataService';
import { fetchUsers } from '../services/userService';
import { ApprovedEmailInvite, AppUser, Booking, BookingStatus, Venue } from '../types';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [invites, setInvites] = useState<ApprovedEmailInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setError('');

    try {
      const [bookingData, userData, venueData, inviteData] = await Promise.all([
        fetchBookings(),
        fetchUsers(),
        fetchVenues(),
        fetchApprovedEmailInvites(),
      ]);
      setBookings(bookingData);
      setUsers(userData);
      setVenues(venueData);
      setInvites(inviteData);
    } catch {
      setError('Unable to load the admin overview right now.');
      setBookings([]);
      setUsers([]);
      setVenues([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === BookingStatus.PENDING).length,
    [bookings]
  );
  const activeUsers = useMemo(
    () => users.filter((entry) => entry.isActive !== false).length,
    [users]
  );
  const activeRooms = useMemo(
    () => venues.filter((venue) => venue.isActive).length,
    [venues]
  );
  const openInvites = useMemo(
    () => invites.filter((invite) => !invite.claimedAt).length,
    [invites]
  );

  return (
    <DashboardShell
      badge="Admin Workspace"
      title="Admin Console Overview"
      description="Monitor booking pressure, user access, and room inventory before jumping into the dedicated management modules."
      userLabel={user?.displayName || user?.email}
      navItems={getAdminDashboardNav(location.pathname)}
      headerActions={
        <>
          <button
            type="button"
            onClick={() => void loadOverview()}
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
            value={bookings.length}
            detail="All submitted requests"
            icon={CalendarDays}
            tone="blue"
          />
          <SummaryCard
            label="Pending Queue"
            value={pendingBookings}
            detail="Waiting for approval"
            icon={Clock3}
            tone="amber"
          />
          <SummaryCard
            label="Active Users"
            value={activeUsers}
            detail="Can log in and book"
            icon={Users}
            tone="green"
          />
          <SummaryCard
            label="Open Invites"
            value={openInvites}
            detail="Not claimed yet"
            icon={ShieldCheck}
            tone="slate"
          />
        </div>
      }
    >
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 pb-6 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Quick Links
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Open the module you need without wading through one oversized admin page.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                to="/calendar"
                className="rounded-3xl border border-gray-200 p-5 transition-colors hover:border-brand-maroon hover:bg-brand-maroon/5 dark:border-gray-800 dark:hover:border-red-300 dark:hover:bg-brand-maroon/10"
              >
                <CalendarDays className="h-5 w-5 text-brand-maroon dark:text-red-300" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Shared Calendar
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  View month availability across rooms and drill into a selected date.
                </p>
              </Link>

              <Link
                to="/admin/bookings"
                className="rounded-3xl border border-gray-200 p-5 transition-colors hover:border-brand-maroon hover:bg-brand-maroon/5 dark:border-gray-800 dark:hover:border-red-300 dark:hover:bg-brand-maroon/10"
              >
                <CheckCircle2 className="h-5 w-5 text-brand-maroon dark:text-red-300" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Booking Moderation
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Approve or reject requests with table filters for date, room, and requester.
                </p>
              </Link>

              <Link
                to="/admin/users"
                className="rounded-3xl border border-gray-200 p-5 transition-colors hover:border-brand-maroon hover:bg-brand-maroon/5 dark:border-gray-800 dark:hover:border-red-300 dark:hover:bg-brand-maroon/10"
              >
                <Users className="h-5 w-5 text-brand-maroon dark:text-red-300" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  User Management
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Invite users, resend signup emails, and deactivate access when required.
                </p>
              </Link>

              <Link
                to="/admin/rooms"
                className="rounded-3xl border border-gray-200 p-5 transition-colors hover:border-brand-maroon hover:bg-brand-maroon/5 dark:border-gray-800 dark:hover:border-red-300 dark:hover:bg-brand-maroon/10"
              >
                <ShieldCheck className="h-5 w-5 text-brand-maroon dark:text-red-300" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Room Management
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Update room details, archive unused spaces, and maintain sort order.
                </p>
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 pb-6 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Snapshot
              </h2>
            </div>

            <dl className="mt-6 space-y-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Approved / Pending / Rejected</dt>
                <dd className="font-semibold text-gray-900 dark:text-white">
                  {
                    bookings.filter((booking) => booking.status === BookingStatus.APPROVED).length
                  }{' '}
                  / {pendingBookings} /{' '}
                  {
                    bookings.filter((booking) => booking.status === BookingStatus.REJECTED).length
                  }
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Active Rooms</dt>
                <dd className="font-semibold text-gray-900 dark:text-white">
                  {activeRooms}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Archived Rooms</dt>
                <dd className="font-semibold text-gray-900 dark:text-white">
                  {Math.max(venues.length - activeRooms, 0)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Inactive Users</dt>
                <dd className="font-semibold text-gray-900 dark:text-white">
                  {Math.max(users.length - activeUsers, 0)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </DashboardShell>
  );
};

export default AdminDashboard;
