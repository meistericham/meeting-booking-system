import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/authContext';
import { ThemeProvider } from './services/themeContext';
import { UserRole } from './types';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import LandingPage from './pages/LandingPage';
import SetupPassword from './pages/SetupPassword';
import UserDashboard from './pages/UserDashboard';
import UserCalendar from './pages/UserCalendar';
import MyBookings from './pages/MyBookings';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminInbox from './pages/AdminInbox';
import UserApprovals from './pages/UserApprovals';
import VersionHistory from './pages/VersionHistory';
import SystemEvolution from './pages/SystemEvolution';
import Settings from './pages/Settings';
import PendingAccessScreen from './components/PendingAccessScreen';
import SupportCenter from './pages/SupportCenter';
import UserGuide from './pages/UserGuide';
import SuperAdminUpdateNotice from './pages/SuperAdminUpdateNotice';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';
import SetupPasswordModal from './components/SetupPasswordModal';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children?: React.ReactNode, allowedRoles: UserRole[] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === UserRole.SUPER_ADMIN) return <Navigate to="/super-admin" replace />;
    if (user.role === UserRole.ADMIN) return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Layout Wrapper for authenticated routes
const AuthenticatedLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isPending = user?.status === 'PENDING';

  if (isPending && location.pathname !== '/profile') {
    return (
      <Layout>
        <PendingAccessScreen />
      </Layout>
    );
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

const AppContent = () => {
  const { isFirstLogin, completeFirstLogin } = useAuth();

  return (
    <>
      <SetupPasswordModal isOpen={isFirstLogin} onComplete={completeFirstLogin} />
      <Routes>
      {/* Public Routes (No Layout/Sidebar) */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/setup-password" element={<SetupPassword />} />

      {/* Protected Routes (Wrapped in Layout/Sidebar) */}
      <Route element={<AuthenticatedLayout />}>
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <UserDashboard />
                </div>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/calendar" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <UserCalendar />
                </div>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/my-bookings" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <MyBookings />
                </div>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <AdminDashboard />
                </div>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/super-admin" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <SuperAdminDashboard />
                </div>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin/inbox" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <AdminInbox />
                </div>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/super-admin/update-notice" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <SuperAdminUpdateNotice />
                </div>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/user-approvals" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <UserApprovals />
                </div>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/system-evolution" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <SystemEvolution />
                </div>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/version-history" 
            element={<Navigate to="/system-evolution" replace />}
          />

          <Route 
            path="/settings" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <Settings />
                </div>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/profile" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <Settings />
                </div>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/support" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <SupportCenter />
                </div>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/user-guide" 
            element={
              <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                  <UserGuide />
                </div>
              </ProtectedRoute>
            } 
          />
      </Route>
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  );
}
