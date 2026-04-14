import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Room, Booking, BookingStatus, Unit, User, UserRole } from '../types';
import { createBooking, addNotification } from '../services/dataService';
import { Coffee, Box, Building, AlertTriangle, Star, CalendarDays } from 'lucide-react';
import Button from './ui/Button';
import { logger } from '../utils/logger';

interface BookingFormProps {
  user: User;
  room: Room;
  units: Unit[];
  existingBookings: Booking[]; // Passed for client-side validation
  initialDate: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const EQUIPMENT_OPTIONS = ['DLP Projector', 'Laptop', 'Zoom Meeting', 'Video Conference System'];

const TIME_OPTIONS_30M = (() => {
  const out: string[] = [];
  const pad = (n: number) => String(n).padStart(2, '0');
  // 08:00 - 19:00 (end time can go up to 19:00)
  for (let h = 8; h <= 19; h++) {
    for (const m of [0, 30]) {
      if (h === 19 && m === 30) continue;
      out.push(`${pad(h)}:${pad(m)}`);
    }
  }
  return out;
})();

const toMinutes = (hhmm: string) => {
  const [hh, mm] = hhmm.split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
};

const DATE_MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

const pad2 = (n: number) => String(n).padStart(2, '0');

const parseYMD = (ymd: string) => {
  const [y, m, d] = (ymd || '').split('-').map(Number);
  return {
    y: y || new Date().getFullYear(),
    m: m || (new Date().getMonth() + 1),
    d: d || new Date().getDate(),
  };
};

const buildYMD = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

const addMinutes = (hhmm: string, delta: number) => {
  const total = toMinutes(hhmm) + delta;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}`;
};

// --- TASK 1: Time Conflict Guard Utility ---
const checkAvailability = (
    roomId: string, 
    startDateStr: string,
    endDateStr: string,
    startTimeStr: string, 
    endTimeStr: string, 
    existingBookings: Booking[]
): boolean => {
    // Convert to Timestamps
    const [y1, m1, d1] = startDateStr.split('-').map(Number);
    const startTs = new Date(y1, m1 - 1, d1, ...startTimeStr.split(':').map(Number)).getTime();

    const [y2, m2, d2] = endDateStr.split('-').map(Number);
    const endTs = new Date(y2, m2 - 1, d2, ...endTimeStr.split(':').map(Number)).getTime();

    // Logic: Return false if overlaps with Approved OR Pending
    const hasConflict = existingBookings.some(b => {
        if (b.roomId !== roomId) return false;
        if (b.status === BookingStatus.REJECTED || b.status === BookingStatus.CANCELLED) return false; // Ignore rejected/cancelled
        
        // Overlap Formula: (StartA < EndB) and (EndA > StartB)
        return (startTs < b.endTime && endTs > b.startTime);
    });

    return !hasConflict; // Return true if available
};

const BookingForm: React.FC<BookingFormProps> = ({ user, room, units, existingBookings, initialDate, onSuccess, onCancel }) => {
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const bookingWebhookUrl =
    import.meta.env.VITE_N8N_BOOKING_WEBHOOK_URL || 'https://n8n.meistericham.com/webhook/new-booking';

  // Form State
  const [category, setCategory] = useState<'standard' | 'special'>('standard');
  
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate); // New state for multi-day
  
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const [unit, setUnit] = useState('');
  const [pax, setPax] = useState<number | ''>('');
  const [refreshment, setRefreshment] = useState('No Refreshment');
  const [equipmentReq, setEquipmentReq] = useState<string[]>([]);
  const [purpose, setPurpose] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  
  // UI State
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Validation State
  const [validationErrors, setValidationErrors] = useState<{
    date?: string;
    time?: string;
    conflict?: string;
    refreshment?: string;
    capacity?: string;
  }>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  // --- Rajang auto-combine capacities (Meeting Rooms only) ---
  const RAJANG_CAPACITY = 30;
  const SANTUBONG_CAPACITY = 20;
  const NIAH_CAPACITY = 25;

  const isRoomLike = (name: string, needle: string) =>
    (name || '').toLowerCase().includes((needle || '').toLowerCase());

  const getAutoReservedRoomShortNames = (roomName: string, p: number) => {
    // Short, DB-friendly names: Rajang / Santubong / Niah
    const paxNum = Number(p);
    if (!Number.isFinite(paxNum) || paxNum <= 0) return [roomName];

    // Rajang rules
    if (isRoomLike(roomName, 'rajang')) {
      if (paxNum <= RAJANG_CAPACITY) return ['Rajang'];
      if (paxNum <= 50) return ['Rajang', 'Santubong'];
      if (paxNum <= 100) return ['Rajang', 'Santubong', 'Niah'];
      return null; // > max allowed
    }

    // Santubong + Niah combo rules
    if (isRoomLike(roomName, 'santubong')) {
      if (paxNum <= SANTUBONG_CAPACITY) return ['Santubong'];
      if (paxNum <= 50) return ['Santubong', 'Niah'];
      return null;
    }

    if (isRoomLike(roomName, 'niah')) {
      if (paxNum <= NIAH_CAPACITY) return ['Niah'];
      if (paxNum <= 50) return ['Niah', 'Santubong'];
      return null;
    }

    // Default: no auto-combine
    return [roomName];
  };

  const [roomNameToId, setRoomNameToId] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'rooms'));
        const map: Record<string, string> = {};
        snap.forEach(d => {
          const data = d.data() as any;
          if (data?.name) map[String(data.name)] = String(data.id || d.id);
        });
        setRoomNameToId(map);
      } catch (e) {
        logger.warn('Failed to load rooms for combine-room logic', e);
      }
    })();
  }, []);
  const getRoomIdByNameLike = (needle: string): string | undefined => {
    const n = (needle || '').trim().toLowerCase();
    if (!n) return undefined;
    for (const [name, id] of Object.entries(roomNameToId)) {
      if ((name || '').toLowerCase().includes(n)) return id;
    }
    return undefined;
  };



  // Initialize Unit
  useEffect(() => {
    if (units.length > 0 && !unit) {
      setUnit(units[0].name);
    }
  }, [units, unit]);

  // Sync End Date if standard mode
  useEffect(() => {
      if (category === 'standard') {
          setEndDate(startDate);
      }
  }, [startDate, category]);

  // Keep End Time always after Start Time (30 min steps)
  useEffect(() => {
    if (!startTime) return;

    // Suggest end time if not selected yet, or if it becomes invalid.
    const startMins = toMinutes(startTime);
    const endMins = endTime ? toMinutes(endTime) : 0;

    if (!endTime || endMins <= startMins) {
      const candidate = addMinutes(startTime, 30);
      if (TIME_OPTIONS_30M.includes(candidate)) {
        setEndTime(candidate);
      } else {
        setEndTime('');
      }
    }
  }, [startTime]);

  // Ensure date dropdown changes produce valid dates (clamp day when month/year changes)
  const setStartDateParts = (next: { y?: number; m?: number; d?: number }) => {
    const current = parseYMD(startDate);
    const y = next.y ?? current.y;
    const m = next.m ?? current.m;
    let d = next.d ?? current.d;

    const maxD = daysInMonth(y, m);
    if (d > maxD) d = maxD;
    if (d < 1) d = 1;

    setStartDate(buildYMD(y, m, d));
  };

  const setEndDateParts = (next: { y?: number; m?: number; d?: number }) => {
    const current = parseYMD(endDate);
    const y = next.y ?? current.y;
    const m = next.m ?? current.m;
    let d = next.d ?? current.d;

    const maxD = daysInMonth(y, m);
    if (d > maxD) d = maxD;
    if (d < 1) d = 1;

    setEndDate(buildYMD(y, m, d));
  };

  // --- TASK 1, 2, 3: Comprehensive Validation Effect ---
  useEffect(() => {
    const errors: { date?: string; time?: string; conflict?: string } = {};
    const newWarnings: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Date Logic
    let selectedStartDate: Date | null = null;
    let selectedEndDate: Date | null = null;

    if (startDate) {
        const [y, m, d] = startDate.split('-').map(Number);
        selectedStartDate = new Date(y, m - 1, d);
        if (selectedStartDate < today) {
            errors.date = "Start date cannot be in the past.";
        }
    }

    if (endDate && startDate) {
         const [y, m, d] = endDate.split('-').map(Number);
         selectedEndDate = new Date(y, m - 1, d);
         if (selectedEndDate && selectedStartDate && selectedEndDate < selectedStartDate) {
             errors.date = "End date must be after start date.";
         }
    }

    // 2. Time & Conflict Logic
    if (startDate && endDate && startTime && endTime) {
        const [y1, m1, d1] = startDate.split('-').map(Number);
        const startDt = new Date(y1, m1 - 1, d1, ...startTime.split(':').map(Number));
        
        const [y2, m2, d2] = endDate.split('-').map(Number);
        const endDt = new Date(y2, m2 - 1, d2, ...endTime.split(':').map(Number));
        
        const diffMs = endDt.getTime() - startDt.getTime();
        const diffMins = diffMs / (1000 * 60);

        // Basic Constraints
        if (endDt <= startDt) {
            errors.time = "End time must be after start time.";
        } else if (diffMins < 30) {
            errors.time = "Booking duration must be at least 30 minutes.";
        } else {
             // --- Conflict Guard (single or multi-room) ---
             let requiredRooms: { id: string; label: string }[] = [{ id: room.id, label: room.name }];

             const paxNum = pax === '' ? 0 : Number(pax);
             const isRajang = (room.name || '').toLowerCase().includes('rajang');
             const isSantubong = (room.name || '').toLowerCase().includes('santubong');
             const isNiah = (room.name || '').toLowerCase().includes('niah');

             if (isRajang || isSantubong || isNiah) {
               const requiredShortNames = getAutoReservedRoomShortNames(room.name, paxNum);

               if (!requiredShortNames) {
                 errors.capacity = isRajang ? 'Not available: max allowed is 100 pax.' : 'Not available: max allowed is 50 pax.';
               } else {
                 requiredRooms = requiredShortNames
                   .map(shortName => {
                     if (isRoomLike(room.name, shortName)) {
                       return { id: room.id, label: room.name };
                     }
                     const id = getRoomIdByNameLike(shortName);
                     return id ? { id, label: shortName } : null;
                   })
                   .filter(Boolean) as { id: string; label: string }[];

                 if (requiredRooms.length !== requiredShortNames.length) {
                   newWarnings.push('Loading combined room availability…');
                 }
               }
             }

             if (!errors.capacity) {
               const firstBlocked = requiredRooms.find(r =>
                 !checkAvailability(r.id, startDate, endDate, startTime, endTime, existingBookings)
               );

               if (firstBlocked) {
                 if (isRajang && paxNum > RAJANG_CAPACITY) {
                   errors.conflict = `${firstBlocked.label} is occupied. Please reduce pax to ${RAJANG_CAPACITY} or choose another slot.`;
                 } else {
                   errors.conflict = `Not available: ${firstBlocked.label} is already booked.`;
                 }
               }
             }
        }
    }

    // 3. Policy Validation (Based on SOP)
    // Refreshment policy:
    // - "Tea & Coffee only" can be requested anytime
    // - "Refreshment with Tea & Coffee" requires at least 5 working days notice (exclude Saturday/Sunday)
    if (selectedStartDate && refreshment !== 'No Refreshment') {
        const normalized = (refreshment || '').trim().toLowerCase();
        const isTeaCoffeeOnly = normalized === 'tea & coffee only';
        const isRefreshmentWithTeaCoffee = normalized === 'refreshment with tea & coffee';

        // Only enforce notice period for the full refreshment option
        if (isRefreshmentWithTeaCoffee && !isTeaCoffeeOnly) {
            const start = new Date(today);
            start.setHours(0, 0, 0, 0);

            const end = new Date(selectedStartDate);
            end.setHours(0, 0, 0, 0);

            const countWorkingDaysBetween = (from: Date, to: Date) => {
                // Counts working days from the day AFTER `from` up to and including `to`.
                // Excludes Sat (6) and Sun (0).
                let d = new Date(from);
                d.setDate(d.getDate() + 1);

                let count = 0;
                while (d <= to) {
                    const day = d.getDay();
                    const isWeekend = day === 0 || day === 6;
                    if (!isWeekend) count++;
                    d.setDate(d.getDate() + 1);
                }
                return count;
            };

            const workingDaysNotice = countWorkingDaysBetween(start, end);

            if (workingDaysNotice < 5) {
                errors.refreshment = 'Refreshment with Tea & Coffee requires at least 5 working days notice.';
                newWarnings.push('Policy: Refreshment with Tea & Coffee requires at least 5 working days notice.');
            }
        }
    }

    setValidationErrors(errors);
    setWarnings(newWarnings);

  }, [startDate, endDate, startTime, endTime, refreshment, room.id, room.name, pax, existingBookings, roomNameToId]);

  const toggleEquipment = (item: string) => {
    setEquipmentReq(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };


  const getRequiredRoomsForCurrentSelection = () => {
    const paxNum = pax === '' ? 0 : Number(pax);

    const requiredShortNames = getAutoReservedRoomShortNames(room.name, paxNum);
    if (!requiredShortNames) return null;

    const roomsWithIds: { id: string; label: string }[] = [];
    for (const shortName of requiredShortNames) {
      // The selected room is always the parent booking.
      if (isRoomLike(room.name, shortName)) {
        roomsWithIds.push({ id: room.id, label: room.name });
      } else {
        const id = getRoomIdByNameLike(shortName);
        if (!id) return null;
        roomsWithIds.push({ id, label: shortName });
      }
    }

    return roomsWithIds;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block if invalid
    if (Object.keys(validationErrors).length > 0) return;

    setError('');
    setIsSubmitting(true);

    const startDateTime = new Date(`${startDate}T${startTime}`).getTime();

    // Booking window policy: Standard users can only book within the next 90 days.
    if (user?.role === 'user') {
      const maxStart = Date.now() + 90 * 24 * 60 * 60 * 1000;
      if (startDateTime > maxStart) {
        setError('Booking is only allowed within 90 days from today. Please choose a nearer date or contact Admin.');
        return;
      }
    }
    const endDateTime = new Date(`${endDate}T${endTime}`).getTime();


    // Auto-combine (reserve required rooms together)
    const requiredRooms = getRequiredRoomsForCurrentSelection();
    const paxNum = pax === '' ? 0 : Number(pax);
    const isRajang = isRoomLike(room.name, 'rajang');
    const isSantubong = isRoomLike(room.name, 'santubong');
    const isNiah = isRoomLike(room.name, 'niah');

    if (isRajang || isSantubong || isNiah) {
      if (!requiredRooms) {
        const max = isRajang ? 100 : 50;
        setError(`Not available: max allowed is ${max} pax (or rooms mapping not ready).`);
        setIsSubmitting(false);
        return;
      }

      if (requiredRooms.length > 1) {
        const names = requiredRooms.map(r => r.label).join(' + ');
        let warning = '';

        if (isRajang && paxNum > (RAJANG_CAPACITY + SANTUBONG_CAPACITY + NIAH_CAPACITY)) {
          warning = `

WARNING: Pax exceeds combined capacity (${RAJANG_CAPACITY + SANTUBONG_CAPACITY + NIAH_CAPACITY}). Allowed up to 100 pax, subject to admin approval.`;
        }

        if ((isSantubong || isNiah) && paxNum > (SANTUBONG_CAPACITY + NIAH_CAPACITY)) {
          warning = `

WARNING: Pax exceeds combined capacity (${SANTUBONG_CAPACITY + NIAH_CAPACITY}). Allowed up to 50 pax, subject to admin approval.`;
        }

        const ok = window.confirm(
          `This booking will reserve: ${names}.${warning}

Continue?`
        );

        if (!ok) {
          setIsSubmitting(false);
          return;
        }
      }
    }

    const resolveDisplayName = async (): Promise<string> => {
      if (user.displayName && user.displayName.trim()) {
        return user.displayName;
      }

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', user.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as Partial<User>;
        if (data.displayName && data.displayName.trim()) {
          return data.displayName;
        }
      }

      const emailKey = user.email.trim().toLowerCase();
      if (emailKey) {
        const userDoc = await getDoc(doc(db, 'users', emailKey));
        if (userDoc.exists()) {
          const data = userDoc.data() as Partial<User>;
          if (data.displayName && data.displayName.trim()) {
            return data.displayName;
          }
        }
      }

      return user.email;
    };

    const sendBookingNotification = async (displayName: string) => {
      const startDateObj = new Date(`${startDate}T${startTime}`);
      const formattedDate = startDateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const response = await fetch(bookingWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_N8N_API_KEY
        },
        body: JSON.stringify({
          userName: displayName,
          userEmail: user.email,
          roomName: room.name,
          date: formattedDate,
          time: `${startTime} - ${endTime}`,
          purpose,
          specialRequest: specialRequest || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Booking webhook failed with status ${response.status}`);
      }
    };

    try {
      logger.debug('📋 Preparing booking for submission...');
      
      const bookingDisplayName = await resolveDisplayName();

      // 2. Create Booking Object (NO client-side ID - let Firestore generate it)
      const combinedRoomIds = requiredRooms && requiredRooms.length > 1 ? requiredRooms.map(r => r.id) : undefined;
      const combinedRoomNames = requiredRooms && requiredRooms.length > 1 ? requiredRooms.map(r => r.label) : undefined;

      const newBooking: Booking = {
        id: '', // Empty - will be filled by Firestore
        userId: user.uid,
        userEmail: user.email,
        userName: bookingDisplayName,
        roomId: room.id,
        roomName: room.name,
        startTime: startDateTime,
        endTime: endDateTime,
        purpose,
        status: BookingStatus.PENDING, // All bookings start as Pending
        type: 'meeting',
        createdAt: Date.now(),
        unit: unit,
        pax: pax === '' ? 0 : pax,
        refreshment,
        requestedEquipment: equipmentReq,
        specialRequest,
        bookingCategory: category,

        // Rajang auto-combine metadata (for admin master table to show multiple room checks)
        ...(combinedRoomIds ? ({ combinedRoomIds, combinedRoomNames } as any) : {}),
      };

      logger.debug('📤 Submitting booking to Firestore...');
      // 3. Save and get the generated ID
      const bookingId = await createBooking(newBooking as Omit<Booking, 'id'>);


      // If Rajang auto-combine requires additional rooms, create child bookings to block availability.
      if (requiredRooms && requiredRooms.length > 1) {
        const parentId = bookingId;
        for (const r of requiredRooms) {
          if (r.id === room.id) continue;
          const child: any = {
            ...newBooking,
            roomId: r.id,
            roomName: r.label,
            // Child bookings are BLOCKED to reserve the additional rooms and show as occupied in availability calendar.
            // Parent booking remains PENDING for admin approval.
            status: BookingStatus.BLOCKED,
            purpose: `AUTO-COMBINED - ${newBooking.purpose}`,
            combinedGroupId: parentId,
            isCombinedChild: true,
          };
          await createBooking(child);
        }
      }
      logger.debug('✅ Booking successfully saved with ID:', bookingId);

      try {
        await sendBookingNotification(bookingDisplayName);
      } catch (error) {
        logger.warn('Failed to send booking notification:', error);
      }

      // 4. Trigger Notification (Scenario A)
      if (!isAdmin) {
          logger.debug('📬 Sending notification to admins about new booking request...');
          await addNotification({
            recipientRole: UserRole.ADMIN,
            createdBy: user.uid,
            message: `New booking request from ${bookingDisplayName} for ${room.name}.`,
            type: 'warning' // Yellow for Pending
          });
          logger.debug('✅ Notification sent successfully');
      }

      logger.debug('✅ Booking process completed successfully');
      onSuccess();
    } catch (err: any) {
      logger.error('❌ Error during booking submission:', err);
      logger.error('❌ Error details:', { message: err.message, code: err.code });
      setError(err.message || "Failed to book");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = Object.keys(validationErrors).length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Admin Toggle for Special Occasions */}
      {isAdmin && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg flex items-center justify-between border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center gap-2">
                <Star className={`w-5 h-5 ${category === 'special' ? 'text-purple-600 fill-purple-600' : 'text-gray-400'}`} />
                <div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white block">Booking Category</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Special occasions allow multi-day bookings.</span>
                </div>
            </div>
            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={() => setCategory('standard')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${category === 'standard' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'text-gray-500'}`}
                >
                    Standard
                </button>
                <button
                    type="button"
                    onClick={() => setCategory('special')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${category === 'special' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'text-gray-500'}`}
                >
                    Special
                </button>
            </div>
        </div>
      )}

      {/* General Error Block */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-lg">
          {error}
        </div>
      )}
      
      {/* Policy Warnings (Amber) */}
      {warnings.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <ul className="list-disc list-inside">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
         {/* Start Date */}
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {category === 'special' ? 'Start Date' : 'Date'}
            </label>
            <div>
              {/* Desktop (calendar picker) */}
              <div className="hidden sm:block relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full h-12 pl-9 border bg-white text-gray-900 dark:bg-gray-800 dark:text-white rounded-lg px-3 text-sm focus:ring-2 focus:ring-yellow-400 ${validationErrors.date ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                />
              </div>

              {/* Mobile (dropdowns - iOS friendly) */}
              <div className="grid grid-cols-3 gap-2 sm:hidden">
                <select
                  value={parseYMD(startDate).d}
                  onChange={(e) => setStartDateParts({ d: Number(e.target.value) })}
                  className="w-full h-11 border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2 text-sm focus:ring-2 focus:ring-yellow-400 appearance-none"
                >
                  {Array.from({ length: daysInMonth(parseYMD(startDate).y, parseYMD(startDate).m) }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{pad2(d)}</option>
                  ))}
                </select>

                <select
                  value={parseYMD(startDate).m}
                  onChange={(e) => setStartDateParts({ m: Number(e.target.value) })}
                  className="w-full h-11 border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2 text-sm focus:ring-2 focus:ring-yellow-400 appearance-none"
                >
                  {DATE_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <select
                  value={parseYMD(startDate).y}
                  onChange={(e) => setStartDateParts({ y: Number(e.target.value) })}
                  className="w-full h-11 border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2 text-sm focus:ring-2 focus:ring-yellow-400 appearance-none"
                >
                  {(() => {
                    const y = new Date().getFullYear();
                    return [y, y + 1];
                  })().map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {validationErrors.date && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors.date}</p>
              )}
            </div>
        </div>

        {/* End Date (Visible for Special Only) */}
        {category === 'special' && (
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                {/* Desktop (calendar picker) */}
                <div className="hidden sm:block relative">
                  <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-12 pl-9 border bg-white text-gray-900 dark:bg-gray-800 dark:text-white rounded-lg px-3 text-sm focus:ring-2 focus:ring-yellow-400 border-purple-200 dark:border-purple-800"
                  />
                </div>

                {/* Mobile (dropdowns - iOS friendly) */}
                <div className="grid grid-cols-3 gap-2 sm:hidden">
                  <select
                    value={parseYMD(endDate).d}
                    onChange={(e) => setEndDateParts({ d: Number(e.target.value) })}
                    className="w-full h-11 border border-purple-200 dark:border-purple-800 bg-white text-gray-900 dark:bg-gray-800 dark:text-white rounded-lg px-2 text-sm focus:ring-2 focus:ring-yellow-400 appearance-none"
                  >
                    {Array.from({ length: daysInMonth(parseYMD(endDate).y, parseYMD(endDate).m) }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{pad2(d)}</option>
                    ))}
                  </select>

                  <select
                    value={parseYMD(endDate).m}
                    onChange={(e) => setEndDateParts({ m: Number(e.target.value) })}
                    className="w-full h-11 border border-purple-200 dark:border-purple-800 bg-white text-gray-900 dark:bg-gray-800 dark:text-white rounded-lg px-2 text-sm focus:ring-2 focus:ring-yellow-400 appearance-none"
                  >
                    {DATE_MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  <select
                    value={parseYMD(endDate).y}
                    onChange={(e) => setEndDateParts({ y: Number(e.target.value) })}
                    className="w-full h-11 border border-purple-200 dark:border-purple-800 bg-white text-gray-900 dark:bg-gray-800 dark:text-white rounded-lg px-2 text-sm focus:ring-2 focus:ring-yellow-400 appearance-none"
                  >
                    {(() => {
                      const y = new Date().getFullYear();
                      return [y, y + 1];
                    })().map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
            </div>
        )}
        
        {/* Pax */}
        <div className={category === 'standard' ? '' : 'col-span-2'}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Pax</label>
            <input 
              type="number" 
              min="1"
              placeholder="Ex. 10"
              required
              value={pax} 
              onChange={e => setPax(parseInt(e.target.value) || '')}
              className="w-full h-11 sm:h-12 border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 text-sm focus:ring-2 focus:ring-yellow-400"
            />
        </div>
      </div>

      {/* Date error is shown inline under the date picker */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
          <select
            required
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
            }}
            className={`w-full h-11 sm:h-12 border bg-white text-gray-900 dark:bg-gray-800 dark:text-white rounded-lg px-3 text-sm focus:ring-2 focus:ring-yellow-400 appearance-none cursor-pointer ${validationErrors.time || validationErrors.conflict ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
          >
            <option value="">Select start time</option>
            {TIME_OPTIONS_30M.filter((t) => toMinutes(t) <= 18 * 60 + 30).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
          <select
            required
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            disabled={!startTime}
            className={`w-full h-11 sm:h-12 border bg-white text-gray-900 dark:bg-gray-800 dark:text-white rounded-lg px-3 text-sm focus:ring-2 focus:ring-yellow-400 appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${validationErrors.time || validationErrors.conflict ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
          >
            <option value="">Select end time</option>
            {startTime && TIME_OPTIONS_30M.filter((t) => toMinutes(t) > toMinutes(startTime)).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        {/* Specific error messages below fields */}
        {validationErrors.time && <p className="text-xs text-red-600 dark:text-red-400 col-span-2">{validationErrors.time}</p>}
        {validationErrors.conflict && <p className="text-xs font-semibold text-red-600 dark:text-red-400 col-span-2">{validationErrors.conflict}</p>}
      </div>

      {/* Unit Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
            <Building className="w-4 h-4" /> Department / Unit
        </label>
        <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full h-11 sm:h-12 border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 text-sm focus:ring-2 focus:ring-yellow-400 appearance-none cursor-pointer"
        >
            {units.map(opt => (
                <option key={opt.id} value={opt.name}>{opt.name}</option>
            ))}
        </select>
        {units.length === 0 && <p className="text-xs text-red-500 mt-1">No units defined. Contact Admin.</p>}
      </div>

      {/* Refreshment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
            <Coffee className="w-4 h-4" /> Refreshment
        </label>
        <select
            value={refreshment}
            onChange={(e) => setRefreshment(e.target.value)}
            className="w-full h-11 sm:h-12 border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 text-sm focus:ring-2 focus:ring-yellow-400 appearance-none cursor-pointer"
        >
            <option value="No Refreshment">No Refreshment</option>
            <option value="Tea & Coffee only">Tea & Coffee only</option>
            <option value="Refreshment with Tea & Coffee">Refreshment with Tea & Coffee</option>
        </select>
        {/* Helper Text for External Party Rule */}
        {refreshment !== 'No Refreshment' && (
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                Note: Refreshments are only provided for external parties.
             </p>
        )}
      </div>

      {/* Equipment */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            <Box className="w-4 h-4" /> Equipment Checklist
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EQUIPMENT_OPTIONS.map((item) => (
                <label key={item} className="flex items-center space-x-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={equipmentReq.includes(item)}
                        onChange={() => toggleEquipment(item)}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-yellow-400 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                </label>
            ))}
        </div>
      </div>

      {/* Meeting Title */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
             {category === 'special' ? 'Function Name' : 'Meeting Title'}
          </label>
        </div>
        <textarea 
          required
          rows={3}
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
          placeholder={category === 'special' ? 'e.g. AUDITOR ROOM / RWMF SECRETARIAT' : 'Review Q3 Goals...'}
          className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
        />
      </div>

       {/* Special Request */}
       <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special Request (Optional)</label>
        <textarea 
          rows={2}
          value={specialRequest}
          onChange={e => setSpecialRequest(e.target.value)}
          placeholder="Any additional requirements..."
          className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <Button 
          type="button" 
          variant="ghost"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={!isValid} className="w-full sm:w-auto">
          {isAdmin ? 'Create Block/Booking' : 'Confirm Booking'}
        </Button>
      </div>
    </form>
  );
};

export default BookingForm;
