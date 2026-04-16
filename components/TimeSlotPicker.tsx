import React from 'react';
import { Clock, Ban } from 'lucide-react';
import { TimeSlot } from '../types';
import { TIME_SLOTS, isSlotTaken } from '../config/timeSlots';

interface TimeSlotPickerProps {
  date: string; // "YYYY-MM-DD"
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  existingBookings: Array<{ startTimestamp: number; endTimestamp: number }>;
  disabled?: boolean;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  date,
  selectedSlot,
  onSelectSlot,
  existingBookings,
  disabled = false,
}) => {
  if (!date) {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">
        Select a date first to see available time slots.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {TIME_SLOTS.map((slot) => {
        const taken = isSlotTaken(slot, date, existingBookings);
        const isSelected = selectedSlot?.id === slot.id;

        return (
          <button
            key={slot.id}
            type="button"
            disabled={taken || disabled}
            onClick={() => onSelectSlot(slot)}
            className={`
              relative flex flex-col items-center gap-1.5 px-4 py-4 rounded-xl border-2 text-sm font-medium transition-all
              min-h-[72px] focus:outline-none focus:ring-2 focus:ring-brand-maroon/50
              ${taken
                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : isSelected
                ? 'border-brand-maroon bg-brand-maroon/5 dark:bg-brand-maroon/10 text-brand-maroon dark:text-red-300 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-brand-maroon/50 hover:bg-brand-maroon/5 cursor-pointer'
              }
            `}
          >
            {taken ? (
              <Ban className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            ) : (
              <Clock className={`w-4 h-4 ${isSelected ? 'text-brand-maroon dark:text-red-400' : 'text-gray-400'}`} />
            )}
            <span className="font-semibold">{slot.label}</span>
            <span className={`text-xs ${taken ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
              {slot.start} - {slot.end}
            </span>
            {taken && (
              <span className="text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-wider">
                Booked
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TimeSlotPicker;
