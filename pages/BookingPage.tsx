import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

const BookingPage: React.FC = () => {
  const location = useLocation();
  const { venueId } = useParams<{ venueId: string }>();
  const nextSearchParams = new URLSearchParams(location.search);

  if (venueId) {
    nextSearchParams.set('venueId', venueId);
  }

  const nextSearch = nextSearchParams.toString();

  return <Navigate to={`/calendar${nextSearch ? `?${nextSearch}` : ''}`} replace />;
};

export default BookingPage;
