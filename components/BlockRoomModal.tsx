import React, { useState, useRef, useEffect } from 'react';
// FIX: Guna Custom Hook kita, buang 'react-to-print'
import { usePrint } from '../usePrint'; 

import { Room, Booking } from '../types';
import { createMaintenanceBlock } from '../services/dataService';
import { logger } from '../utils/logger';
import { AlertTriangle, Hammer, Calendar, Clock, Trash2, Printer } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { PrintableBlockSign } from './PrintableBlockSign';

interface BlockRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rooms: Room[];
  currentBlocks?: Booking[];
  onUnblock?: (id: string) => void;
  onPrint?: (id: string) => void;
}

const BlockRoomModal: React.FC<BlockRoomModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  rooms,
  currentBlocks = [],
  onUnblock
}) => {
  const [roomId, setRoomId] = useState('');
  
  // Date & Time State
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Print State
  const [printBooking, setPrintBooking] = useState<Booking | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // --- FIX PRINTING LOGIC ---
  // Kita guna usePrint hook yang baru.
  const handlePrintSignage = usePrint({
    content: () => printRef.current,
    documentTitle: printBooking ? `Maintenance-${printBooking.roomName}` : 'Maintenance-Sign'
  });

  // Trigger print bila user tekan button (setPrintBooking berlaku)
  useEffect(() => {
    if (printBooking && printRef.current) {
        // Panggil fungsi print
        handlePrintSignage();
        
        // Optional: Reset state lepas print dialog keluar (bg masa sikit)
        const timer = setTimeout(() => {
            setPrintBooking(null);
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [printBooking, handlePrintSignage]);

  // Auto-sync End Date with Start Date for convenience
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    // If end date is empty or before new start date, sync it
    if (!endDate || new Date(endDate) < new Date(newStart)) {
        setEndDate(newStart);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!roomId || !startDate || !endDate || !reason) {
        throw new Error("Please fill in all required fields.");
      }

      let startDateTime: number;
      let endDateTime: number;

      if (isAllDay) {
        // Start of Start Date (00:00:00)
        startDateTime = new Date(`${startDate}T00:00:00`).getTime();
        // End of End Date (23:59:59)
        endDateTime = new Date(`${endDate}T23:59:59.999`).getTime();
      } else {
        if (!startTime || !endTime) throw new Error("Time is required for partial day blocks.");
        startDateTime = new Date(`${startDate}T${startTime}`).getTime();
        endDateTime = new Date(`${endDate}T${endTime}`).getTime();
      }

      if (endDateTime <= startDateTime) {
        throw new Error("End time must be after start time.");
      }

      const room = rooms.find(r => r.id === roomId);
      if (!room) throw new Error("Invalid room selected");

      await createMaintenanceBlock(
        room.id,
        room.name,
        startDateTime,
        endDateTime,
        reason
      );

      // Reset form
      setReason('');
      setStartDate('');
      setEndDate('');
      setIsAllDay(false);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      logger.error(err);
      // Fallback kalau function signature salah, cuba hantar object (Safe coding)
      if (err.message && err.message.includes("argument")) {
          try {
             const room = rooms.find(r => r.id === roomId);
             await createMaintenanceBlock(
                roomId,
                room?.name || 'Unknown Room',
                new Date(`${startDate}T${startTime}`).getTime(),
                new Date(`${endDate}T${endTime}`).getTime(),
                reason
             );
             onSuccess();
             onClose();
             return;
          } catch (retryErr) {
             setError("Failed to create block. Please check inputs.");
          }
      }
      setError(err.message || "Failed to block room");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBlockTime = (start: number, end: number) => {
    const sDate = new Date(start);
    const eDate = new Date(end);
    
    const isSameDay = sDate.toDateString() === eDate.toDateString();
    const isFullDay = sDate.getHours() === 0 && eDate.getHours() === 23;

    if (isSameDay) {
        const dateStr = sDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        if (isFullDay) return `${dateStr} (All Day)`;
        return `${dateStr} (${sDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${eDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})`;
    } else {
        return `${sDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - ${eDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
    }
  };

  // Sort blocks: Newest created first, or nearest date? Let's do nearest date descending
  const sortedBlocks = [...currentBlocks].sort((a, b) => b.startTime - a.startTime);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Block Room / Maintenance">
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Info Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg flex items-start gap-3 border border-amber-100 dark:border-amber-800/50">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold">Maintenance Mode</p>
                <p className="mt-1 opacity-90 leading-relaxed">
                  This creates a 'Blocked' status. Users cannot book the room during this period.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-lg border border-red-100 dark:border-red-800/50">
                {error}
              </div>
            )}

            {/* Room Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room to Block</label>
              <select 
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none transition-shadow"
                required
              >
                <option value="">Select a Room</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center gap-2 py-1">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={isAllDay} 
                        onChange={(e) => setIsAllDay(e.target.checked)}
                        className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-400 dark:peer-focus:ring-yellow-600 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">All Day Event</span>
                </label>
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                {/* Start Section */}
                <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400">From</label>
                    <div>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="date"
                                value={startDate}
                                onChange={handleStartDateChange}
                                className="w-full pl-9 border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400"
                                required
                            />
                        </div>
                    </div>
                    {!isAllDay && (
                        <div className="relative">
                            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full pl-9 border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400"
                                required={!isAllDay}
                            />
                        </div>
                    )}
                </div>

                {/* End Section */}
                <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400">To</label>
                    <div>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-9 border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400"
                                required
                            />
                        </div>
                    </div>
                    {!isAllDay && (
                        <div className="relative">
                            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full pl-9 border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400"
                                required={!isAllDay}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Reason Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Block</label>
              <input 
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Aircond Repair, Painting, etc."
                className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
                required
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button 
                type="submit" 
                isLoading={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white border-transparent focus:ring-yellow-400 shadow-sm"
                icon={<Hammer className="w-4 h-4" />}
              >
                Block Room
              </Button>
            </div>
          </form>

          {/* Current Blocks List */}
          {sortedBlocks.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Currently Blocked Rooms
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sortedBlocks.map(block => (
                  <div key={block.id} className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{block.roomName}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                        {formatBlockTime(block.startTime, block.endTime)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic truncate">
                        Reason: {block.purpose}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-3">
                        {/* PRINT BUTTON - explicitly rendered */}
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                setPrintBooking(block);
                            }}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Print Maintenance Sign"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => onUnblock?.(block.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove Block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Hidden Print Component - Wajib ada untuk print berfungsi */}
      <div style={{ display: 'none' }}>
        {printBooking && (
          <PrintableBlockSign 
            ref={printRef}
            booking={printBooking} 
          />
        )}
      </div>
    </>
  );
};

export default BlockRoomModal;
