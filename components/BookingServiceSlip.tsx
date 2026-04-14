import React from 'react';
import { Booking } from '../types';

interface BookingServiceSlipProps {
  booking: Booking;
}

export const BookingServiceSlip = React.forwardRef<HTMLDivElement, BookingServiceSlipProps>((props, ref) => {
  const { booking } = props;

  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  
  // Dates
  const startDateStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const endDateStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const isSameDay = startDateStr === endDateStr;

  // Times
  const startTimeStr = start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const endTimeStr = end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  // Standard Format: "10 Jan 2026 | 2:00 PM - 4:00 PM"
  const dateTimeString = isSameDay 
    ? `${startDateStr} | ${startTimeStr} - ${endTimeStr}`
    : `${startDateStr} - ${endDateStr}`;

  // Extract a readable name from email since display name isn't on the booking object
  const bookedByName = booking.userEmail.split('@')[0]
    .split('.')
    .map(n => n.charAt(0).toUpperCase() + n.slice(1))
    .join(' ');

  const hasRefreshments = booking.refreshment && booking.refreshment !== 'No Refreshment';

  // --- SPECIAL LAYOUT (DOOR SIGNAGE) ---
  if (booking.bookingCategory === 'special') {
      return (
        <div ref={ref} className="w-full h-screen bg-white text-black flex flex-col items-center justify-between p-12 font-sans box-border border-[16px] border-black">
            
            {/* Top Label */}
            <div className="w-full text-center border-b-4 border-black pb-4">
                <h2 className="text-3xl font-bold uppercase tracking-[0.2em] text-gray-600">
                    Official Function
                </h2>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col justify-center items-center text-center space-y-12 w-full">
                
                {/* Huge Purpose */}
                <h1 className="text-8xl font-black text-black leading-none uppercase break-words w-full">
                    {(booking.purpose || "").toUpperCase()}
                </h1>

                {/* Room Name */}
                <div className="bg-black text-white px-10 py-4 rounded-full">
                    <h2 className="text-5xl font-bold uppercase tracking-widest">
                        {booking.roomName}
                    </h2>
                </div>

                {/* Subtext (Unit / Dept) */}
                <h3 className="text-5xl font-bold text-gray-500 uppercase tracking-widest">
                    {booking.unit || 'SECRETARIAT ROOM'}
                </h3>

            </div>

            {/* Footer: Dates */}
            <div className="w-full border-t-4 border-black pt-6 text-center">
                <p className="text-4xl font-bold text-gray-800">
                    {startDateStr} <span className="text-gray-400 mx-2">TO</span> {endDateStr}
                </p>
                {isSameDay && (
                    <p className="text-2xl text-gray-600 mt-2 font-medium">
                        {startTimeStr} - {endTimeStr}
                    </p>
                )}
            </div>

        </div>
      );
  }

  // --- STANDARD LAYOUT ---
  return (
    <div ref={ref} className="w-full h-screen bg-white text-black flex flex-col items-center justify-center text-center p-8 font-sans box-border">
      
      {/* Container to handle vertical spacing naturally */}
      <div className="flex-grow flex flex-col justify-center items-center w-full max-w-5xl space-y-8">
        
        {/* Meeting Title (PRINT: force uppercase for signage) */}
        <h1 className="text-6xl font-extrabold text-black leading-tight break-words w-full uppercase">
          {(booking.purpose || '').toUpperCase()}
        </h1>

        {/* Meeting Room */}
        <h2 className="text-4xl font-bold text-gray-800 uppercase tracking-widest border-t-4 border-black pt-8 mt-4">
          {booking.roomName}
        </h2>

        {/* Date & Time */}
        <div className="text-3xl font-semibold text-gray-700">
          {dateTimeString}
        </div>

        {/* Pax */}
        <div className="text-xl font-semibold text-gray-600">
          Number of Pax: <span className="text-gray-900">{booking.pax ? `${booking.pax} Pax` : '-'}</span>
        </div>

      </div>

      {/* Footer Section */}
      <div className="mt-auto space-y-2 pb-8">
         {/* Booked By */}
        <div className="text-lg text-gray-500 font-medium">
          Booked by: <span className="text-gray-800">{bookedByName}</span>
        </div>

        {/* Refreshments (Conditional) */}
        {hasRefreshments && (
           <div className="text-xs text-gray-400 italic">
              Refreshments: {booking.refreshment}
          </div>
        )}

        {/* Printed Info */}
        <div className="text-xs text-gray-300 pt-4 uppercase tracking-wider">
          Printed on: {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
});

BookingServiceSlip.displayName = 'BookingServiceSlip';
