import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import StatusBadge from '../components/StatusBadge';
import { getDashboardNav } from '../config/dashboardNavigation';
import { TIME_SLOTS, toTimestamp } from '../config/timeSlots';
import { useAuth } from '../services/authContext';
import {
  getEmailDeliveryWarning,
  sendBookingSubmittedNotifications,
} from '../services/emailService';
import {
  createBooking,
  fetchBookingsByDateRange,
  fetchVenues,
} from '../services/dataService';
import {
  Booking,
  BookingStatus,
  CalendarDayStatus,
  CreateBookingInput,
  EventType,
  TimeSlot,
  UserRole,
  Venue,
} from '../types';
import {
  buildMonthGrid,
  formatDateKey,
  getMonthBounds,
  getMonthLabel,
  parseDateKey,
} from '../utils/calendar';

const EVENT_TYPES: EventType[] = ['meeting', 'seminar', 'workshop', 'reception', 'other'];
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type SlotState = {
  slot: TimeSlot;
  booking: Booking | null;
};

type RoomDaySummary = {
  venue: Venue;
  slotStates: SlotState[];
  freeSlots: number;
  occupiedSlots: number;
};

type CalendarDayMetrics = {
  status: CalendarDayStatus;
  totalSlots: number;
  occupiedSlots: number;
  freeSlots: number;
  openRooms: number;
  bookedRooms: number;
  activeBookings: Booking[];
};

const isActiveBooking = (booking: Booking) =>
  booking.status === BookingStatus.PENDING || booking.status === BookingStatus.APPROVED;

const getTodayString = () => formatDateKey(new Date());

const formatLongDate = (dateKey: string) =>
  parseDateKey(dateKey).toLocaleDateString('en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const getStatusLabel = (status: CalendarDayStatus) =>
  status === 'open' ? 'Open' : status === 'partial' ? 'Partial' : 'Full';

const getStatusClasses = (status: CalendarDayStatus) => {
  if (status === 'open') {
    return {
      badge:
        'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
      cell:
        'border-green-200 bg-green-50/80 text-green-800 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-200',
      marker: 'bg-green-500',
    };
  }

  if (status === 'partial') {
    return {
      badge:
        'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
      cell:
        'border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200',
      marker: 'bg-amber-500',
    };
  }

  return {
    badge: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    cell: 'border-red-200 bg-red-50/80 text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200',
    marker: 'bg-red-500',
  };
};

const createInitialVisibleMonth = (dateKey: string) => {
  const date = parseDateKey(dateKey);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const CalendarPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDate = searchParams.get('date') || getTodayString();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    createInitialVisibleMonth(initialDate)
  );
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedVenueId, setSelectedVenueId] = useState(
    searchParams.get('venueId') || ''
  );
  const [selectedSlotId, setSelectedSlotId] = useState(searchParams.get('slot') || '');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [selectedDayModalOpen, setSelectedDayModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    guestPhone: user?.phoneNumber || '',
    organization: user?.organization || '',
    expectedPax: '',
    eventTitle: '',
    eventType: 'meeting' as EventType,
    specialRequests: '',
  });

  const today = getTodayString();
  const canModerate = user?.role === UserRole.ADMIN;

  useEffect(() => {
    const syncViewport = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm((current) => ({
      ...current,
      guestPhone: current.guestPhone || user.phoneNumber || '',
      organization: current.organization || user.organization || '',
    }));
  }, [user]);

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
      setError('Unable to load the calendar hub right now.');
      setVenues([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCalendar(visibleMonth);
  }, [visibleMonth]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (selectedDate) {
      nextParams.set('date', selectedDate);
    }

    if (selectedVenueId) {
      nextParams.set('venueId', selectedVenueId);
    }

    if (selectedSlotId) {
      nextParams.set('slot', selectedSlotId);
    }

    const nextString = nextParams.toString();
    const currentString = searchParams.toString();

    if (nextString !== currentString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    searchParams,
    selectedDate,
    selectedSlotId,
    selectedVenueId,
    setSearchParams,
  ]);

  const activeBookings = useMemo(
    () => bookings.filter(isActiveBooking),
    [bookings]
  );

  const monthCells = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);

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

  const buildRoomSummariesForDate = (dateKey: string): RoomDaySummary[] =>
    venues.map((venue) => {
      const slotStates = TIME_SLOTS.map((slot) => ({
        slot,
        booking: findActiveBookingForSlot(venue.id, dateKey, slot.id),
      }));

      return {
        venue,
        slotStates,
        freeSlots: slotStates.filter((entry) => !entry.booking).length,
        occupiedSlots: slotStates.filter((entry) => Boolean(entry.booking)).length,
      };
    });

  const dayMetrics = useMemo(() => {
    const uniqueDateKeys = Array.from(new Set(monthCells.map((cell) => cell.dateKey)));

    return uniqueDateKeys.reduce<Record<string, CalendarDayMetrics>>((accumulator, dateKey) => {
      const roomSummaries = buildRoomSummariesForDate(dateKey);
      const occupiedSlots = roomSummaries.reduce(
        (total, summary) => total + summary.occupiedSlots,
        0
      );
      const totalSlots = venues.length * TIME_SLOTS.length;
      const freeSlots = Math.max(totalSlots - occupiedSlots, 0);
      const openRooms = roomSummaries.filter((summary) => summary.freeSlots > 0).length;
      const bookedRooms = roomSummaries.filter((summary) => summary.occupiedSlots > 0).length;
      const status: CalendarDayStatus =
        occupiedSlots === 0 ? 'open' : occupiedSlots >= totalSlots && totalSlots > 0 ? 'full' : 'partial';

      accumulator[dateKey] = {
        status,
        totalSlots,
        occupiedSlots,
        freeSlots,
        openRooms,
        bookedRooms,
        activeBookings: activeBookings.filter((booking) => booking.date === dateKey),
      };

      return accumulator;
    }, {});
  }, [activeBookings, monthCells, venues]);

  const selectedDateMetrics = dayMetrics[selectedDate] ?? {
    status: 'open' as CalendarDayStatus,
    totalSlots: venues.length * TIME_SLOTS.length,
    occupiedSlots: 0,
    freeSlots: venues.length * TIME_SLOTS.length,
    openRooms: venues.length,
    bookedRooms: 0,
    activeBookings: [],
  };

  const selectedDateRoomSummaries = useMemo(
    () => buildRoomSummariesForDate(selectedDate),
    [activeBookings, selectedDate, venues]
  );

  const selectedDateAllBookings = useMemo(
    () =>
      bookings
        .filter((booking) => booking.date === selectedDate)
        .sort((a, b) => a.startTimestamp - b.startTimestamp),
    [bookings, selectedDate]
  );

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === selectedVenueId) ?? null,
    [selectedVenueId, venues]
  );

  const selectedSlot = useMemo(
    () => TIME_SLOTS.find((slot) => slot.id === selectedSlotId) ?? null,
    [selectedSlotId]
  );

  const selectedPax = Number(form.expectedPax);
  const hasValidPax = Number.isFinite(selectedPax) && selectedPax > 0;

  useEffect(() => {
    if (selectedVenueId && !venues.some((venue) => venue.id === selectedVenueId)) {
      setSelectedVenueId('');
      setSelectedSlotId('');
    }
  }, [selectedVenueId, venues]);

  useEffect(() => {
    if (!selectedVenueId || !selectedSlotId) {
      return;
    }

    const booking = findActiveBookingForSlot(selectedVenueId, selectedDate, selectedSlotId);

    if (booking) {
      setSelectedSlotId('');
    }
  }, [activeBookings, selectedDate, selectedSlotId, selectedVenueId]);

  useEffect(() => {
    if (!selectedSlotId) {
      setBookingModalOpen(false);
    }
  }, [selectedSlotId]);

  useEffect(() => {
    if (selectedVenue && selectedSlot) {
      setBookingModalOpen(true);
    }
  }, [selectedSlot, selectedVenue]);

  const handleDaySelection = (dateKey: string) => {
    const nextMonth = createInitialVisibleMonth(dateKey);
    setVisibleMonth(nextMonth);
    setSelectedDate(dateKey);
    setSelectedSlotId('');
    setSelectedDayModalOpen(true);
    setBookingModalOpen(false);
    setValidationError('');
    setSubmitError('');
    setWarning('');
  };

  const changeMonth = (delta: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1);
    setVisibleMonth(nextMonth);

    const nextDate = formatDateKey(nextMonth);
    setSelectedDate(nextDate);
    setSelectedSlotId('');
    setSelectedDayModalOpen(false);
    setBookingModalOpen(false);
  };

  const resetToToday = () => {
    const monthStart = createInitialVisibleMonth(today);
    setVisibleMonth(monthStart);
    setSelectedDate(today);
    setSelectedSlotId('');
    setSelectedDayModalOpen(false);
    setBookingModalOpen(false);
    setValidationError('');
    setSubmitError('');
    setWarning('');
  };

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setValidationError('');
    setSubmitError('');
  };

  const handleSlotSelection = (venue: Venue, slot: TimeSlot) => {
    setSelectedVenueId(venue.id);
    setSelectedSlotId(slot.id);
    setBookingModalOpen(true);
    setValidationError('');
    setSubmitError('');
  };

  const closeBookingModal = () => {
    setBookingModalOpen(false);
    setSelectedSlotId('');
    setValidationError('');
    setSubmitError('');
  };

  const closeSelectedDayModal = () => {
    setSelectedDayModalOpen(false);
    setSelectedSlotId('');
    setBookingModalOpen(false);
    setValidationError('');
    setSubmitError('');
    setWarning('');
  };

  const validateForm = () => {
    if (!user) {
      return 'You must be signed in to create a booking.';
    }

    if (!selectedDate || selectedDate < today) {
      return 'Please choose a valid booking date.';
    }

    if (!selectedVenue) {
      return 'Please choose a room from the selected day.';
    }

    if (!selectedSlot) {
      return 'Please choose a free time slot.';
    }

    if (!hasValidPax) {
      return 'Expected pax must be greater than zero.';
    }

    if (selectedPax > selectedVenue.capacity) {
      return `Expected pax exceeds the ${selectedVenue.capacity}-guest capacity for this room.`;
    }

    if (!form.guestPhone.trim()) {
      return 'Phone number is required.';
    }

    if (!form.eventTitle.trim()) {
      return 'Event title is required.';
    }

    if (findActiveBookingForSlot(selectedVenue.id, selectedDate, selectedSlot.id)) {
      return 'That slot has just been taken. Please choose another slot.';
    }

    return '';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errorMessage = validateForm();
    setValidationError(errorMessage);
    setSubmitError('');
    setWarning('');

    if (errorMessage || !user || !selectedVenue || !selectedSlot) {
      return;
    }

    const payload: CreateBookingInput = {
      userId: user.uid,
      venueId: selectedVenue.id,
      venueName: selectedVenue.name,
      guestName: user.displayName,
      guestEmail: user.email,
      guestPhone: form.guestPhone.trim(),
      organization: form.organization.trim(),
      date: selectedDate,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      startTimestamp: toTimestamp(selectedDate, selectedSlot.start),
      endTimestamp: toTimestamp(selectedDate, selectedSlot.end),
      eventTitle: form.eventTitle.trim(),
      eventType: form.eventType,
      expectedPax: selectedPax,
      specialRequests: form.specialRequests.trim(),
    };

    setSubmitting(true);

    try {
      const bookingId = await createBooking(payload);
      let emailWarning = '';

      try {
        await sendBookingSubmittedNotifications({
          id: bookingId,
          guestName: payload.guestName,
          guestEmail: payload.guestEmail,
          venueName: payload.venueName,
          date: payload.date,
          startTime: payload.startTime,
          endTime: payload.endTime,
          eventTitle: payload.eventTitle,
        });
      } catch (emailError) {
        emailWarning = getEmailDeliveryWarning(
          emailError,
          'Booking was saved, but the confirmation email could not be sent.'
        );
      }

      navigate(`/confirmation/${bookingId}`, {
        state: emailWarning ? { emailWarning } : undefined,
      });
    } catch (bookingError) {
      setSubmitError(
        bookingError instanceof Error
          ? bookingError.message
          : 'Unable to submit booking right now.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderPreviewContent = (dateKey: string) => {
    const metrics = dayMetrics[dateKey];
    const roomSummaries = buildRoomSummariesForDate(dateKey).slice(0, 4);
    const styles = getStatusClasses(metrics?.status ?? 'open');

    return (
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatLongDate(dateKey)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {metrics?.occupiedSlots ?? 0} of {metrics?.totalSlots ?? 0} slots occupied
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}
          >
            {getStatusLabel(metrics?.status ?? 'open')}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {roomSummaries.map((summary) => (
            <div
              key={summary.venue.id}
              className="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-950/60"
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {summary.venue.name}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {summary.freeSlots}/{TIME_SLOTS.length} free
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardShell
      badge="Calendar Hub"
      title="Calendar Hub"
      description="Use the month calendar as your main booking surface. Pick a day, inspect room load, and complete the booking from the same page."
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
      {(error || warning) && (
        <div
          className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
            error
              ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300'
              : 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300'
          }`}
        >
          {error || warning}
        </div>
      )}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-5 border-b border-gray-200 pb-6 dark:border-gray-800 xl:flex-row xl:items-center xl:justify-between">
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
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Hover for a quick preview on desktop, then click any date to open the day popup.
              </p>
            </div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-xl border border-gray-200 p-3 text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
              {(['open', 'partial', 'full'] as CalendarDayStatus[]).map((status) => {
                const styles = getStatusClasses(status);

                return (
                  <span
                    key={status}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 ${styles.badge}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${styles.marker}`} />
                    {getStatusLabel(status)}
                  </span>
                );
              })}
            </div>
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
            No active rooms are available in the calendar hub yet.
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-2">
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-7">
              {monthCells.map((cell) => {
                const metrics = dayMetrics[cell.dateKey];
                const styles = getStatusClasses(metrics?.status ?? 'open');
                const isToday = cell.dateKey === today;
                const isSelected = cell.dateKey === selectedDate;
                const showPreview =
                  hoveredDate === cell.dateKey && !isMobileViewport && Boolean(metrics);

                return (
                  <div
                    key={cell.dateKey}
                    className="relative"
                    onMouseEnter={() => {
                      if (!isMobileViewport) {
                        setHoveredDate(cell.dateKey);
                      }
                    }}
                    onMouseLeave={() => setHoveredDate((current) => (current === cell.dateKey ? null : current))}
                  >
                    <button
                      type="button"
                      onClick={() => handleDaySelection(cell.dateKey)}
                      className={`flex min-h-[92px] w-full flex-col rounded-3xl border p-3 text-left transition-colors sm:min-h-[96px] xl:min-h-[112px] ${styles.cell} ${
                        isSelected
                          ? 'ring-2 ring-brand-maroon/40 dark:ring-red-300/40'
                          : 'hover:border-brand-maroon hover:shadow-sm dark:hover:border-red-300'
                      } ${cell.inCurrentMonth ? '' : 'opacity-60'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-base font-bold text-gray-900 dark:text-white ${
                            isToday
                              ? 'bg-white/80 shadow-sm dark:bg-gray-950/80'
                              : ''
                          }`}
                        >
                          {parseDateKey(cell.dateKey).getDate()}
                        </span>
                        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${styles.marker}`} />
                      </div>
                    </button>

                    {showPreview && (
                      <div className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-[22rem] -translate-x-1/2 pt-3 xl:block">
                        {renderPreviewContent(cell.dateKey)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {selectedDayModalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-gray-950/60 backdrop-blur-sm"
            onClick={closeSelectedDayModal}
          />
          <div className="fixed inset-x-0 bottom-0 top-4 z-50 mx-auto flex w-full max-w-7xl items-end px-4 pb-4 sm:top-6 sm:items-center sm:px-6">
            <section className="max-h-full w-full overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
              <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 p-5 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95 sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-brand-maroon/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Selected Day
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                      {formatLongDate(selectedDate)}
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {canModerate
                        ? 'Choose a room and slot here, then continue with the popup booking form or jump into moderation.'
                        : 'Choose a room and free slot here. The booking form will open as a popup for the room you pick.'}
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="min-w-[9rem] rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-950/60">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-400">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Day Status
                        </div>
                        <div className="mt-2 font-semibold text-gray-900 dark:text-white">
                          {getStatusLabel(selectedDateMetrics.status)}
                        </div>
                      </div>
                      <div className="min-w-[9rem] rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-950/60">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          Occupied
                        </div>
                        <div className="mt-2 font-semibold text-gray-900 dark:text-white">
                          {selectedDateMetrics.occupiedSlots}/{selectedDateMetrics.totalSlots} slots
                        </div>
                      </div>
                      <div className="min-w-[9rem] rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-950/60">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-400">
                          <Users className="h-3.5 w-3.5" />
                          Open Rooms
                        </div>
                        <div className="mt-2 font-semibold text-gray-900 dark:text-white">
                          {selectedDateMetrics.openRooms}/{venues.length}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={closeSelectedDayModal}
                      className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className={`p-5 sm:p-6 ${canModerate ? 'grid gap-8 xl:grid-cols-[1.1fr_0.9fr]' : ''}`}>
                <section className="space-y-4">
                  {selectedDateRoomSummaries.map((summary) => {
                    const roomTooSmall = hasValidPax && selectedPax > summary.venue.capacity;

                    return (
                      <article
                        key={summary.venue.id}
                        className={`rounded-3xl border p-5 transition-colors ${
                          selectedVenueId === summary.venue.id
                            ? 'border-brand-maroon bg-brand-maroon/5 dark:border-red-300 dark:bg-brand-maroon/10'
                            : 'border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              <MapPin className="h-3.5 w-3.5" />
                              {summary.freeSlots}/{TIME_SLOTS.length} slots open
                            </div>
                            <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                              {summary.venue.name}
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                              <span className="inline-flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Capacity up to {summary.venue.capacity} guests
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {roomTooSmall ? (
                              <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                Too small for {selectedPax} pax
                              </span>
                            ) : selectedVenueId === summary.venue.id ? (
                              <span className="inline-flex rounded-full bg-brand-maroon px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                                Selected Room
                              </span>
                            ) : null}

                            {canModerate && (
                              <Link
                                to={`/admin/bookings?date=${selectedDate}&venueId=${summary.venue.id}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                              >
                                Open moderation
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {summary.slotStates.map(({ slot, booking }) => {
                            const isSelected =
                              selectedVenueId === summary.venue.id && selectedSlotId === slot.id;

                            if (booking) {
                              return (
                                <div
                                  key={slot.id}
                                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-900/10"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="font-semibold text-gray-900 dark:text-white">
                                        {slot.label}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {slot.start} - {slot.end}
                                      </div>
                                    </div>
                                    <StatusBadge status={booking.status} />
                                  </div>
                                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {booking.eventTitle}
                                    </div>
                                    <div>{booking.guestName}</div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={roomTooSmall}
                                onClick={() => handleSlotSelection(summary.venue, slot)}
                                className={`rounded-2xl border px-4 py-3 text-left transition ${
                                  isSelected
                                    ? 'border-brand-maroon bg-brand-maroon/5 dark:border-red-300 dark:bg-brand-maroon/10'
                                    : 'border-green-200 bg-green-50 hover:border-brand-maroon dark:border-green-900/40 dark:bg-green-900/10 dark:hover:border-red-300'
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                      {slot.label}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {slot.start} - {slot.end}
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700 dark:text-green-300">
                                    {isSelected ? 'Selected' : 'Open'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </section>

                {canModerate && (
                  <div className="space-y-6">
                    <section className="rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Day Activity
                      </h3>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Every booking already recorded for this day, including closed decisions.
                      </p>

                      {selectedDateAllBookings.length === 0 ? (
                        <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                          No bookings recorded for this day yet.
                        </div>
                      ) : (
                        <div className="mt-5 space-y-3">
                          {selectedDateAllBookings.map((booking) => (
                            <article
                              key={booking.id}
                              className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-semibold text-gray-900 dark:text-white">
                                      {booking.eventTitle}
                                    </h4>
                                    <StatusBadge status={booking.status} />
                                  </div>
                                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    {booking.venueName} • {booking.startTime} - {booking.endTime}
                                  </div>
                                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {booking.guestName} • {booking.guestEmail}
                                  </div>
                                </div>
                                <Link
                                  to={`/admin/bookings?date=${booking.date}&venueId=${booking.venueId}&q=${encodeURIComponent(booking.guestEmail)}`}
                                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                                >
                                  Open in Bookings
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {bookingModalOpen && selectedVenue && selectedSlot && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-gray-950/60 backdrop-blur-sm"
            onClick={closeBookingModal}
          />
          <div className="fixed inset-x-0 bottom-0 top-6 z-[70] mx-auto flex w-full max-w-3xl items-end px-4 pb-4 sm:top-10 sm:items-center sm:px-6">
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="max-h-full w-full overflow-y-auto rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand-maroon/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
                    Booking Form
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
                    {selectedVenue.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {canModerate
                      ? 'This popup is already tied to the selected room and slot. After submit, you can approve it from Booking Moderation.'
                      : 'This popup is already tied to the selected room and slot. Complete the request and submit it here.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeBookingModal}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Selected Schedule</div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {selectedVenue.name}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {formatLongDate(selectedDate)}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {selectedSlot.label} • {selectedSlot.start} - {selectedSlot.end}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    Capacity up to {selectedVenue.capacity} guests
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-gray-50 p-4 dark:bg-gray-950/60">
                <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Account Snapshot</div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {user?.displayName}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">{user?.email}</div>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Phone Number
                    </label>
                    <input
                      name="guestPhone"
                      value={form.guestPhone}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      placeholder="+60 12-345 6789"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Organization
                    </label>
                    <input
                      name="organization"
                      value={form.organization}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      placeholder="Your team or organization"
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Expected Pax
                    </label>
                    <input
                      name="expectedPax"
                      type="number"
                      min="1"
                      value={form.expectedPax}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      placeholder="Number of guests"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Event Type
                    </label>
                    <select
                      name="eventType"
                      value={form.eventType}
                      onChange={handleFieldChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Event Title
                  </label>
                  <input
                    name="eventTitle"
                    value={form.eventTitle}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    placeholder="Quarterly planning session"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Special Requests
                  </label>
                  <textarea
                    name="specialRequests"
                    rows={4}
                    value={form.specialRequests}
                    onChange={handleFieldChange}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    placeholder="Any setup notes, accessibility needs, or special requests."
                  />
                </div>
              </div>

              {(validationError || submitError) && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{validationError || submitError}</span>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Conflict checks still run when you submit and again when admin approves.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeBookingModal}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedVenue || !selectedSlot}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-maroon px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting
                      </>
                    ) : (
                      'Submit booking request'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}
    </DashboardShell>
  );
};

export default CalendarPage;
