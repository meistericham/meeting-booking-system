import React from 'react';
import { BookingStatus } from '../types';
import { Ban, Check, Clock, X } from 'lucide-react';

interface StatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStyles = () => {
    switch (status) {
      case BookingStatus.APPROVED:
        return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case BookingStatus.REJECTED:
        return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case BookingStatus.PENDING:
        return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case BookingStatus.CANCELLED:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getIcon = () => {
    switch (status) {
      case BookingStatus.APPROVED: return <Check className="w-3 h-3" />;
      case BookingStatus.REJECTED: return <X className="w-3 h-3" />;
      case BookingStatus.PENDING: return <Clock className="w-3 h-3" />;
      case BookingStatus.CANCELLED: return <Ban className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStyles()} ${className}`}>
      {getIcon()}
      {status.toUpperCase()}
    </span>
  );
};

export default StatusBadge;
