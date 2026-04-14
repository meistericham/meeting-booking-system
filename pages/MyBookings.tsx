import React, { useEffect, useState } from 'react';
import { useAuth } from '../services/authContext';
import { cancelBooking, fetchBookings } from '../services/dataService';
import { Booking, BookingStatus } from '../types';
import { Calendar, Clock, MapPin, AlertCircle, Trash2, Search, X } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/ui/Button';
import { formatDateStandard } from '../utils';

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  
  // Cancellation UI State
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelOtherText, setCancelOtherText] = useState<string>('');
  const [cancelError, setCancelError] = useState<string>('');

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const allBookings = await fetchBookings();
    
    // Filter by User ID
    const userBookings = allBookings
      .filter(b => b.userId === user.uid)
      // Hide auto-combined child records (Santubong/Niah) from user view.
      // Parent Rajang booking will display combinedRoomNames instead.
      .filter(b => (b as any).isCombinedChild !== true)
      .sort((a, b) => b.startTime - a.startTime); // Newest first
      
    setBookings(userBookings);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const openCancelModal = (booking: Booking) => {
    setCancelError('');
    setCancelReason('');
    setCancelOtherText('');
    setCancelTarget(booking);
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async () => {
    if (!user || !cancelTarget) return;

    setCancelError('');

    const reason = (cancelReason || '').trim();
    if (!reason) {
      setCancelError('Please select a cancellation reason.');
      return;
    }

    if (reason === 'Other Reason: Please specify') {
      if (!cancelOtherText.trim()) {
        setCancelError('Please specify your cancellation reason.');
        return;
      }
    }

    await cancelBooking({
      bookingId: cancelTarget.id,
      cancelledBy: user.uid,
      cancelledByRole: 'USER',
      cancelReasonCode: reason,
      cancelReasonNote: reason === 'Other Reason: Please specify' ? cancelOtherText.trim() : ''
    });

    setIsCancelModalOpen(false);
    setCancelTarget(null);
    loadData();
  };

  const handleCancelClick = async (booking: Booking) => {
    // Only allow cancel for Pending/Approved, not past bookings.
    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.APPROVED) return;
    openCancelModal(booking);
  };

  // Filter Logic for Display
  const now = Date.now();
  const displayedBookings = bookings.filter(b => {
      if (filter === 'upcoming') return b.endTime > now;
      if (filter === 'past') return b.endTime <= now;
      return true;
  });
  const isCompactView = filter !== 'upcoming';

  const cancelReasonOptions = [
    'Already Book',
    'Postponed with other date',
    'Meeting Cancel',
    'Other Reason: Please specify'
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">Loading your history...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
            <p className="text-gray-500 dark:text-gray-400">Track status and manage your reservation history.</p>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button 
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === 'upcoming' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
                Upcoming
            </button>
            <button 
                onClick={() => setFilter('past')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === 'past' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
                Past
            </button>
            <button 
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
                All
            </button>
        </div>
      </header>

      {displayedBookings.length === 0 ? (
         <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No bookings found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">You haven't made any booking requests in this category.</p>
         </div>
      ) : isCompactView ? (
        <>
          <div className="space-y-2 sm:hidden">
            {displayedBookings.map(bk => {
              const start = new Date(bk.startTime);
              const end = new Date(bk.endTime);
              return (
                <div
                  key={bk.id}
                  className="rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setSelectedBooking(bk)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-gray-900 dark:text-white font-medium">{bk.roomName}</span>
                    {Array.isArray((bk as any).combinedRoomNames) && (bk as any).combinedRoomNames.length > 1 && (() => {
                      const extras = (bk as any).combinedRoomNames
                        .map((n: any) => String(n))
                        .filter((n: string) => !n.toLowerCase().includes('rajang'));
                      if (extras.length === 0) return null;
                      return (
                        <div className="mt-1">
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            Auto-reserved: {extras.join(', ')}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {extras.map((name: string) => (
                              <span
                                key={name}
                                className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/40"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                      <span className="text-gray-500 dark:text-gray-400">
                        {formatDateStandard(start)} · {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <StatusBadge status={bk.status} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden sm:block overflow-x-auto rounded-lg shadow border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
                  <th className="pb-2 font-medium whitespace-nowrap">Date</th>
                  <th className="pb-2 font-medium whitespace-nowrap">Time</th>
                  <th className="pb-2 font-medium whitespace-nowrap">Room</th>
                  <th className="pb-2 font-medium whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {displayedBookings.map(bk => {
                  const start = new Date(bk.startTime);
                  const end = new Date(bk.endTime);
                  return (
                    <tr
                      key={bk.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => setSelectedBooking(bk)}
                    >
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDateStandard(start)}</td>
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{bk.roomName}</span>
                          {Array.isArray((bk as any).combinedRoomNames) && (bk as any).combinedRoomNames.length > 1 && (() => {
                            const extras = (bk as any).combinedRoomNames
                              .map((n: any) => String(n))
                              .filter((n: string) => !n.toLowerCase().includes('rajang'));
                            if (extras.length === 0) return null;
                            return (
                              <div className="mt-1">
                                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                  Auto-reserved: {extras.join(', ')}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {extras.map((name: string) => (
                                    <span
                                      key={name}
                                      className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/40"
                                    >
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-3">
                        <StatusBadge status={bk.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedBookings.map(bk => {
            const isApproved = bk.status === BookingStatus.APPROVED;
            const isPast = bk.endTime < now;
            const start = new Date(bk.startTime);
            const end = new Date(bk.endTime);

            const isConfirming = confirmingId === bk.id;

            return (
              <Card key={bk.id} className="flex flex-col h-full hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-lg">
                    <MapPin className="w-5 h-5 text-indigo-500" />
                    {bk.roomName}
                  </div>
                  <StatusBadge status={bk.status} />
                </div>

                <div className="space-y-3 flex-grow">
                  {/* Date & Time */}
                  <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 mt-0.5 text-gray-400" />
                    <div>
                      <p className="font-medium">{formatDateStandard(start)}</p>
                      <p className="text-gray-500 text-xs">
                        {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>

                  {/* Meeting Title */}
                  <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <AlertCircle className="w-4 h-4 mt-0.5 text-gray-400" />
                    <div className="flex flex-col">
                      <p className="line-clamp-2" title={bk.purpose}>{bk.purpose}</p>
                      {Array.isArray((bk as any).combinedRoomNames) && (bk as any).combinedRoomNames.length > 1 && (() => {
                        const extras = (bk as any).combinedRoomNames
                          .map((n: any) => String(n))
                          .filter((n: string) => !n.toLowerCase().includes('rajang'));
                        if (extras.length === 0) return null;
                        return (
                          <div className="mt-1">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Auto-reserved: {extras.join(', ')}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {extras.map((name: string) => (
                                <span
                                  key={name}
                                  className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-200 px-2 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/40"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Equipment / Extra Info */}
                  {bk.requestedEquipment && bk.requestedEquipment.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1">
                      {bk.requestedEquipment.slice(0, 3).map((eq, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-full">
                          {eq}
                        </span>
                      ))}
                      {bk.requestedEquipment.length > 3 && (
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-full">
                          +{bk.requestedEquipment.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedBooking(bk)}
                    className="w-full text-sm py-1.5"
                  >
                    View Details
                  </Button>
                  {isPast ? (
                    <div className="text-xs text-gray-400 flex items-center gap-1 font-medium bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg w-full justify-center">
                      Completed
                    </div>
                  ) : (
                    <Button 
                      variant="danger" 
                      onClick={() => handleCancelClick(bk)}
                      className="w-full text-sm py-1.5"
                      icon={<Trash2 className="w-3 h-3" />}
                      disabled={bk.status !== BookingStatus.PENDING && bk.status !== BookingStatus.APPROVED}
                    >
                      Cancel Booking
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancelTarget(null);
        }}
        title="Cancel Booking"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please select a reason for cancelling this booking.
          </p>

          {cancelError && (
            <div className="rounded-lg border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
              {cancelError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Select reason</option>
              {cancelReasonOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {cancelReason === 'Other Reason: Please specify' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Please specify</label>
              <textarea
                rows={3}
                value={cancelOtherText}
                onChange={(e) => setCancelOtherText(e.target.value)}
                className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
                placeholder="Type your reason..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setIsCancelModalOpen(false);
                setCancelTarget(null);
              }}
            >
              Back
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleCancelSubmit}
            >
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Booking Details"
      >
        {selectedBooking && (() => {
          const start = new Date(selectedBooking.startTime);
          const end = new Date(selectedBooking.endTime);
          const rejectionReasonCode = (selectedBooking as any).rejectionReasonCode as string | undefined;
          const rejectionReasonNote = (selectedBooking as any).rejectionReasonNote as string | undefined;
          return (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBooking.roomName}</h3>
                  {Array.isArray((selectedBooking as any).combinedRoomNames) && (selectedBooking as any).combinedRoomNames.length > 1 && (() => {
                    const extras = (selectedBooking as any).combinedRoomNames
                      .map((n: any) => String(n))
                      .filter((n: string) => !n.toLowerCase().includes('rajang'));
                    if (extras.length === 0) return null;
                    return (
                      <div className="mt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Auto-reserved: {extras.join(', ')}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {extras.map((name: string) => (
                            <span
                              key={name}
                              className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-200 px-2 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/40"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateStandard(start)} · {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                <StatusBadge status={selectedBooking.status} />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Meeting Title</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{selectedBooking.purpose}</p>
              </div>

              {selectedBooking.requestedEquipment && selectedBooking.requestedEquipment.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Equipment</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedBooking.requestedEquipment.map((eq, i) => (
                      <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedBooking.status === BookingStatus.REJECTED && (
                <div className="rounded-lg border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-3">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">Rejection Reason</p>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-200">
                    {rejectionReasonCode || 'No reason provided.'}
                    {rejectionReasonNote ? ` — ${rejectionReasonNote}` : ''}
                  </p>
                </div>
              )}

              {selectedBooking.status === BookingStatus.CANCELLED && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Cancellation Reason</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {(selectedBooking as any).cancelReasonCode || 'No reason provided.'}
                    {(selectedBooking as any).cancelReasonNote ? ` — ${(selectedBooking as any).cancelReasonNote}` : ''}
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default MyBookings;
