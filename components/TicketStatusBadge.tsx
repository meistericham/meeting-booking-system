import React from 'react';
import { TicketStatus } from '../types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface TicketStatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status, className = '' }) => {
  const styles: Record<TicketStatus, string> = {
    Pending: 'bg-amber-50 text-amber-700',
    Replied: 'bg-blue-50 text-blue-700',
    Resolved: 'bg-green-50 text-green-700',
    Closed: 'bg-gray-100 text-gray-600'
  };

  const icon = status === 'Pending'
    ? <Clock className="w-3 h-3" />
    : status === 'Replied'
    ? <CheckCircle className="w-3 h-3" />
    : status === 'Resolved'
    ? <CheckCircle className="w-3 h-3" />
    : <XCircle className="w-3 h-3" />;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]} ${className}`}>
      {icon}
      {status.toUpperCase()}
    </span>
  );
};

export default TicketStatusBadge;
