import React from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import VenueDetailsPage from './pages/VenueDetailsPage';
import BookingPage from './pages/BookingPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminBookingsPage from './pages/AdminBookingsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminRoomsPage from './pages/AdminRoomsPage';
import CalendarPage from './pages/CalendarPage';
import NotificationsPage from './pages/NotificationsPage';
import Settings from './pages/Settings';
import { AuthProvider, useAuth } from './services/authContext';
import { ThemeProvider } from './services/themeContext';
import { UserRole } from './types';

const homeForRole = (role: UserRole) =>
  role === UserRole.ADMIN ? '/admin' : '/dashboard';

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return children;
};

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/venue" element={<VenueDetailsPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN]}>
                    <CalendarPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN]}>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN]}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.USER]}>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN]}>
                    <BookingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book/:venueId"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN]}>
                    <BookingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/confirmation/:id"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN]}>
                    <BookingConfirmationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bookings"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <AdminBookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/rooms"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <AdminRoomsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  );
}
