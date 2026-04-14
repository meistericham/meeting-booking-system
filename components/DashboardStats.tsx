import React from 'react';
import { Booking, BookingStatus } from '../types';
import { CalendarDays, AlertCircle, MonitorPlay } from 'lucide-react';

interface DashboardStatsProps {
  bookings: Booking[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ bookings }) => {
  // Helper to check if a date is today
  const isToday = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Calculate Stats
  const bookingsToday = bookings.filter(b => isToday(b.startTime));
  const countToday = bookingsToday.length;
  
  const pendingCount = bookings.filter(b => b.status === BookingStatus.PENDING).length;

  // Distinct rooms booked today
  const uniqueRoomsToday = new Set(bookingsToday.map(b => b.roomId)).size;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
      {/* Today's Bookings */}
      <div className="bg-blue-600 dark:bg-blue-900 rounded-xl p-6 text-white shadow-sm flex items-center justify-between transition-transform hover:scale-[1.02]">
        <div>
          <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Bookings Today</p>
          <p className="text-4xl font-bold mt-1">{countToday}</p>
        </div>
        <div className="bg-blue-500/30 p-3 rounded-lg">
          <CalendarDays className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Pending Actions */}
      <div className="bg-amber-500 dark:bg-amber-700 rounded-xl p-6 text-white shadow-sm flex items-center justify-between transition-transform hover:scale-[1.02]">
        <div>
          <p className="text-amber-100 text-sm font-medium uppercase tracking-wider">Pending Actions</p>
          <p className="text-4xl font-bold mt-1">{pendingCount}</p>
        </div>
        <div className="bg-amber-400/30 p-3 rounded-lg">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Active Rooms */}
      <div className="bg-emerald-600 dark:bg-emerald-900 rounded-xl p-6 text-white shadow-sm flex items-center justify-between transition-transform hover:scale-[1.02]">
        <div>
          <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Active Rooms</p>
          <p className="text-4xl font-bold mt-1">{uniqueRoomsToday}</p>
        </div>
        <div className="bg-emerald-500/30 p-3 rounded-lg">
          <MonitorPlay className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;