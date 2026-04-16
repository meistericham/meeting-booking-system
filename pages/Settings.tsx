import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  LogOut,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
  User,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { getDashboardNav } from '../config/dashboardNavigation';
import { useAuth } from '../services/authContext';
import { UserRole } from '../types';
import { colorFromString, DEFAULT_AVATAR_COLORS } from '../utils/avatar';

const Settings: React.FC = () => {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const location = useLocation();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [avatarBgColor, setAvatarBgColor] = useState(
    user?.avatar?.bgColor || colorFromString(user?.email || user?.displayName || 'user')
  );
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setPhoneNumber(user?.phoneNumber || '');
    setOrganization(user?.organization || '');
    setAvatarBgColor(
      user?.avatar?.bgColor || colorFromString(user?.email || user?.displayName || 'user')
    );
  }, [user]);

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);

    try {
      if (!displayName.trim()) {
        throw new Error('Display name cannot be empty.');
      }

      await updateProfile({
        displayName,
        phoneNumber,
        organization,
        avatarBgColor,
      });

      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      setProfileMsg({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to update profile.',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPassLoading(true);
    setPassMsg(null);

    try {
      if (!currentPass) {
        throw new Error('Current password is required.');
      }

      if (newPass.length < 6) {
        throw new Error('New password must be at least 6 characters.');
      }

      if (newPass !== confirmPass) {
        throw new Error('New passwords do not match.');
      }

      await changePassword(currentPass, newPass);
      setPassMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (error) {
      setPassMsg({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to change password.',
      });
    } finally {
      setPassLoading(false);
    }
  };

  const resetAvatarColor = () => {
    setAvatarBgColor(colorFromString(user?.email || user?.displayName || 'user'));
  };

  return (
    <DashboardShell
      badge="Account Settings"
      title="User Profile"
      description="Update your personal details, keep your booking contact info accurate, and manage account security."
      userLabel={user?.displayName || user?.email}
      navItems={getDashboardNav(user?.role ?? UserRole.USER, location.pathname)}
      headerActions={
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-red-300 hover:text-red-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-400 dark:hover:text-red-200"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      }
    >
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-3xl shadow-sm">
          <div className="border-b border-gray-200 pb-6 dark:border-gray-800">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-maroon/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
              <User className="h-3.5 w-3.5" />
              Profile Information
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              These details are reused in booking requests and can be updated anytime.
            </p>
          </div>

          <form onSubmit={handleUpdateProfile} className="mt-6 space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar user={user} bgColor={avatarBgColor} size="lg" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Avatar
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Choose a colour for your initials avatar.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetAvatarColor}
                  icon={<RefreshCw className="h-4 w-4" />}
                >
                  Reset
                </Button>
              </div>

              <div className="mt-4">
                <p className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                  <Palette className="h-4 w-4" />
                  Choose colour
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarBgColor(color)}
                      className={`h-8 w-8 rounded-full border transition-all ${
                        avatarBgColor === color
                          ? 'ring-2 ring-brand-maroon ring-offset-2 dark:ring-red-300 dark:ring-offset-gray-900'
                          : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-700'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select colour ${color}`}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {profileMsg && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  profileMsg.type === 'success'
                    ? 'border border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300'
                    : 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {profileMsg.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {profileMsg.text}
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="+60 12-345 6789"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Organization
              </label>
              <input
                type="text"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                placeholder="Your team or organization"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <Button
              type="submit"
              isLoading={profileLoading}
              icon={<Save className="h-4 w-4" />}
              className="rounded-xl bg-brand-maroon hover:bg-[#74161c]"
            >
              Save profile
            </Button>
          </form>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <div className="border-b border-gray-200 pb-6 dark:border-gray-800">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-maroon/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Change your password to keep your account secure.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="mt-6 space-y-5">
            {passMsg && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  passMsg.type === 'success'
                    ? 'border border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300'
                    : 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {passMsg.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {passMsg.text}
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Password
              </label>
              <input
                type="password"
                value={currentPass}
                onChange={(event) => setCurrentPass(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(event) => setNewPass(event.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(event) => setConfirmPass(event.target.value)}
                  placeholder="Repeat the new password"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={passLoading}
              className="rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
};

export default Settings;
