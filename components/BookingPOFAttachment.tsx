import React from 'react';
import { Booking } from '../types';

interface BookingPOFAttachmentProps {
  booking: Booking;
}

export const BookingPOFAttachment = React.forwardRef<HTMLDivElement, BookingPOFAttachmentProps>(({ booking }, ref) => {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  const dateStr = start.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  const requester = booking.userName?.trim() || booking.userEmail || '-';
  const equipment = booking.requestedEquipment?.length ? booking.requestedEquipment.join(', ') : '-';

  return (
    <div ref={ref} className="w-full bg-white text-black p-8 font-sans text-sm leading-relaxed">
      <div className="max-w-[900px] mx-auto border border-black p-6">
        <div className="text-center border-b border-black pb-3 mb-4">
          <h1 className="text-xl font-bold uppercase">Catering Attachment</h1>
          <p className="text-xs">e-RUAI Meeting Details (For Supporting Document)</p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
          <p><span className="font-semibold">Meeting Title:</span> {booking.purpose || '-'}</p>
          <p><span className="font-semibold">Room/Venue:</span> {booking.roomName || '-'}</p>
          <p><span className="font-semibold">Date:</span> {dateStr}</p>
          <p><span className="font-semibold">Time:</span> {timeStr}</p>
          <p><span className="font-semibold">Unit/Department:</span> {booking.unit || '-'}</p>
          <p><span className="font-semibold">No. of Pax:</span> {booking.pax || '-'}</p>
          <p><span className="font-semibold">Requested By:</span> {requester}</p>
          <p><span className="font-semibold">Email:</span> {booking.userEmail || '-'}</p>
          <p><span className="font-semibold">Refreshment/Catering:</span> {booking.refreshment || '-'}</p>
          <p><span className="font-semibold">Equipment:</span> {equipment}</p>
        </div>

        <div className="mb-4">
          <p className="font-semibold">Special Request / Notes:</p>
          <div className="min-h-[64px] border border-black p-2 mt-1">{booking.specialRequest || '-'}</div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8 text-xs">
          <div>
            <p className="mb-8 border-b border-black">&nbsp;</p>
            <p className="font-semibold">Requested by</p>
          </div>
          <div>
            <p className="mb-8 border-b border-black">&nbsp;</p>
            <p className="font-semibold">Admin verified</p>
          </div>
          <div>
            <p className="mb-8 border-b border-black">&nbsp;</p>
            <p className="font-semibold">Finance processing</p>
          </div>
        </div>

        <p className="text-[10px] text-gray-600 mt-6 text-right">Generated on: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
});

BookingPOFAttachment.displayName = 'BookingPOFAttachment';
