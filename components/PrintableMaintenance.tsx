import React from 'react';
import { Booking } from '../types';
import { TriangleAlert, Wrench, Calendar, Clock } from 'lucide-react';

interface PrintableMaintenanceProps {
  booking: Booking;
}

export const PrintableMaintenance = React.forwardRef<HTMLDivElement, PrintableMaintenanceProps>((props, ref) => {
  const { booking } = props;
  
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  
  const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div ref={ref} className="w-full h-screen bg-white text-black p-8 font-sans box-border flex flex-col items-center justify-between border-[20px] border-yellow-400">
      
      {/* HEADER - INDUSTRIAL STYLE */}
      <div className="w-full bg-black text-yellow-400 p-6 text-center">
        <h1 className="text-8xl font-black uppercase tracking-widest flex items-center justify-center gap-6">
           <TriangleAlert className="w-24 h-24" />
           NOTICE
           <TriangleAlert className="w-24 h-24" />
        </h1>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center w-full text-center space-y-10 py-10">
        
        {/* MAIN STATUS */}
        <div className="space-y-4">
            <h2 className="text-6xl font-extrabold uppercase tracking-tight text-gray-900">
                UNDER MAINTENANCE
            </h2>
            <div className="w-32 h-2 bg-black mx-auto"></div>
        </div>

        {/* ROOM NAME */}
        <div className="bg-gray-100 px-12 py-6 rounded-2xl border-4 border-black border-dashed">
            <h3 className="text-7xl font-bold text-black uppercase">
                {booking.roomName}
            </h3>
        </div>

        {/* ICON & REASON */}
        <div className="flex flex-col items-center gap-4">
             <Wrench className="w-20 h-20 text-gray-800" />
             <p className="text-4xl font-bold text-gray-800 max-w-4xl leading-tight">
                {booking.purpose}
             </p>
        </div>

        {/* DURATION */}
        <div className="grid grid-cols-2 gap-12 w-full max-w-4xl mt-8">
            <div className="bg-yellow-50 border-l-8 border-yellow-400 p-4 text-left">
                <span className="flex items-center gap-2 text-xl font-bold uppercase text-gray-500 mb-1">
                    <Calendar className="w-6 h-6" /> Start
                </span>
                <div className="text-3xl font-bold">
                    {formatDate(startDate)}
                </div>
                {!isSameDay && (
                     <div className="text-xl font-semibold text-gray-600 mt-1">
                        {formatTime(startDate)}
                    </div>
                )}
            </div>
            
            <div className="bg-yellow-50 border-l-8 border-yellow-400 p-4 text-left">
                <span className="flex items-center gap-2 text-xl font-bold uppercase text-gray-500 mb-1">
                    <Clock className="w-6 h-6" /> End
                </span>
                <div className="text-3xl font-bold">
                    {formatDate(endDate)}
                </div>
                {!isSameDay && (
                     <div className="text-xl font-semibold text-gray-600 mt-1">
                        {formatTime(endDate)}
                    </div>
                )}
            </div>
        </div>
        
        {isSameDay && (
             <div className="text-2xl font-semibold text-gray-600">
                Time: {formatTime(startDate)} - {formatTime(endDate)}
             </div>
        )}

      </div>

      {/* FOOTER */}
      <div className="w-full border-t-4 border-black pt-6 flex justify-between items-end">
         <div className="text-left">
            <p className="text-xl font-bold text-gray-800 uppercase">Facilities Management Dept.</p>
            <p className="text-sm text-gray-500">Contact Admin for access inquiries.</p>
         </div>
         <div className="text-right">
             <p className="text-lg font-mono text-gray-400">Ref: {booking.id}</p>
         </div>
      </div>

    </div>
  );
});

PrintableMaintenance.displayName = 'PrintableMaintenance';