import React, { useEffect, useState } from 'react';
import { useAuth } from '../services/authContext';
import { User, Lock, Save, AlertCircle, CheckCircle2, Palette, RefreshCw } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import { DEFAULT_AVATAR_COLORS, colorFromString } from '../utils/avatar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';


const Settings = () => {
  const { user, updateProfile, changePassword } = useAuth();
  
  // Profile Form State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarBgColor, setAvatarBgColor] = useState(
    user?.avatar?.bgColor || colorFromString(user?.email || user?.displayName || 'user')
  );
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Password Form State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);

    try {
      if (!displayName.trim()) throw new Error("Display name cannot be empty.");

      await updateProfile({ displayName, avatarBgColor });
      setProfileMsg({ type: 'success', text: "Profile updated successfully." });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMsg(null);

    try {
      if (!currentPass) throw new Error("Current password is required.");
      if (newPass.length < 6) throw new Error("New password must be at least 6 characters.");
      if (newPass !== confirmPass) throw new Error("New passwords do not match.");

      await changePassword(currentPass, newPass);
      setPassMsg({ type: 'success', text: "Password changed successfully." });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message });
    } finally {
      setPassLoading(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your profile details and security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Navigation / Sidebar (Visual only for now) */}
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/30 font-medium">
            <User className="w-5 h-5" /> General
          </button>
          <div className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-not-allowed opacity-60">
            <Lock className="w-5 h-5" /> Security
          </div>
        </div>

        {/* Forms Area */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Profile Section */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" /> Profile Information
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              {/* Avatar */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-900/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar user={user} bgColor={avatarBgColor} size="lg" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Avatar</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Default: 2-letter initials from your name (or email). Choose a colour anytime.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setAvatarBgColor(colorFromString(user?.email || user?.displayName || 'user'))}
                      icon={<RefreshCw className="w-4 h-4" />}
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 inline-flex items-center gap-2">
                    <Palette className="w-4 h-4" /> Choose colour
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAvatarBgColor(c)}
                        className={`w-8 h-8 rounded-full border transition-all ${avatarBgColor === c ? 'ring-2 ring-yellow-400 border-white/0' : 'border-white/20 hover:ring-2 hover:ring-white/20'}`}
                        style={{ backgroundColor: c }}
                        aria-label={`Select colour ${c}`}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {profileMsg && (
                <div className={`p-4 rounded-lg flex items-center gap-2 text-sm ${
                  profileMsg.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {profileMsg.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input 
                  type="email" 
                  disabled
                  value={user?.email || ''} 
                  className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg p-2.5 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-400">Email cannot be changed.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  type="submit" 
                  isLoading={profileLoading}
                  icon={<Save className="w-4 h-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Security Section */}
          <Card>
             <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-400" /> Change Password
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passMsg && (
                <div className={`p-4 rounded-lg flex items-center gap-2 text-sm ${
                  passMsg.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {passMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {passMsg.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Password
                    {/* default password hint removed for production */}
                </label>
                <input 
                  type="password" 
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                  <input 
                    type="password" 
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  type="submit" 
                  variant="primary"
                  className="bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600"
                  isLoading={passLoading}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Settings;