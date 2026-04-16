import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import StatusBadge from '../components/StatusBadge';
import { getDashboardNav } from '../config/dashboardNavigation';
import { TIME_SLOTS, toTimestamp } from '../config/timeSlots';
import { useAuth } from '../services/authContext';
import { fetchBookingsByDateRange, fetchVenues } from '../services/dataService';
import { Booking, BookingStatus, UserRole, Venue } from '../types';
import {
  buildMonthGrid,
  formatDateKey,
  getMonthBounds,
  getMonthLabel,
  parseDateKey,
} from '../utils/calendar';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const isActiveBooking = (booking: Booking) =>
  booking.status === BookingStatus.PENDING || booking.status === BookingStatus.APPROVED;

const formatLongDate = (dateKey: string) =>
  parseDateKey(dateKey).toLocaleDateString('en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const CalendarPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const today = formatDateKey(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [roomFilter, setRoomFilter] = useState('all');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCalendar = async (monthDate: Date) => {
    setLoading(true);
    setError('');

    try {
      const bounds = getMonthBounds(monthDate);
      const [venueData, bookingData] = await Promise.all([
        fetchVenues(),
        fetchBookingsByDateRange(bounds.start, bounds.end),
      ]);
      setVenues(venueData.filter((venue) => venue.isActive));
      setBookings(bookingData);
    } catch {
      setError('Unable to load calendar availability right now.');
      setVenues([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCalendar(visibleMonth);
  }, [visibleMonth]);

  const changeMonth = (delta: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(formatDateKey(nextMonth));
  };

  const resetToToday = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    setVisibleMonth(monthStart);
    setSelectedDate(formatDateKey(now));
  };

  const activeBookings = useMemo(
    () => bookings.filter(isActiveBooking),
    [bookings]
  );

  const filteredRooms = useMemo(() => {
    if (roomFilter === 'all') {
      return venues;
    }

    return venues.filter((venue) => venue.id === roomFilter);
  }, [roomFilter, venues]);

  const findActiveBookingForSlot = (
    venueId: string,
    dateKey: string,
    slotId: string
  ) => {
    const slot = TIME_SLOTS.find((entry) => entry.id === slotId);

    if (!slot) {
      return null;
    }

    const slotStart = toTimestamp(dateKey, slot.start);
    const slotEnd = toTimestamp(dateKey, slot.end);

    return (
      activeBookings.find(
        (booking) =>
          booking.venueId === venueId &&
          booking.date === dateKey &&
          slotStart < booking.endTimestamp &&
          slotEnd > booking.startTimestamp
      ) ?? null
    );
  };

  const getDaySummary = (dateKey: string) => {
    const dateBookings = bookings.filter((booking) => booking.date === dateKey);
    const dateActiveBookings = activeBookings.filter((booking) => booking.date === dateKey);

    if (roomFilter === 'all') {
      const roomsWithFreeSlot = venues.filter((venue) =>
        TIME_SLOTS.some((slot) => !findActiveBookingForSlot(venue.id, dateKey, slot.id))
      ).length;

      return {
        primary: `${roomsWithFreeSlot}/${venues.length || 0} rooms free`,
        secondary:
          user?.role === UserRole.ADMIN && dateBookings.length > dateActiveBookings.length
            ? `${dateBookings.length - dateActiveBookings.length} closed`
            : `${dateActiveBookings.length} active`,
      };
    }

    const selectedRoom = venues.find((venue) => venue.id === roomFilter);
    const freeSlots = TIME_SLOTS.filter(
      (slot) => !findActiveBookingForSlot(roomFilter, dateKey, slot.id)
    ).length;

    return {
      primary: `${freeSlots}/${TIME_SLOTS.length} slots free`,
      secondary: selectedRoom ? selectedRoom.name : 'Room unavailable',
    };
  };

  const monthCells = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const selectedDateBookings = useMemo(
    () => bookings.filter((booking) => booking.date === selectedDate),
    [bookings, selectedDate]
  );

  return (
    <DashboardShell
      badge="Shared Calendar"
      title="Calendar View"
      description="Review room availability by month, then inspect a selected date to see slot-by-slot status before booking or moderating."
      userLabel={user?.displayName || user?.email}
      navItems={getDashboardNav(user?.role ?? UserRole.USER, location.pathname)}
      headerActions={
        <>
          <button
            type="button"
            onClick={() => void loadCalendar(visibleMonth)}
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
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded-xl border border-gray-200 p-3 text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:text-red-300">
                  {getMonthLabel(visibleMonth)}
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Click a date to inspect room slots for that day.
                </div>
              </div>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded-xl border border-gray-200 p-3 text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={roomFilter}
                onChange={(event) => setRoomFilter(event.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                <option value="all">All Rooms</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={resetToToday}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
              >
                Today
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
            </div>
          ) : venues.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              No active rooms available for calendar view yet.
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="py-2">
                    {label}
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2">
                {monthCells.map((cell) => {
                  const summary = getDaySummary(cell.dateKey);
                  const isSelected = cell.dateKey === selectedDate;
                  const isToday = cell.dateKey === today;

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => setSelectedDate(cell.dateKey)}
                      className={`min-h-[116px] rounded-2xl border p-3 text-left transition ${
                        isSelected
                          ? 'border-brand-maroon bg-brand-maroon/5 shadow-sm dark:border-red-300 dark:bg-brand-maroon/10'
                          : 'border-gray-200 bg-white hover:border-brand-maroon/40 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-red-300 dark:hover:bg-gray-800/60'
                      } ${cell.inCurrentMonth ? '' : 'opacity-55'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            isToday
                              ? 'inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-maroon text-white'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                      </div>
                      <div className="mt-4 space-y-1.5 text-xs">
                        <p className="font-medium text-gray-700 dark:text-gray-200">
                          {summary.primary}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">{summary.secondary}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 pb-6 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {formatLongDate(selectedDate)}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {roomFilter === 'all'
                ? 'Availability is grouped by room.'
                : 'Showing the selected room only.'}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No room matched the selected filter.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {filteredRooms.map((venue) => {
                const roomClosedBookings = selectedDateBookings.filter(
                  (booking) =>
                    booking.venueId === venue.id &&
                    !isActiveBooking(booking)
                );

                return (
                  <article
                    key={venue.id}
                    className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800"
                  >
                    <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 dark:border-gray-800 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {venue.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Capacity up to {venue.capacity} guests
                        </p>
                      </div>

                      {user?.role === UserRole.ADMIN ? (
                        <Link
                          to={`/admin/bookings?date=${selectedDate}&venueId=${venue.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                        >
                          Open moderation
                        </Link>
                      ) : (
                        <Link
                          to={`/book/${venue.id}?date=${selectedDate}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                        >
                          Open room booking
                        </Link>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3">
                      {TIME_SLOTS.map((slot) => {
                        const overlappingBooking = findActiveBookingForSlot(
                          venue.id,
                          selectedDate,
                          slot.id
                        );
                        const isMine = overlappingBooking?.userId === user?.uid;

                        return (
                          <div
                            key={slot.id}
                            className={`rounded-2xl border p-4 ${
                              overlappingBooking
                                ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10'
                                : 'border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/10'
                            }`}
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {slot.label}
                                  </h4>
                                  {overlappingBooking ? (
                                    <StatusBadge status={overlappingBooking.status} />
                                  ) : (
                                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                      Available
                                    </span>
                                  )}
                                  {isMine && (
                                    <span className="rounded-full bg-brand-maroon/10 px-3 py-1 text-xs font-semibold text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
                                      My booking
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                  {slot.start} - {slot.end}
                                </p>
                                {overlappingBooking && (
                                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                    {overlappingBooking.eventTitle} by {overlappingBooking.guestName}
                                  </p>
                                )}
                              </div>

                              {user?.role === UserRole.USER && !overlappingBooking && (
                                <Link
                                  to={`/book/${venue.id}?date=${selectedDate}&slot=${slot.id}`}
                                  className="inline-flex items-center gap-2 rounded-xl bg-brand-maroon px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#74161c]"
                                >
                                  <Clock3 className="h-4 w-4" />
                                  Book slot
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {user?.role === UserRole.ADMIN && roomClosedBookings.length > 0 && (
                      <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm dark:bg-gray-800/70">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Closed bookings on this date
                        </p>
                        <div className="mt-3 space-y-2">
                          {roomClosedBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900"
                            >
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {booking.eventTitle}
                                </span>
                                <StatusBadge status={booking.status} />
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {booking.startTime} - {booking.endTime} by {booking.guestName}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

export default CalendarPage;
