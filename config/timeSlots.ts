import { TimeSlot } from '../types';

export const TIME_SLOTS: TimeSlot[] = [
  { id: 'morning',   label: 'Morning',              start: '08:00', end: '12:00' },
  { id: 'afternoon', label: 'Afternoon',             start: '13:00', end: '17:00' },
  { id: 'evening',   label: 'Evening',               start: '18:00', end: '22:00' },
  { id: 'full-day',  label: 'Full Day',              start: '08:00', end: '22:00' },
  { id: 'am-pm',     label: 'Morning + Afternoon',   start: '08:00', end: '17:00' },
];

/**
 * Convert a date string ("YYYY-MM-DD") and time string ("HH:mm")
 * to an epoch timestamp in milliseconds.
 */
export const toTimestamp = (dateStr: string, timeStr: string): number => {
  return new Date(`${dateStr}T${timeStr}:00`).getTime();
};

/**
 * Check if a time slot overlaps with any existing bookings.
 */
export const isSlotTaken = (
  slot: TimeSlot,
  dateStr: string,
  existingBookings: Array<{ startTimestamp: number; endTimestamp: number }>
): boolean => {
  const slotStart = toTimestamp(dateStr, slot.start);
  const slotEnd = toTimestamp(dateStr, slot.end);

  return existingBookings.some(
    (b) => slotStart < b.endTimestamp && slotEnd > b.startTimestamp
  );
};
