import React from 'react';
import { Booking, BookingStatus } from '../types';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface PrintableMeetingReportProps {
  bookings: Booking[];
  generatedBy?: string;
}

export const PrintableMeetingReport = React.forwardRef<HTMLDivElement, PrintableMeetingReportProps>((props, ref) => {
  const { bookings, generatedBy } = props;

  // Format helpers
  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDateTime = () => new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Status visualizer for print (text based since colors might not print well without settings)
  const getStatusLabel = (status: BookingStatus) => {
    switch (status) {
        case BookingStatus.APPROVED: return 'APPROVED';
        case BookingStatus.PENDING: return 'PENDING';
        case BookingStatus.REJECTED: return 'REJECTED';
        case BookingStatus.BLOCKED: return 'BLOCKED';
        default: return status;
    }
  };

  return (
    <div ref={ref} className="w-full bg-white text-black p-8 font-sans text-xs box-border">
      
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider mb-1">Master Meeting Schedule</h1>
            <p className="text-gray-500 uppercase tracking-widest text-[10px]">RoomSync Facility Management</p>
        </div>
        <div className="text-right">
            <p className="font-bold">Generated Report</p>
            <p className="text-gray-500">{formatDateTime()}</p>
        </div>
      </div>

      {/* Summary Box */}
      <div className="mb-6 flex gap-8 text-sm border border-gray-200 p-3 rounded bg-gray-50">
          <div>
              <span className="font-bold text-gray-500 uppercase text-[10px] block">Total Records</span>
              <span className="font-bold">{bookings.length}</span>
          </div>
          <div>
              <span className="font-bold text-gray-500 uppercase text-[10px] block">Filter Context</span>
              <span>Current View Selection</span>
          </div>
          {generatedBy && (
            <div>
                <span className="font-bold text-gray-500 uppercase text-[10px] block">Administrator</span>
                <span>{generatedBy}</span>
            </div>
          )}
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-left">
        <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300 text-[10px] uppercase tracking-wider">
                <th className="p-2 font-bold w-24">Date</th>
                <th className="p-2 font-bold w-28">Time</th>
                <th className="p-2 font-bold w-32">Room</th>
                <th className="p-2 font-bold w-32">Unit / Dept</th>
                <th className="p-2 font-bold">Meeting Title</th>
                <th className="p-2 font-bold w-20">Pax</th>
                <th className="p-2 font-bold w-24">Status</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
            {bookings.length === 0 ? (
                <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 italic text-sm">
                        No bookings found matching current filters.
                    </td>
                </tr>
            ) : (
                bookings.map((bk, index) => (
                    <tr key={bk.id} className={`break-inside-avoid ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="p-2 align-top font-medium">
                            {formatDate(bk.startTime)}
                        </td>
                        <td className="p-2 align-top whitespace-nowrap">
                            {formatTime(bk.startTime)} - {formatTime(bk.endTime)}
                        </td>
                        <td className="p-2 align-top font-semibold">
                            {bk.roomName}
                        </td>
                        <td className="p-2 align-top text-gray-600">
                            {bk.unit || '-'}
                        </td>
                        <td className="p-2 align-top">
                            {bk.purpose}
                            {bk.bookingCategory === 'special' && <span className="ml-1 font-bold text-[9px] border border-black px-1 rounded">OFFICIAL</span>}
                        </td>
                        <td className="p-2 align-top text-center">
                            {bk.pax || '-'}
                        </td>
                        <td className="p-2 align-top font-bold text-[9px]">
                            {getStatusLabel(bk.status)}
                        </td>
                    </tr>
                ))
            )}
        </tbody>
      </table>

      {/* Footer */}
      <div className="fixed bottom-8 left-8 right-8 border-t border-gray-300 pt-2 flex justify-between text-[10px] text-gray-400">
        <span>Internal Use Only</span>
        <span>Page 1 of 1</span> 
      </div>
    </div>
  );
});

PrintableMeetingReport.displayName = 'PrintableMeetingReport';
