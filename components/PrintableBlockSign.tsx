import React from 'react';
import { Booking } from '../types';
import { TriangleAlert, Star, Ban, Calendar, MapPin } from 'lucide-react';

interface PrintableBlockSignProps {
  booking: Booking;
}

export const PrintableBlockSign = React.forwardRef<HTMLDivElement, PrintableBlockSignProps>((props, ref) => {
  const { booking } = props;
  
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
  
  const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const dateRange = isSameDay 
    ? `${formatDate(startDate)}`
    : `${formatDate(startDate)} - ${formatDate(endDate)}`;
    
  const timeRange = isSameDay
    ? `${formatTime(startDate)} - ${formatTime(endDate)}`
    : null;

  // Logic: Check 'type' first, fall back to 'bookingCategory'
  const isMaintenance = booking.type === 'maintenance';
  const isSpecial = booking.type === 'special' || booking.bookingCategory === 'special';
  
  // Dynamic Styles configuration
  let theme = {
      borderColor: "",
      textColor: "",
      bgColor: "",
      icon: null,
      mainTitle: "",
      subTitleLabel: "",
      subTitleValue: ""
  };

  if (isMaintenance) {
      theme = {
          borderColor: "border-red-600",
          textColor: "text-red-700",
          bgColor: "bg-red-50",
          icon: <TriangleAlert className="w-24 h-24 text-red-600 mb-6" strokeWidth={1.5} />,
          mainTitle: "TEMPORARILY UNAVAILABLE",
          subTitleLabel: "REASON",
          subTitleValue: booking.purpose
      };
  } else if (isSpecial) {
      theme = {
          borderColor: "border-purple-700",
          textColor: "text-purple-800",
          bgColor: "bg-purple-50",
          icon: <Star className="w-24 h-24 text-purple-700 fill-purple-100 mb-6" strokeWidth={1.5} />,
          mainTitle: booking.purpose, // Use the function name as the big title
          subTitleLabel: "EVENT TYPE",
          subTitleValue: "OFFICIAL FUNCTION / SECRETARIAT"
      };
  } else {
      // Fallback
      theme = {
          borderColor: "border-gray-800",
          textColor: "text-gray-900",
          bgColor: "bg-gray-50",
          icon: <Ban className="w-24 h-24 text-gray-800 mb-6" strokeWidth={1.5} />,
          mainTitle: "ACCESS RESTRICTED",
          subTitleLabel: "DETAILS",
          subTitleValue: booking.purpose
      };
  }

  return (
    <div ref={ref} className="w-full h-screen bg-white flex items-center justify-center p-8 box-border font-sans">
       
       {/* Main Card Container - Centered on A4 */}
       <div className={`w-full max-w-5xl aspect-[1.4/1] flex flex-col items-center justify-center text-center border-[12px] rounded-3xl p-12 ${theme.borderColor} ${theme.bgColor}`}>
          
          {/* Header Icon */}
          {theme.icon}

          {/* Main Title */}
          <h1 className={`text-6xl font-extrabold uppercase tracking-tight leading-tight mb-8 px-4 ${theme.textColor}`}>
             {theme.mainTitle}
          </h1>

          {/* Divider */}
          <div className="w-32 h-2 bg-gray-300 rounded-full mb-8"></div>

          {/* Subtitle / Reason */}
          <div className="mb-10">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">
                  {theme.subTitleLabel}
              </p>
              <h2 className="text-4xl font-bold text-gray-800 max-w-3xl leading-snug">
                  {theme.subTitleValue}
              </h2>
          </div>

          {/* Footer Info Box */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-10 py-6 w-full max-w-3xl flex justify-between items-center">
              
              {/* Location */}
              <div className="text-left">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                      <MapPin className="w-4 h-4" /> Location
                  </div>
                  <div className="text-2xl font-bold text-gray-900 uppercase">
                      {booking.roomName}
                  </div>
              </div>

              {/* Date */}
              <div className="text-right">
                  <div className="flex items-center justify-end gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                      <Calendar className="w-4 h-4" /> Date & Time
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                      {dateRange}
                  </div>
                  {timeRange && (
                      <div className="text-lg font-medium text-gray-500">
                          {timeRange}
                      </div>
                  )}
              </div>
          </div>
          
          <div className="mt-8 text-xs text-gray-400 font-medium uppercase tracking-widest">
              Facilities Management • RoomSync
          </div>

       </div>
    </div>
  );
});

PrintableBlockSign.displayName = 'PrintableBlockSign';