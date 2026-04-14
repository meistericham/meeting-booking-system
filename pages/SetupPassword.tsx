import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/authContext';
import { UserRole } from '../types';
import { Loader2 } from 'lucide-react';

const SetupPassword = () => {
  const { user, loading, isFirstLogin } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const email = params.get('email');

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location, email }} replace />;
  }

  if (!isFirstLogin) {
    if (user.role === UserRole.SUPER_ADMIN) return <Navigate to="/super-admin" replace />;
    if (user.role === UserRole.ADMIN) return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Preparing your account setup...
      </div>
    </div>
  );
};

export default SetupPassword;
