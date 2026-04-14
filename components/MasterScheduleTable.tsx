import React from 'react';
import { Booking, Room, BookingStatus } from '../types';
import { Check, Printer, Hammer, Lock, Star } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { extractSpecialRequest } from '../utils/specialRequest';

interface MasterScheduleTableProps {
  bookings: Booking[];
  rooms: Room[];
  onSelectBooking: (booking: Booking) => void;
  onPrintRoom: (roomId: string) => void;
}

const MasterScheduleTable: React.FC<MasterScheduleTableProps> = ({ bookings, rooms, onSelectBooking, onPrintRoom }) => {
  
  // Helper to format date DD/MM/YYYY
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Helper to format time HH:MM
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRefreshmentBadge = (refreshment?: string | null) => {
    const raw = String(refreshment || '').trim().toLowerCase();

    if (!raw || raw === 'no refreshment') {
      return { symbol: 'Ø', short: 'RF', full: 'NO REFRESHMENT', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' };
    }

    if (
      raw.includes('tea') && raw.includes('coffee') &&
      (raw.includes('only') || raw === 'tea & coffee' || raw === 'tea and coffee')
    ) {
      return { symbol: '☕', short: 'T&C', full: 'TEA & COFFEE ONLY', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' };
    }

    return { symbol: '🍽', short: 'R+T&C', full: 'REFRESHMENT WITH TEA & COFFEE', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' };
  };

  const getSpecialRequestBadge = (specialRequest?: string) => {
    const info = extractSpecialRequest(specialRequest);
    if (!info.hasRequest) {
      return { symbol: '—', short: 'SR', full: 'NO SPECIAL REQUEST', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 opacity-60' };
    }

    return {
      symbol: 'SR',
      short: info.summary || 'SR',
      full: `SPECIAL REQUEST (Info Only)\nDetected: ${info.summary || 'general request'}\n\n${info.rawText}`,
      cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/40',
    };
  };

  // Helper for row styles based on status
  const getRowStyles = (booking: Booking) => {
    if (booking.type === 'maintenance') {
        // Striped background for maintenance
        return "bg-gray-100 dark:bg-gray-800 bg-[length:10px_10px] bg-[linear-gradient(45deg,#0000000d_25%,transparent_25%,transparent_50%,#0000000d_50%,#0000000d_75%,transparent_75%,transparent)] border-l-4 border-l-gray-400";
    }

    if (booking.bookingCategory === 'special') {
        return "bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20 border-l-4 border-l-purple-500";
    }

    switch (booking.status) {
        case BookingStatus.PENDING:
            return "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20";
        case BookingStatus.REJECTED:
            return "bg-gray-100 dark:bg-gray-800 opacity-60 line-through text-gray-400";
        case BookingStatus.CANCELLED:
            return "bg-gray-100 dark:bg-gray-800 opacity-60 line-through text-gray-400";
        default:
            return "hover:bg-blue-50/50 dark:hover:bg-blue-900/20";
    }
  };

  return (
    <div className="w-full h-full overflow-hidden flex flex-col border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
      <div className="overflow-auto max-h-[600px] w-full">
        <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr>
              {/* --- INFO HEADERS (Blue) --- */}
              <th className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 px-3 py-2 font-semibold border-r border-b border-gray-300 dark:border-gray-700 w-32">
                Status
              </th>
              <th className="bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 px-3 py-2 font-semibold border-r border-b border-gray-300 dark:border-gray-700 w-28">
                Date
              </th>
              <th className="bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 px-3 py-2 font-semibold border-r border-b border-gray-300 dark:border-gray-700 w-32">
                Time
              </th>
              <th className="bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 px-3 py-2 font-semibold border-r border-b border-gray-300 dark:border-gray-700 min-w-[200px]">
                Meeting / Function
              </th>
              <th className="bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 px-3 py-2 font-semibold border-r border-b border-gray-300 dark:border-gray-700 w-16 text-center">
                Pax
              </th>
              <th className="bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 px-3 py-2 font-semibold border-r border-b border-gray-300 dark:border-gray-700 w-24 text-center">
                RF
              </th>
              <th className="bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 px-3 py-2 font-semibold border-r border-b border-gray-300 dark:border-gray-700 w-28 text-center">
                SR
              </th>
              <th className="bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 px-3 py-2 font-semibold border-r border-b border-gray-300 dark:border-gray-700 w-40">
                Booked By
              </th>
              <th className="bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 px-3 py-2 font-semibold border-r border-b border-gray-300 dark:border-gray-700 w-32">
                Division
              </th>

              {/* --- VENUE MATRIX HEADERS (Green) --- */}
              {rooms.map(room => (
                <th key={room.id} className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 px-2 py-2 font-semibold border-r border-b border-gray-300 dark:border-gray-700 text-center min-w-[100px] group">
                  <div className="flex flex-col items-center gap-1">
                    <span className="uppercase">{room.name.split(' ')[0]}</span>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onPrintRoom(room.id);
                        }}
                        className="opacity-50 group-hover:opacity-100 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 transition-opacity"
                        title="Print Daily Schedule"
                    >
                        <Printer className="w-3 h-3" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {bookings.length === 0 ? (
                <tr>
                    <td colSpan={8 + rooms.length} className="p-8 text-center text-gray-400 italic">No bookings found</td>
                </tr>
            ) : (
                bookings.map((booking) => {
                const rf = getRefreshmentBadge(booking.type === 'maintenance' ? null : booking.refreshment);
                const sr = getSpecialRequestBadge(booking.type === 'maintenance' ? '' : booking.specialRequest);
                return (
                <tr 
                    key={booking.id}
                    onClick={() => onSelectBooking(booking)}
                    className={`cursor-pointer transition-colors group ${getRowStyles(booking)}`}
                >
                    {/* Status - Now using Component */}
                    <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700">
                        <StatusBadge 
                            status={booking.status} 
                            isPrinted={booking.isPrinted} 
                            category={booking.bookingCategory} 
                        />
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatDate(booking.startTime)}
                    </td>

                    {/* Time */}
                    <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap font-mono text-[11px]">
                    {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </td>

                    {/* Purpose */}
                    <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium truncate max-w-[200px]" title={booking.purpose}>
                        {booking.type === 'maintenance' ? (
                            <span className="flex items-center gap-1 italic text-gray-500">
                                <Hammer className="w-3 h-3" /> {booking.purpose}
                            </span>
                        ) : booking.bookingCategory === 'special' ? (
                             <span className="flex items-center gap-1 font-bold text-purple-700 dark:text-purple-400">
                                <Star className="w-3 h-3 fill-current" /> {booking.purpose}
                            </span>
                        ) : booking.purpose}
                    </td>

                    {/* Pax */}
                    <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-center">
                    {booking.pax || '-'}
                    </td>

                    {/* Refreshment */}
                    <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-center">
                        <span
                          title={rf.full}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${rf.cls}`}
                        >
                          <span>{rf.symbol}</span>
                          <span>{rf.short}</span>
                        </span>
                    </td>

                    {/* Special Request (Info Only) */}
                    <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-center">
                        <span
                          title={sr.full}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${sr.cls}`}
                        >
                          <span>{sr.symbol}</span>
                          <span className="max-w-[110px] truncate" title={sr.full}>{sr.short}</span>
                        </span>
                    </td>

                    {/* Booked By */}
                    <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 truncate max-w-[150px]" title={booking.userEmail}>
                        {booking.type === 'maintenance' ? 'SYSTEM' : booking.userEmail.split('@')[0]}
                    </td>

                    {/* Division */}
                    <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 truncate">
                    {booking.unit || 'General'}
                    </td>

                    {/* --- MATRIX CELLS --- */}
                    {rooms.map(room => {
                        const combinedIds = (booking as any).combinedRoomIds as string[] | undefined;
                        const isMatch = booking.roomId === room.id || (Array.isArray(combinedIds) && combinedIds.includes(room.id));
                        return (
                            <td 
                                key={room.id} 
                                className={`
                                    border-r border-gray-200 dark:border-gray-700 text-center
                                    ${isMatch ? 'bg-black/5 dark:bg-white/5' : ''}
                                `}
                            >
                                {isMatch && (
                                    <div className="flex justify-center items-center">
                                        {booking.type === 'maintenance' ? (
                                            <Lock className="w-4 h-4 text-gray-500" />
                                        ) : booking.bookingCategory === 'special' ? (
                                            <Star className="w-4 h-4 text-purple-600 dark:text-purple-400 fill-current" />
                                        ) : (
                                            <Check className={`w-4 h-4 ${booking.status === BookingStatus.REJECTED ? 'text-gray-400' : 'text-indigo-600 dark:text-indigo-400'}`} strokeWidth={3} />
                                        )}
                                    </div>
                                )}
                            </td>
                        );
                    })}
                </tr>
                );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MasterScheduleTable;
