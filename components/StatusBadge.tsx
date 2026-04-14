import React from 'react';
import { BookingStatus } from '../types';
import { Check, X, Clock, AlertCircle, Printer, Star } from 'lucide-react';

interface StatusBadgeProps {
  status: BookingStatus;
  isPrinted?: boolean;
  className?: string;
  category?: 'standard' | 'special';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isPrinted, category, className = '' }) => {
  const getStyles = () => {
    // Override for Special Category
    if (category === 'special') {
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }

    switch (status) {
      case BookingStatus.APPROVED:
        return 'bg-green-50 text-green-700';
      case BookingStatus.REJECTED:
        return 'bg-red-50 text-red-700';
      case BookingStatus.PENDING:
        return 'bg-amber-50 text-amber-700';
      case BookingStatus.CANCELLED:
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getIcon = () => {
    if (category === 'special') return <Star className="w-3 h-3 fill-purple-800 dark:fill-purple-300" />;

    switch (status) {
      case BookingStatus.APPROVED: return <Check className="w-3 h-3" />;
      case BookingStatus.REJECTED: return <X className="w-3 h-3" />;
      case BookingStatus.PENDING: return <Clock className="w-3 h-3" />;
      case BookingStatus.CANCELLED: return <X className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getLabel = () => {
      if (category === 'special') return "OFFICIAL";
      return status.toUpperCase();
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStyles()} ${className}`}>
      {getIcon()}
      {getLabel()}
      {isPrinted && (
        <span className="ml-1 pl-1 border-l border-current opacity-70" title="Slip Printed">
            <Printer className="w-3 h-3" />
        </span>
      )}
    </span>
  );
};

export default StatusBadge;
