import React, { useEffect, useMemo, useState } from 'react';
import { Booking, BookingStatus, Room, User } from '../types';
import {
  BarChart3,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Lock,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import Card from './ui/Card';
import { formatDateStandard } from '../utils';

interface RoomAvailabilityProps {
  rooms: Room[];
  bookings: Booking[];
  allUsers: User[];
  onDateSelect?: (date: string, roomId: string) => void;
  currentUserId?: string;
}

type AvailabilityStatus = 'FREE' | 'PARTIAL' | 'FULL' | 'MAINTENANCE';

type DayModalState = {
  date: Date;
  roomId: string;
} | null;

type ViewMode = 'calendar' | 'spreadsheet';

const RoomAvailability: React.FC<RoomAvailabilityProps> = ({
  rooms,
  bookings,
  allUsers = [],
  onDateSelect,
  currentUserId,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dayModal, setDayModal] = useState<DayModalState>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getBookingsForDate = (date: Date, roomId: string) => {
    if (!roomId) return [];

    const roomNameForPending = (rooms.find((r) => r.id === roomId)?.name || '').toLowerCase();
    const allowPendingBlocking =
      roomNameForPending.includes('rajang') ||
      roomNameForPending.includes('santubong') ||
      roomNameForPending.includes('niah');

    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startOfDay = targetDate.setHours(0, 0, 0, 0);
    const endOfDay = targetDate.setHours(23, 59, 59, 999);

    return bookings
      .filter(
        (b) =>
          b.roomId === roomId &&
          (b.status === BookingStatus.APPROVED || b.status === BookingStatus.BLOCKED || (allowPendingBlocking && b.status === BookingStatus.PENDING)) &&
          ((b.startTime >= startOfDay && b.startTime <= endOfDay) ||
            (b.endTime >= startOfDay && b.endTime <= endOfDay) ||
            (b.startTime < startOfDay && b.endTime > endOfDay))
      )
      .sort((a, b) => a.startTime - b.startTime);
  };

  const getDateStatus = (dayBookings: Booking[]): AvailabilityStatus => {
    if (dayBookings.length === 0) return 'FREE';

    const hasMaintenance = dayBookings.some((b) => b.type === 'maintenance');
    if (hasMaintenance) return 'MAINTENANCE';

    const totalDurationMs = dayBookings.reduce((acc, curr) => acc + (curr.endTime - curr.startTime), 0);
    const totalHours = totalDurationMs / (1000 * 60 * 60);

    if (totalHours >= 7) return 'FULL';
    if (totalHours > 0) return 'PARTIAL';

    return 'FREE';
  };

  const getStatusStyles = (status: AvailabilityStatus, isToday: boolean) => {
    let classes =
      'transition-all duration-200 cursor-pointer border-b border-r border-gray-100 dark:border-gray-800 ';

    if (isToday) classes += 'ring-2 ring-inset ring-indigo-500 z-10 ';

    switch (status) {
      case 'MAINTENANCE':
        return classes + 'bg-gray-50/50 dark:bg-gray-800/30';
      case 'FULL':
        return classes + 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50/70 dark:hover:bg-red-900/20';
      case 'PARTIAL':
        return classes + 'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-50/70 dark:hover:bg-orange-900/20';
      case 'FREE':
      default:
        return classes + 'bg-white dark:bg-gray-900 hover:bg-green-50/40 dark:hover:bg-green-900/10';
    }
  };

  const getStatusIndicatorColor = (status: AvailabilityStatus) => {
    switch (status) {
      case 'MAINTENANCE':
        return 'bg-gray-500';
      case 'FULL':
        return 'bg-red-500';
      case 'PARTIAL':
        return 'bg-orange-500';
      case 'FREE':
      default:
        return 'bg-green-500';
    }
  };

  const getStatusLabel = (status: AvailabilityStatus, count: number) => {
    if (status === 'MAINTENANCE') return 'Maintenance';
    if (count === 0) return 'Free';
    if (status === 'FULL') return 'Full';
    return `${count} Booking${count > 1 ? 's' : ''}`;
  };

  const getBookingDisplayInfo = (bk: Booking) => {
    // Privacy/UX: while awaiting admin approval, we still show the slot as occupied,
    // but do not expose the requester's identity/purpose to other users.
    // Applies to BOTH parent (PENDING) and auto-combined child blocks (BLOCKED).
    const isMine = !!currentUserId && bk.userId === currentUserId;
    const isPendingApproval = bk.status === BookingStatus.PENDING || ((bk as any).isCombinedChild === true && bk.status === BookingStatus.BLOCKED);

    if (isPendingApproval && !isMine) {
      return {
        blockClass: 'text-gray-700 dark:text-gray-300',
        blockText: 'Reserved (Pending Approval)',
        colorClass: 'text-gray-500 dark:text-gray-400',
        icon: <Lock className="w-3 h-3" />,
        tooltipText: 'Reserved (Pending Approval)',
      };
    }

    if (bk.type === 'maintenance') {
      return {
        blockClass: 'text-gray-700 dark:text-gray-300',
        blockText: 'Maintenance',
        colorClass: 'text-gray-500 dark:text-gray-400',
        icon: <Lock className="w-3 h-3" />,
        tooltipText: 'Maintenance Block',
      };
    }

    if (bk.bookingCategory === 'special') {
      return {
        blockClass: 'text-purple-700 dark:text-purple-200',
        blockText: 'Official Event',
        colorClass: 'text-purple-600 dark:text-purple-400',
        icon: <Shield className="w-3 h-3" />,
        tooltipText: bk.purpose,
      };
    }

    if (isMine) {
      return {
        blockClass: 'text-blue-700 dark:text-blue-200',
        blockText: bk.purpose,
        colorClass: 'text-blue-600 dark:text-blue-400 font-bold',
        icon: <UserIcon className="w-3 h-3" />,
        tooltipText: bk.purpose,
      };
    }

    const booker = (allUsers || []).find(
      (u) => (u as { id?: string }).id === bk.userId || u.uid === bk.userId
    );

    const normalize = (value?: string | null) => {
      const v = (value || '').trim();
      if (!v) return '';
      const lower = v.toLowerCase();
      // Treat these as placeholders / invalid display names
      if (lower === 'user' || lower === 'unknown' || lower === 'n/a' || lower === '-') return '';
      return v;
    };

    const displayName =
      normalize((booker as { name?: string })?.name) ||
      normalize(booker?.displayName) ||
      normalize(bk.userName) ||
      normalize(bk.userEmail) ||
      normalize(bk.userId) ||
      'Unknown';

    return {
      blockClass: 'text-red-700 dark:text-red-200',
      blockText: displayName,
      colorClass: 'text-red-500 dark:text-red-400',
      icon: <Shield className="w-3 h-3" />,
      tooltipText: displayName,
    };
  };

  const { days: totalDays, firstDay: startDay } = getDaysInMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  const isDateInPast = (date: Date) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  };

  const handleBookSlot = () => {
    if (!dayModal || !onDateSelect || !dayModal.roomId) return;

    const year = dayModal.date.getFullYear();
    const month = String(dayModal.date.getMonth() + 1).padStart(2, '0');
    const d = String(dayModal.date.getDate()).padStart(2, '0');
    onDateSelect(`${year}-${month}-${d}`, dayModal.roomId);
    setDayModal(null);
  };

  const formatModalDate = (date: Date) =>
    date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const spreadsheetDates = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => {
      const next = new Date(start);
      next.setDate(start.getDate() + i);
      return next;
    });
  }, []);

  const modalBookings = useMemo(() => {
    if (!dayModal) return [];
    return getBookingsForDate(dayModal.date, dayModal.roomId);
  }, [dayModal, bookings]);

  const modalStatus = useMemo(() => {
    if (!dayModal) return 'FREE' as AvailabilityStatus;
    return getDateStatus(modalBookings);
  }, [dayModal, modalBookings]);

  const modalRoom = useMemo(() => {
    if (!dayModal) return null;
    return rooms.find((room) => room.id === dayModal.roomId) ?? null;
  }, [dayModal, rooms]);

  return (
    <div className="space-y-3">
        {/* Box 1 (mobile): Title + controls */}
        <div className="mx-0 mt-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
            <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Room Availability
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Check availability at a glance.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
          <div className="grid grid-cols-2 w-full sm:w-auto rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 w-full ${
                viewMode === 'calendar'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <CalendarIcon className="w-4 h-4" /> Month View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('spreadsheet')}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 w-full ${
                viewMode === 'spreadsheet'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> 2-Week Matrix
            </button>
          </div>

          {viewMode === 'calendar' && (
            <div className="relative w-full sm:w-64">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none appearance-none cursor-pointer"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full sm:w-auto">
              <button
                onClick={prevMonth}
                className="p-2 sm:p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-sm transition-all text-gray-600 dark:text-gray-300"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-2 font-medium min-w-[140px] text-center text-gray-900 dark:text-white select-none text-sm sm:text-base">
                {formatDateStandard(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1))}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 sm:p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-md shadow-sm transition-all text-gray-600 dark:text-gray-300"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      </div>

      {/* Box 2 (mobile): Calendar / Matrix */}
      <div className="mx-0 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {viewMode === 'calendar' ? (
        <div className="border-0 rounded-none overflow-visible shadow-none">
          <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {weekDays.map((d) => (
              <div
                key={d}
                className="py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-900 gap-px border-gray-200 dark:border-gray-800">
            {Array.from({ length: startDay }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[84px] sm:min-h-[120px] bg-white dark:bg-gray-900/50 opacity-50"
              />
            ))}

            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const dayBookings = getBookingsForDate(date, selectedRoomId);
              const status = getDateStatus(dayBookings);

              const isToday =
                day === new Date().getDate() &&
                currentMonth.getMonth() === new Date().getMonth() &&
                currentMonth.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={day}
                  onClick={() => {
                    if (!selectedRoomId) return;
                    setDayModal({ date, roomId: selectedRoomId });
                  }}
                  className={`relative group min-h-[84px] sm:min-h-[120px] p-2 ${getStatusStyles(
                    status,
                    isToday
                  )}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-xs sm:text-sm font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {day}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${getStatusIndicatorColor(status)} ${
                        status !== 'FREE'
                          ? 'ring-1 ring-white dark:ring-gray-800'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    {/* Desktop/tablet: show up to 2 booking lines */}
                    <div className="hidden sm:flex sm:flex-col sm:gap-1">
                      {dayBookings.slice(0, 2).map((bk) => {
                        const info = getBookingDisplayInfo(bk);
                        return (
                          <div
                            key={bk.id}
                            className={`text-[10px] truncate ${info.blockClass}`}
                            title={`${formatTime(bk.startTime)} - ${info.blockText}`}
                          >
                            {formatTime(bk.startTime)} - {info.blockText}
                          </div>
                        );
                      })}
                      {dayBookings.length > 2 && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          + {dayBookings.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Mobile: show count badge (clean + tap for details) */}
                    <div className="sm:hidden mt-2 flex items-end justify-center">
                      {status !== 'FREE' && (
                        <span
                          className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[11px] font-semibold text-white ${getStatusIndicatorColor(
                            status
                          )}`}
                          aria-label={getStatusLabel(status, dayBookings.length)}
                        >
                          {status === 'MAINTENANCE' ? 'M' : dayBookings.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border-0 rounded-none shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div
                className="grid"
                style={{ gridTemplateColumns: `120px repeat(14, minmax(84px, 1fr))` }}
              >
                <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 text-xs font-semibold uppercase text-gray-500">
                  Rooms
                </div>
                {spreadsheetDates.map((date) => (
                  <div
                    key={date.toISOString()}
                    className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 py-3 text-xs font-semibold text-gray-500 text-center"
                  >
                    {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                ))}

                {rooms.map((room) => (
                  <React.Fragment key={room.id}>
                    <div className="border-b border-gray-100 dark:border-gray-800 px-3 py-3 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900">
                      <span className="block truncate" title={room.name}>{room.name}</span>
                    </div>
                    {spreadsheetDates.map((date) => {
                      const dayBookings = getBookingsForDate(date, room.id);
                      const status = getDateStatus(dayBookings);
                      const isToday =
                        date.getDate() === new Date().getDate() &&
                        date.getMonth() === new Date().getMonth() &&
                        date.getFullYear() === new Date().getFullYear();

                      return (
                        <div
                          key={`${room.id}-${date.toISOString()}`}
                          onClick={() => setDayModal({ date, roomId: room.id })}
                          className={`border-b border-gray-100 dark:border-gray-800 px-2 py-3 text-[10px] font-semibold text-gray-600 dark:text-gray-300 text-center ${getStatusStyles(
                            status,
                            isToday
                          )}`}
                        >
                          {/* Desktop/tablet: label. Mobile: number only */}
                          <span className="hidden sm:inline">
                            {getStatusLabel(status, dayBookings.length)}
                          </span>
                          <span className="sm:hidden">
                            {status === 'MAINTENANCE'
                              ? '🚫'
                              : status === 'FREE'
                                ? 'Free'
                                : status === 'FULL'
                                  ? 'Full'
                                  : dayBookings.length}
                          </span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Box 3 (mobile): Legend */}
      <div className="mx-0 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Legend:</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Partial</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Full</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Special Event</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">My Booking</span>
          </div>
        </div>
      </div>
      {dayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatModalDate(dayModal.date)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {modalRoom?.name ?? 'Room'}
                </p>
              </div>
              <button
                onClick={() => setDayModal(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 max-h-[320px] overflow-y-auto">
              {modalBookings.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No bookings for this date.</p>
              ) : (
                <ul className="space-y-3">
                  {modalBookings.map((bk) => {
                    const info = getBookingDisplayInfo(bk);
                    return (
                      <li key={bk.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatTime(bk.startTime)} - {formatTime(bk.endTime)}
                        </span>
                        <span className={`ml-3 truncate ${info.colorClass}`}>
                          {info.tooltipText}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={handleBookSlot}
                disabled={isDateInPast(dayModal.date) || modalStatus === 'MAINTENANCE'}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                Book a Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomAvailability;
