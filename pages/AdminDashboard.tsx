import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';
import { usePrint } from '../usePrint'; 

import { cancelBooking, fetchBookings, fetchRooms, fetchUnits, rejectBooking, updateBookingStatus, markBookingAsPrinted, addNotification, deleteBooking, fetchArchiveCandidatesByMonth, archiveBookingsBulk } from '../services/dataService';
import { Booking, BookingStatus, Room, UserRole, Unit, User } from '../types';
import { useAuth } from '../services/authContext';
import { Clock, Grid3X3, List, Coffee, Box, Calendar as CalendarIcon, Building, Printer, Filter, X, Ban, Hammer, BarChart3, FileText, User as UserIcon, Archive } from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import MasterScheduleTable from '../components/MasterScheduleTable';
import { DailySchedulePrint } from '../components/DailySchedulePrint';
import { BookingServiceSlip } from '../components/BookingServiceSlip';
import { BookingPOFAttachment } from '../components/BookingPOFAttachment';
import { PrintableBlockSign } from '../components/PrintableBlockSign';
import { PrintableMeetingReport } from '../components/PrintableMeetingReport';
import StatusBadge from '../components/StatusBadge';
import DashboardAnalytics from '../components/DashboardAnalytics';
import BlockRoomModal from '../components/BlockRoomModal';
import { extractSpecialRequest } from '../utils/specialRequest';

type ViewMode = 'list' | 'spreadsheet';

interface PrintState {
    roomId: string;
    roomName: string;
    bookings: Booking[];
    dateStr: string;
}

type DateScope = 'active' | 'archive';

const specialRequestBadge = (specialRequest?: string) => {
  const info = extractSpecialRequest(specialRequest);
  if (!info.hasRequest) return null;
  return (
    <span
      title={`Special Request (info only): ${info.summary}${info.rawText ? `\n${info.rawText}` : ''}`}
      className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-200 px-2 py-1 text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/40"
    >
      SR
    </span>
  );
};

interface FilterState {
  status: BookingStatus | 'all' | 'printed';
  unit: string;
  roomId: string;
}

interface UseAdminBookingsReturn {
  bookings: Booking[];
  rooms: Room[];
  units: Unit[];
  loading: boolean;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  dateScope: DateScope;
  setDateScope: React.Dispatch<React.SetStateAction<DateScope>>;
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  showAnalytics: boolean;
  setShowAnalytics: React.Dispatch<React.SetStateAction<boolean>>;
  selectedBooking: Booking | null;
  setSelectedBooking: React.Dispatch<React.SetStateAction<Booking | null>>;
  isBlockModalOpen: boolean;
  setIsBlockModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleBookingAction: (bookingId: string, action: 'approve' | 'reject' | 'delete') => Promise<void>;
  initiatePrintSchedule: (roomId: string) => void;
  initiateMaintenancePrint: (blockId: string) => void;
  resetFilters: () => void;
  filteredBookings: Booking[];
  maintenanceBlocks: Booking[];
  canManageBookings: boolean;
  hasActiveFilters: boolean;
  loadData: (showLoading?: boolean) => Promise<void>;
  handlePrintSchedule: () => void;
  handlePrintSlip: () => void;
  handlePrintMaintenance: () => void;
  handlePrintReport: () => void;
  handlePrintPOF: () => void;
  printComponentRef: React.RefObject<HTMLDivElement>;
  printSlipRef: React.RefObject<HTMLDivElement>;
  pofPrintRef: React.RefObject<HTMLDivElement>;
  maintenancePrintRef: React.RefObject<HTMLDivElement>;
  reportPrintRef: React.RefObject<HTMLDivElement>;
  printState: PrintState | null;
  maintenancePrintData: Booking | null;

  // Admin cancel/reject reason UX
  isRejectModalOpen: boolean;
  setIsRejectModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCancelModalOpen: boolean;
  setIsCancelModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  adminReason: string;
  setAdminReason: React.Dispatch<React.SetStateAction<string>>;
  adminOtherText: string;
  setAdminOtherText: React.Dispatch<React.SetStateAction<string>>;
  adminReasonError: string;
  adminReasonOptions: string[];
  submitAdminReject: () => Promise<void>;
  submitAdminCancel: () => Promise<void>;
  openAdminCancel: (booking: Booking) => void;
  setActionTarget: React.Dispatch<React.SetStateAction<Booking | null>>;
}

const useAdminBookings = (currentUser: User | null): UseAdminBookingsReturn => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    unit: 'all',
    roomId: 'all'
  });

  const [dateScope, setDateScope] = useState<DateScope>('active');

  const [viewMode, setViewMode] = useState<ViewMode>('spreadsheet'); 
  // Default: hide analytics whenever Admin Dashboard is opened
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  // Admin reason modals
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<Booking | null>(null);
  const [adminReason, setAdminReason] = useState<string>('');
  const [adminOtherText, setAdminOtherText] = useState<string>('');
  const [adminReasonError, setAdminReasonError] = useState<string>('');

  const printComponentRef = useRef<HTMLDivElement>(null);
  const printSlipRef = useRef<HTMLDivElement>(null);
  const pofPrintRef = useRef<HTMLDivElement>(null);
  const maintenancePrintRef = useRef<HTMLDivElement>(null);
  const reportPrintRef = useRef<HTMLDivElement>(null);

  const [printState, setPrintState] = useState<PrintState | null>(null);
  const [maintenancePrintData, setMaintenancePrintData] = useState<Booking | null>(null);

  const handlePrintSchedule = usePrint({
    content: () => printComponentRef.current,
    documentTitle: `Room-Schedule-${new Date().toISOString().split('T')[0]}`,
  });

  const handlePrintSlip = usePrint({
    content: () => printSlipRef.current,
    documentTitle: selectedBooking ? `Service-Order-${selectedBooking.id}` : 'Service-Order',
  });

  const handlePrintMaintenance = usePrint({
    content: () => maintenancePrintRef.current,
    documentTitle: maintenancePrintData ? `Block-Sign-${maintenancePrintData.roomName}` : 'Block-Sign',
  });

  const handlePrintPOF = usePrint({
    content: () => pofPrintRef.current,
    documentTitle: selectedBooking ? `Catering-Attachment-${selectedBooking.id}` : 'Catering-Attachment',
  });

  const handlePrintReport = usePrint({
    content: () => reportPrintRef.current,
    documentTitle: `Master-Report-${new Date().toISOString().split('T')[0]}`,
  });

  useEffect(() => {
    if (printState && printComponentRef.current) {
        handlePrintSchedule();
    }
  }, [printState, handlePrintSchedule]);

  useEffect(() => {
    if (maintenancePrintData && maintenancePrintRef.current) {
        handlePrintMaintenance();
    }
  }, [maintenancePrintData, handlePrintMaintenance]);

  const initiatePrintSchedule = useCallback((roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const today = new Date();
    today.setHours(0,0,0,0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23,59,59,999);

    const roomBookingsToday = bookings.filter(b => 
        b.roomId === roomId &&
        b.status === BookingStatus.APPROVED &&
        (
            (b.startTime >= today.getTime() && b.startTime <= endOfDay.getTime()) ||
            (b.endTime >= today.getTime() && b.endTime <= endOfDay.getTime()) ||
            (b.startTime < today.getTime() && b.endTime > endOfDay.getTime())
        )
    );

    setPrintState({
        roomId: room.id,
        roomName: room.name,
        bookings: roomBookingsToday,
        dateStr: today.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    });
  }, [bookings, rooms]);

  const initiateMaintenancePrint = useCallback((blockId: string) => {
    const block = bookings.find(b => b.id === blockId);
    if (block) {
        setMaintenancePrintData(block);
    }
  }, [bookings]);

  const loadData = useCallback(async (showLoading: boolean = true) => {
    if (showLoading) {
      setLoading(true);
      logger.debug('📥 INITIAL LOAD - fetching data from Firestore...');
    } else {
      logger.debug('🔄 BACKGROUND REFRESH - fetching data from Firestore...');
    }
    
    try {
      logger.debug('📡 Calling fetchBookings()...');
      const [bookingsData, roomsData, unitsData] = await Promise.all([fetchBookings(), fetchRooms(), fetchUnits()]);
      
      logger.debug('✅ DATA RECEIVED FROM FIRESTORE:');
      logger.debug('  - Bookings count:', bookingsData.length);
      logger.debug('  - Booking IDs:', bookingsData.map(b => ({ id: b.id, status: b.status })));
      logger.debug('  - Rooms count:', roomsData.length);
      logger.debug('  - Units count:', unitsData.length);
      
      bookingsData.sort((a, b) => {
        if (a.status === BookingStatus.PENDING && b.status !== BookingStatus.PENDING) return -1;
        if (a.status !== BookingStatus.PENDING && b.status === BookingStatus.PENDING) return 1;
        return b.startTime - a.startTime;
      });

      logger.debug('✅ Data sorted by status (Pending first) and timestamp');
      logger.debug('✅ Setting state with Firestore data...');
      setBookings(bookingsData);
      setRooms(roomsData);
      setUnits(unitsData);
      logger.debug('✅ State updated successfully');
    } catch (err: any) {
      logger.error('❌ Error loading Firestore data:', err);
      logger.error('❌ Clearing state...');
      setBookings([]);
      setRooms([]);
      setUnits([]);
    } finally {
      if (showLoading) {
        setLoading(false);
        logger.debug('✅ Loading state set to false');
      }
    }
  }, []);

  useEffect(() => {
    // Reset analytics visibility on page entry (in case the route is cached)
    setShowAnalytics(false);
    loadData(true);

    // NOTE: Firestore reads cost money. 5s polling will burn through the free tier fast.
    // Keep this conservative; refresh more often only when you truly need near-realtime.
    const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

    const tick = () => {
      // Avoid background reads when the tab isn't visible.
      if (document.visibilityState !== 'visible') return;
      loadData(false);
    };

    const interval = window.setInterval(tick, REFRESH_MS);

    // Refresh once when user returns to the tab.
    const onVis = () => {
      if (document.visibilityState === 'visible') loadData(false);
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadData]);

  const sendBookingStatusNotification = async (
    booking: Booking,
    status: BookingStatus,
    reason?: string
  ) => {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);

    const formattedDate = start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const formattedTime = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const statusLabel =
      status === BookingStatus.APPROVED
        ? 'Approved'
        : status === BookingStatus.REJECTED
          ? 'Rejected'
          : status === BookingStatus.CANCELLED
            ? 'Cancelled'
            : String(status);

    logger.debug('Booking payload:', booking);
    const payload: {
      userName: string;
      userEmail: string;
      roomName: string;
      date: string;
      time: string;
      purpose?: string;
      status: string;
      reason?: string;
    } = {
      userName: (booking as any).userName || booking.userEmail,
      userEmail: booking.userEmail,
      roomName: booking.roomName,
      date: formattedDate,
      time: formattedTime,
      purpose: (booking as any).purpose,
      status: statusLabel
    };

    if ((status === BookingStatus.REJECTED || status === BookingStatus.CANCELLED) && reason) {
      payload.reason = reason;
    }

    const statusWebhookUrl = import.meta.env.VITE_N8N_STATUS_WEBHOOK_URL;
    if (!statusWebhookUrl) {
      logger.warn('Missing n8n status webhook URL');
      return;
    }

    await fetch(statusWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_N8N_API_KEY
      },
      body: JSON.stringify(payload)
    });
  };

  const handleBookingAction = useCallback(async (bookingId: string, action: 'approve' | 'reject' | 'delete') => {
    if (!bookingId || bookingId.length < 5) {
      logger.error('⛔ ABORT: Invalid or Mock ID detected:', bookingId);
      logger.error('⛔ ID must be at least 5 characters (Firestore IDs are 20+ chars)');
      logger.error('⛔ Received:', { bookingId, length: bookingId?.length, type: typeof bookingId });
      alert('Error: Invalid booking ID. This is likely a mock ID. Please refresh the page and try again.');
      return;
    }

    logger.debug('🔄 handleBookingAction called:', { bookingId, action });
    logger.debug('✅ ID validation passed - this is a valid Firestore ID');
    logger.debug('✅ ID Type:', typeof bookingId);
    logger.debug('✅ ID Length:', bookingId.length);
    
    logger.debug('📋 All bookings in state:', bookings.map(b => ({ id: b.id, status: b.status, roomName: b.roomName })));
    logger.debug('📋 Total bookings available:', bookings.length);
    
    const bookingToUpdate = bookings.find(b => b.id === bookingId);
    
    logger.debug('🔍 Booking lookup result:', bookingToUpdate ? 'FOUND' : 'NOT FOUND');
    if (bookingToUpdate) {
      logger.debug('🔍 Booking details:', { id: bookingToUpdate.id, status: bookingToUpdate.status, roomName: bookingToUpdate.roomName });
    }
    
    if (!bookingToUpdate && action !== 'delete') {
      logger.error('❌ Booking not found for ID:', bookingId);
      logger.error('❌ Available booking IDs:', bookings.map(b => b.id));
      logger.error('❌ ID comparison:', bookings.map(b => ({ firebaseId: b.id, matches: b.id === bookingId })));
      alert(`Error: Booking with ID ${bookingId} not found. Check console for available IDs.`);
      return;
    }
    
    try {
      if (action === 'delete') {
            logger.debug('🗑️ Deleting booking:', bookingId);
            await deleteBooking(bookingId);
            setBookings(prev => prev.filter(b => b.id !== bookingId));
            setSelectedBooking(null);
         return;
      }

      // REJECT is handled via modal to capture reason
      if (action === 'reject') {
        setAdminReasonError('');
        setAdminReason('');
        setAdminOtherText('');
        setActionTarget(bookingToUpdate || null);
        setIsRejectModalOpen(true);
        return;
      }

      const newStatus = BookingStatus.APPROVED;
      
      logger.debug('📤 Updating booking status:', { bookingId, newStatus });
      logger.debug('🚀 Sending update for Real ID:', bookingId);
      logger.debug('📤 Calling updateBookingStatus in dataService...');
      
      await updateBookingStatus(bookingId, newStatus);
      
      logger.debug('✅ Status updated successfully in Firestore, updating local state');
      setBookings(prevBookings => 
        prevBookings.map(b => {
          if (b.id === bookingId) {
            logger.debug(`✅ Updated booking ${bookingId} from ${b.status} to ${newStatus}`);
            return { ...b, status: newStatus };
          }
          return b;
        })
      );

      try {
        if (bookingToUpdate) {
          await sendBookingStatusNotification(bookingToUpdate, newStatus);
        }
      } catch (error) {
        logger.warn('Failed to send booking status notification:', error);
      }
      
      if (bookingToUpdate && bookingToUpdate.type === 'meeting') {
        logger.debug('📬 Sending notification to user:', bookingToUpdate.userId);
        await addNotification({
            recipientRole: UserRole.USER,
            targetUserId: bookingToUpdate.userId,
            createdBy: currentUser?.uid || currentUser?.email || undefined,
            message: `Your booking for ${bookingToUpdate.roomName} has been Approved.`,
            type: 'success'
        });
        logger.debug('📬 Notification sent successfully');
      }

      setSelectedBooking(null);
      logger.debug('✅ Action completed successfully');
    } catch (err: any) {
      logger.error('❌ ERROR in handleBookingAction for ID:', bookingId);
      logger.error('❌ Error type:', err.name);
      logger.error('❌ Error code:', err.code);
      logger.error('❌ Error message:', err.message);
      logger.error('❌ Full error object:', err);
      logger.error('❌ Stack trace:', err.stack);
      alert(`Error: ${err.message}`);
    }
  }, [bookings, currentUser]);

  const adminReasonOptions = [
    'Priority Booking',
    'Unavailable',
    'Maintenance',
    'Other Reason: Please specify'
  ];

  const submitAdminReject = async () => {
    if (!actionTarget || !currentUser) return;

    const reason = (adminReason || '').trim();
    if (!reason) {
      setAdminReasonError('Please select a rejection reason.');
      return;
    }

    if (reason === 'Other Reason: Please specify' && !adminOtherText.trim()) {
      setAdminReasonError('Please specify the reason.');
      return;
    }

    await rejectBooking({
      bookingId: actionTarget.id,
      rejectedBy: currentUser.uid,
      rejectedByRole: currentUser.role === UserRole.SUPER_ADMIN ? 'SUPER_ADMIN' : 'ADMIN',
      rejectionReasonCode: reason,
      rejectionReasonNote: reason === 'Other Reason: Please specify' ? adminOtherText.trim() : ''
    });

    // local state update
    setBookings(prev => prev.map(b => b.id === actionTarget.id ? ({
      ...b,
      status: BookingStatus.REJECTED,
      rejectionReasonCode: reason,
      rejectionReasonNote: reason === 'Other Reason: Please specify' ? adminOtherText.trim() : ''
    } as any) : b));

    // n8n email webhook
    try {
      await sendBookingStatusNotification(
        actionTarget,
        BookingStatus.REJECTED,
        `${reason}${reason === 'Other Reason: Please specify' ? ` — ${adminOtherText.trim()}` : ''}`
      );
    } catch (error) {
      logger.warn('Failed to send booking status notification:', error);
    }

    // notify user (in-app)
    if (actionTarget.type === 'meeting') {
      await addNotification({
        recipientRole: UserRole.USER,
        targetUserId: actionTarget.userId,
        createdBy: currentUser.uid,
        message: `Your booking for ${actionTarget.roomName} has been Rejected. Reason: ${reason}${reason === 'Other Reason: Please specify' ? ` — ${adminOtherText.trim()}` : ''}`,
        type: 'error'
      });
    }

    setSelectedBooking(null);
    setIsRejectModalOpen(false);
    setActionTarget(null);
  };

  const openAdminCancel = (booking: Booking) => {
    setAdminReasonError('');
    setAdminReason('');
    setAdminOtherText('');
    setActionTarget(booking);
    setIsCancelModalOpen(true);
  };

  const submitAdminCancel = async () => {
    if (!actionTarget || !currentUser) return;

    const reason = (adminReason || '').trim();
    if (!reason) {
      setAdminReasonError('Please select a cancellation reason.');
      return;
    }

    if (reason === 'Other Reason: Please specify' && !adminOtherText.trim()) {
      setAdminReasonError('Please specify the reason.');
      return;
    }

    await cancelBooking({
      bookingId: actionTarget.id,
      cancelledBy: currentUser.uid,
      cancelledByRole: currentUser.role === UserRole.SUPER_ADMIN ? 'SUPER_ADMIN' : 'ADMIN',
      cancelReasonCode: reason,
      cancelReasonNote: reason === 'Other Reason: Please specify' ? adminOtherText.trim() : ''
    });

    setBookings(prev => prev.map(b => b.id === actionTarget.id ? ({
      ...b,
      status: BookingStatus.CANCELLED,
      cancelReasonCode: reason,
      cancelReasonNote: reason === 'Other Reason: Please specify' ? adminOtherText.trim() : ''
    } as any) : b));

    // n8n email webhook
    try {
      await sendBookingStatusNotification(
        actionTarget,
        BookingStatus.CANCELLED,
        `${reason}${reason === 'Other Reason: Please specify' ? ` — ${adminOtherText.trim()}` : ''}`
      );
    } catch (error) {
      logger.warn('Failed to send booking status notification:', error);
    }

    if (actionTarget.type === 'meeting') {
      await addNotification({
        recipientRole: UserRole.USER,
        targetUserId: actionTarget.userId,
        createdBy: currentUser.uid,
        message: `Your booking for ${actionTarget.roomName} has been Cancelled by Admin. Reason: ${reason}${reason === 'Other Reason: Please specify' ? ` — ${adminOtherText.trim()}` : ''}`,
        type: 'error'
      });
    }

    setSelectedBooking(null);
    setIsCancelModalOpen(false);
    setActionTarget(null);
  };

  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfCurrentMonth.setHours(0, 0, 0, 0);
  const startOfMonthAfterNext = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  startOfMonthAfterNext.setHours(0, 0, 0, 0);

  const filteredBookings = bookings.filter(b => {
    // Hide auto-combined child records; show only the parent row with combinedRoomIds ticks.
    if ((b as any).isCombinedChild === true) return false;


    // Date scope filter
    // IMPORTANT: When filtering PENDING requests, show ALL pending across dates.
    // This keeps the table consistent with the global sidebar "New Requests" badge.
    const isPendingFilter = filters.status === BookingStatus.PENDING;

    if (!isPendingFilter) {
      const isActiveWindow =
        b.startTime >= startOfCurrentMonth.getTime() &&
        b.startTime < startOfMonthAfterNext.getTime();

      const isArchiveWindow = b.startTime < startOfCurrentMonth.getTime();

      const inScope = dateScope === 'active' ? isActiveWindow : isArchiveWindow;
      if (!inScope) return false;
    }

    // Existing filters
    let matchesStatus = true;
    if (filters.status === 'printed') {
      matchesStatus = b.isPrinted === true;
    } else if (filters.status !== 'all') {
      matchesStatus = b.status === filters.status;
    }
    const matchesRoom = filters.roomId === 'all' || b.roomId === filters.roomId;
    const matchesUnit = filters.unit === 'all' || b.unit === filters.unit;

    return matchesStatus && matchesRoom && matchesUnit;
  });

  const maintenanceBlocks = bookings.filter(b => 
    b.type === 'maintenance' || 
    b.type === 'special' ||
    b.bookingCategory === 'special'
  );

  const resetFilters = useCallback(() => {
    setFilters({ status: 'all', unit: 'all', roomId: 'all' });
  }, []);

  const hasActiveFilters = filters.status !== 'all' || filters.unit !== 'all' || filters.roomId !== 'all';
  const canManageBookings = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  return {
    bookings, rooms, units, loading, filters, setFilters, dateScope, setDateScope, viewMode, setViewMode, showAnalytics, setShowAnalytics,
    selectedBooking, setSelectedBooking, isBlockModalOpen, setIsBlockModalOpen,
    handleBookingAction, initiatePrintSchedule, initiateMaintenancePrint, resetFilters,
    filteredBookings, maintenanceBlocks, canManageBookings, hasActiveFilters, loadData,
    handlePrintSchedule, handlePrintSlip, handlePrintMaintenance, handlePrintReport, handlePrintPOF,
    printComponentRef, printSlipRef, pofPrintRef, maintenancePrintRef, reportPrintRef,
    printState, maintenancePrintData,

    isRejectModalOpen, setIsRejectModalOpen,
    isCancelModalOpen, setIsCancelModalOpen,
    adminReason, setAdminReason,
    adminOtherText, setAdminOtherText,
    adminReasonError,
    adminReasonOptions,
    submitAdminReject,
    submitAdminCancel,
    openAdminCancel,
    setActionTarget,
  };
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const {
    bookings, rooms, units, loading, filters, setFilters, dateScope, setDateScope, viewMode, setViewMode, showAnalytics, setShowAnalytics,
    selectedBooking, setSelectedBooking, isBlockModalOpen, setIsBlockModalOpen,
    handleBookingAction, initiatePrintSchedule, initiateMaintenancePrint, resetFilters,
    filteredBookings, maintenanceBlocks, canManageBookings, hasActiveFilters, loadData,
    handlePrintSchedule, handlePrintSlip, handlePrintMaintenance, handlePrintReport, handlePrintPOF,
    printComponentRef, printSlipRef, pofPrintRef, maintenancePrintRef, reportPrintRef,
    printState, maintenancePrintData,

    isRejectModalOpen, setIsRejectModalOpen,
    isCancelModalOpen, setIsCancelModalOpen,
    adminReason, setAdminReason,
    adminOtherText, setAdminOtherText,
    adminReasonError,
    adminReasonOptions,
    submitAdminReject,
    submitAdminCancel,
    openAdminCancel,
    setActionTarget,
  } = useAdminBookings(user);

  // Manual archiving controls (Super Admin only)
  const canUseArchiveControls =
    user?.role === UserRole.SUPER_ADMIN ||
    (user?.role === UserRole.ADMIN && user?.canApproveUsers === true);
  const [isArchiveMonthOpen, setIsArchiveMonthOpen] = useState(false);
  const [archiveYear, setArchiveYear] = useState(new Date().getFullYear());
  const [archiveMonth, setArchiveMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [archivePreview, setArchivePreview] = useState<Booking[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveConfirmText, setArchiveConfirmText] = useState('');
  const [archiveMessage, setArchiveMessage] = useState('');

  const archivedBy = user?.uid || user?.email || 'system';

  const previewArchiveByMonth = async () => {
    setArchiveLoading(true);
    setArchiveMessage('');
    try {
      const list = await fetchArchiveCandidatesByMonth({ year: archiveYear, month: archiveMonth });
      setArchivePreview(list);
      setArchiveMessage(`Preview: ${list.length} bookings will be archived.`);
    } catch (e: any) {
      setArchiveMessage(e?.message || 'Failed to load preview.');
    } finally {
      setArchiveLoading(false);
    }
  };

  const runArchiveByMonth = async () => {
    if (archiveConfirmText.trim().toUpperCase() !== 'ARCHIVE') {
      setArchiveMessage('Type ARCHIVE to confirm.');
      return;
    }

    setArchiveLoading(true);
    setArchiveMessage('');
    try {
      const ids = archivePreview.map((b) => b.id);
      const res = await archiveBookingsBulk({ bookingIds: ids, archivedBy, archivedReason: 'MANUAL_MONTH' });
      setArchiveMessage(`Done. Archived ${res.updated} bookings.`);
      setArchivePreview([]);
      setArchiveConfirmText('');
    } catch (e: any) {
      setArchiveMessage(e?.message || 'Failed to archive bookings.');
    } finally {
      setArchiveLoading(false);
    }
  };

  const getRefreshmentBadge = (refreshment?: string | null) => {
    const raw = String(refreshment || '').trim().toLowerCase();

    if (!raw || raw === 'no refreshment') {
      return { symbol: 'Ø', short: 'RF', full: 'NO REFRESHMENT', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' };
    }

    if (
      raw.includes('tea') && raw.includes('coffee') &&
      (raw.includes('only') || raw === 'tea & coffee' || raw === 'tea and coffee')
    ) {
      return { symbol: '☕', short: 'T&C', full: 'TEA & COFFEE ONLY', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' };
    }

    return { symbol: '🍽', short: 'R+T&C', full: 'REFRESHMENT WITH TEA & COFFEE', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' };
  };

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading admin data...</div>;

  return (
    <div className="space-y-6">
      {/* Hidden Print Components */}
      <div style={{ display: 'none' }}>
        <div ref={printComponentRef}>
            {printState && <DailySchedulePrint roomName={printState.roomName} dateStr={printState.dateStr} bookings={printState.bookings} />}
        </div>
        <div ref={printSlipRef}>
            {selectedBooking && <BookingServiceSlip booking={selectedBooking} />}
        </div>
        <div ref={pofPrintRef}>
            {selectedBooking && selectedBooking.type === 'meeting' && <BookingPOFAttachment booking={selectedBooking} />}
        </div>
        <div ref={maintenancePrintRef}>
            {maintenancePrintData && <PrintableBlockSign booking={maintenancePrintData} />}
        </div>
        <div ref={reportPrintRef}>
             <PrintableMeetingReport bookings={filteredBookings} generatedBy={user?.displayName} />
        </div>
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Overview of all facility usage and requests.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
             <Button 
                variant="secondary"
                icon={<BarChart3 className="w-4 h-4" />}
                onClick={() => {
                  const next = !showAnalytics;
                  logger.info('[AdminDashboard] analytics toggle', { show: next });
                  setShowAnalytics(next);
                }}
                className="hidden md:flex"
             >
                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
             </Button>

             {canUseArchiveControls && (
               <>
                 <Button
                   variant="secondary"
                   icon={<Archive className="w-4 h-4" />}
                   onClick={() => {
                     setArchiveMessage('');
                     setArchiveConfirmText('');
                     setArchivePreview([]);
                     const d = new Date();
                     const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
                     setArchiveYear(prev.getFullYear());
                     setArchiveMonth(prev.getMonth() + 1);
                     setIsArchiveMonthOpen(true);
                   }}
                   className="bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
                 >
                   Archive by Month
                 </Button>
               </>
             )}

             {canManageBookings && (
                <Button 
                    variant="secondary"
                    icon={<Hammer className="w-4 h-4" />}
                    onClick={() => setIsBlockModalOpen(true)}
                    className="bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
                >
                    Block Room
                </Button>
             )}

             <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button
                    onClick={() => setViewMode('spreadsheet')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'spreadsheet' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                    title="Master Sheet View"
                >
                    <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                    title="List View"
                >
                    <List className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          showAnalytics
            ? 'max-h-[2000px] opacity-100 translate-y-0'
            : 'max-h-0 opacity-0 -translate-y-2'
        }`}
      >
        <div className="pt-4">
          <DashboardAnalytics bookings={bookings} rooms={rooms} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Filter className="w-4 h-4" /> Filters:
          </div>

          {/* Date scope tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg w-fit">
            <button
              onClick={() => setDateScope('active')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${dateScope === 'active' ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
              title="Show current and upcoming month"
              type="button"
            >
              Current + Next
            </button>
            <button
              onClick={() => setDateScope('archive')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${dateScope === 'archive' ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
              title="Show previous months (archive)"
              type="button"
            >
              Archive
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value as any})}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm focus:border-indigo-500 focus:ring-yellow-400"
            >
                <option value="all">Status: All</option>
                <option value={BookingStatus.PENDING}>Pending</option>
                <option value={BookingStatus.APPROVED}>Approved</option>
                <option value={BookingStatus.REJECTED}>Rejected</option>
                <option value={BookingStatus.BLOCKED}>Maintenance / Blocked</option>
                <option value="printed">Slip Printed</option>
            </select>

            <select
                value={filters.roomId}
                onChange={(e) => setFilters({...filters, roomId: e.target.value})}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm focus:border-indigo-500 focus:ring-yellow-400"
            >
                <option value="all">Room: All</option>
                {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                ))}
            </select>

            <select
                value={filters.unit}
                onChange={(e) => setFilters({...filters, unit: e.target.value})}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-2 text-sm focus:border-indigo-500 focus:ring-yellow-400"
            >
                <option value="all">Unit: All</option>
                {units.map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                ))}
            </select>
        </div>

        <div className="flex items-center gap-2">
            {hasActiveFilters && (
                <button 
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors whitespace-nowrap"
                >
                    <X className="w-4 h-4" /> Reset
                </button>
            )}
            
            <Button 
                variant="secondary"
                icon={<FileText className="w-4 h-4" />}
                onClick={handlePrintReport}
                title="Print the current list of bookings"
                className="whitespace-nowrap"
            >
                Print Report
            </Button>
        </div>
      </div>

      {viewMode === 'spreadsheet' ? (
        <MasterScheduleTable 
            bookings={filteredBookings} 
            rooms={rooms} 
            onSelectBooking={setSelectedBooking}
            onPrintRoom={initiatePrintSchedule}
        />
      ) : (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="overflow-x-auto rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wider text-gray-700 dark:text-gray-100 font-bold">
                    <th className="px-6 py-4 whitespace-nowrap">RF</th>
                    <th className="px-6 py-4 whitespace-nowrap">SR</th>
                    <th className="px-6 py-4 whitespace-nowrap">Requester</th>
                    <th className="px-6 py-4 whitespace-nowrap">Room & Time</th>
                    <th className="px-6 py-4 whitespace-nowrap">Meeting Title</th>
                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredBookings.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No bookings match the selected filters.</td>
                        </tr>
                    ) : (
                        filteredBookings.map(bk => {
                        const start = new Date(bk.startTime);
                        const end = new Date(bk.endTime);
                        const isMaintenance = bk.type === 'maintenance';

                        const isCancelled = bk.status === BookingStatus.CANCELLED;
                        const isRejected = bk.status === BookingStatus.REJECTED;
                        const rf = getRefreshmentBadge(isMaintenance ? null : bk.refreshment);
                        return (
                            <tr key={bk.id} className={`hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${isCancelled ? 'opacity-60' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  title={rf.full}
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${rf.cls}`}
                                >
                                  <span>{rf.symbol}</span>
                                  <span>{rf.short}</span>
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {specialRequestBadge(bk.specialRequest)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {isMaintenance ? (
                                    <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                        <Hammer className="w-3 h-3" /> SYSTEM
                                    </div>
                                ) : (
                                    <>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{bk.userEmail}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">ID: {bk.userId.slice(0, 8)}...</div>
                                    </>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-semibold text-gray-800 dark:text-gray-100">{bk.roomName}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-col">
                                <span>{start.toLocaleDateString()}</span>
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded w-fit mt-1">
                                    {start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                </span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <p className={`text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate ${isRejected || isCancelled ? 'line-through' : ''}`} title={bk.purpose}>{bk.purpose}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={bk.status} isPrinted={bk.isPrinted} />
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                <button
                                    onClick={() => setSelectedBooking(bk)} 
                                    className="text-brand-maroon hover:text-red-800 dark:text-brand-gold text-sm font-medium"
                                >
                                    Details
                                </button>
                            </td>
                            </tr>
                        );
                        })
                    )}
                </tbody>
                </table>
            </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking?.type === 'maintenance' ? "Maintenance Block Details" : "Booking Details"}
      >
        {selectedBooking && (
            <div className="space-y-6">
                <div className={`flex items-center justify-between p-4 rounded-lg ${selectedBooking.type === 'maintenance' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                    <div>
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white">{selectedBooking.roomName}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{new Date(selectedBooking.startTime).toLocaleDateString()}</span>
                            <span className="mx-1">•</span>
                            <Clock className="w-4 h-4" />
                            <span>
                                {new Date(selectedBooking.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - 
                                {new Date(selectedBooking.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={selectedBooking.status} isPrinted={selectedBooking.isPrinted} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {selectedBooking.status === BookingStatus.CANCELLED && (
                      <div className="col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cancellation Reason</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {(selectedBooking as any).cancelReasonCode || 'No reason provided.'}
                          {(selectedBooking as any).cancelReasonNote ? ` — ${(selectedBooking as any).cancelReasonNote}` : ''}
                        </p>
                      </div>
                    )}
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase">Requester</label>
                        <div className="flex items-start gap-2 mt-1">
                            <UserIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                            <div className="min-w-0">
                              {(() => {
                                const isValidName = (n?: string | null) => {
                                  const s = (n || '').trim();
                                  if (!s) return false;
                                  const bad = ['user', 'unknown', '-', 'n/a'];
                                  return !bad.includes(s.toLowerCase());
                                };

                                const displayName = isValidName((selectedBooking as any).userName)
                                  ? (selectedBooking as any).userName
                                  : '';

                                return (
                                  <>
                                    {displayName ? (
                                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{displayName}</div>
                                    ) : (
                                      <div className="text-gray-700 dark:text-gray-300 truncate">{selectedBooking.userEmail}</div>
                                    )}

                                    {displayName && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedBooking.userEmail}</div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                        </div>
                    </div>
                    
                    {selectedBooking.type === 'meeting' && (
                        <>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Unit / Department</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Building className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-700 dark:text-gray-300">{selectedBooking.unit || 'N/A'}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Number of Pax</label>
                                <div className="mt-1 text-gray-700 dark:text-gray-300 font-medium">
                                    {selectedBooking.pax ? `${selectedBooking.pax} Pax` : '-'}
                                </div>
                            </div>
                        </>
                    )}
                    
                    <div className="col-span-2">
                         <label className="text-xs font-semibold text-gray-400 uppercase">
                            {selectedBooking.type === 'maintenance' ? 'Maintenance Reason' : 'Meeting Title'}
                         </label>
                         <p className="mt-1 text-gray-700 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-md">
                            {selectedBooking.purpose}
                         </p>
                    </div>
                    
                {selectedBooking.type === 'meeting' && (
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
                                    <Coffee className="w-3 h-3" /> Refreshments
                                </label>
                                <span className="text-sm text-gray-900 dark:text-white">{selectedBooking.refreshment || 'None'}</span>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
                                    <Box className="w-3 h-3" /> Equipment
                                </label>
                                {selectedBooking.requestedEquipment && selectedBooking.requestedEquipment.length > 0 ? (
                                    <ul className="list-disc list-inside text-sm text-gray-900 dark:text-white">
                                        {selectedBooking.requestedEquipment.map(eq => <li key={eq}>{eq}</li>)}
                                    </ul>
                                ) : <span className="text-sm text-gray-500 italic">None requested</span>}
                            </div>
                  </div>
                )}

                {/* Special Request (Info Only) */}
                {selectedBooking.type === 'meeting' && (() => {
                  const info = extractSpecialRequest(selectedBooking.specialRequest);
                  if (!info.hasRequest) return null;
                  return (
                    <div className="col-span-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-900/10 p-4">
                      <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Special Request (Info Only)</p>
                      <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-200/70">
                        Detected: <span className="font-semibold">{info.summary}</span>
                      </p>
                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                        {info.rawText}
                      </div>
                    </div>
                  );
                })()}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                    
                    {canManageBookings && selectedBooking.type === 'meeting' && (
                        <div className="flex items-center gap-2">
                          <Button 
                              variant="secondary"
                              onClick={handlePrintSlip}
                              icon={<Printer className="w-4 h-4" />}
                              title="Print Service Slip"
                          >
                              Print Form
                          </Button>
                          <Button
                              variant="secondary"
                              onClick={handlePrintPOF}
                              icon={<FileText className="w-4 h-4" />}
                              title="Print Catering Attachment"
                          >
                              Print Catering Attachment
                          </Button>
                        </div>
                    )}

                    {canManageBookings && selectedBooking.type === 'maintenance' && (
                         <Button 
                            variant="secondary"
                            onClick={() => setMaintenancePrintData(selectedBooking)}
                            icon={<Printer className="w-4 h-4" />}
                            title="Print Signage"
                        >
                            Print Signage
                        </Button>
                    )}

                    <div className="flex gap-3 ml-auto">
                        {canManageBookings && (
                            <>
                                {selectedBooking.status === BookingStatus.PENDING && (
                                    <>
                                        <Button 
                                            variant="danger"
                                            onClick={() => handleBookingAction(selectedBooking.id, 'reject')}
                                        >
                                            Reject
                                        </Button>
                                        <Button 
                                            variant="primary"
                                            onClick={() => handleBookingAction(selectedBooking.id, 'approve')}
                                        >
                                            Approve Request
                                        </Button>
                                    </>
                                )}

                                {selectedBooking.status === BookingStatus.APPROVED && selectedBooking.type === 'meeting' && (
                                  <Button
                                    variant="danger"
                                    onClick={() => openAdminCancel(selectedBooking)}
                                  >
                                    Cancel Meeting
                                  </Button>
                                )}
                                {selectedBooking.type === 'maintenance' && (
                                    <Button 
                                        variant="danger"
                                        icon={<Ban className="w-4 h-4" />}
                                        onClick={() => handleBookingAction(selectedBooking.id, 'delete')}
                                    >
                                        Remove Block
                                    </Button>
                                )}
                            </>
                        )}
                        <Button variant="ghost" onClick={() => setSelectedBooking(null)}>Close</Button>
                    </div>
                </div>
            </div>
        )}
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setActionTarget(null);
        }}
        title="Reject Booking"
      >
        <div className="space-y-4">
          {adminReasonError && (
            <div className="rounded-lg border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
              {adminReasonError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
            <select
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Select reason</option>
              {adminReasonOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {adminReason === 'Other Reason: Please specify' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Please specify</label>
              <textarea
                rows={3}
                value={adminOtherText}
                onChange={(e) => setAdminOtherText(e.target.value)}
                className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
                placeholder="Type your reason..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => { setIsRejectModalOpen(false); setActionTarget(null); }}>Back</Button>
            <Button variant="danger" type="button" onClick={submitAdminReject}>Confirm Reject</Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Reason Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setActionTarget(null);
        }}
        title="Cancel Meeting"
      >
        <div className="space-y-4">
          {adminReasonError && (
            <div className="rounded-lg border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
              {adminReasonError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
            <select
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Select reason</option>
              {adminReasonOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {adminReason === 'Other Reason: Please specify' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Please specify</label>
              <textarea
                rows={3}
                value={adminOtherText}
                onChange={(e) => setAdminOtherText(e.target.value)}
                className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
                placeholder="Type your reason..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => { setIsCancelModalOpen(false); setActionTarget(null); }}>Back</Button>
            <Button variant="danger" type="button" onClick={submitAdminCancel}>Confirm Cancel</Button>
          </div>
        </div>
      </Modal>


      {/* Super Admin: Archive by Month */}
      <Modal
        isOpen={isArchiveMonthOpen}
        onClose={() => setIsArchiveMonthOpen(false)}
        title="Archive Past Month (Super Admin)"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Archives all past meetings for the selected month (all statuses), excluding already-archived records.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Year</label>
              <input
                type="number"
                value={archiveYear}
                onChange={(e) => setArchiveYear(Number(e.target.value) || new Date().getFullYear())}
                className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Month</label>
              <select
                value={archiveMonth}
                onChange={(e) => setArchiveMonth(Number(e.target.value))}
                className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-yellow-400"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={previewArchiveByMonth} disabled={archiveLoading}>
              {archiveLoading ? 'Loading…' : 'Preview'}
            </Button>
            <Button
              onClick={runArchiveByMonth}
              disabled={archiveLoading || archivePreview.length === 0}
              className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
            >
              Archive Now
            </Button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Confirm</label>
            <input
              type="text"
              placeholder="Type ARCHIVE to confirm"
              value={archiveConfirmText}
              onChange={(e) => setArchiveConfirmText(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {archiveMessage && (
            <div className="text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {archiveMessage}
            </div>
          )}

          {archivePreview.length > 0 && (
            <div className="max-h-56 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Room</th>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {archivePreview.slice(0, 10).map((b) => (
                    <tr key={b.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2">{b.roomName}</td>
                      <td className="px-3 py-2">{new Date(b.startTime).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {archivePreview.length > 10 && (
                <div className="p-2 text-xs text-gray-500 dark:text-gray-400">
                  Showing 10 of {archivePreview.length}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
      <BlockRoomModal 
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSuccess={loadData}
        rooms={rooms}
        currentBlocks={maintenanceBlocks}
        onUnblock={(id) => handleBookingAction(id, 'delete')}
        onPrint={initiateMaintenancePrint}
      />
    </div>
  );
};

export default AdminDashboard;
