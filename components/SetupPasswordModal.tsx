import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { logger } from '../utils/logger';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface SetupPasswordModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const SetupPasswordModal: React.FC<SetupPasswordModalProps> = ({ isOpen, onComplete }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      setError('No authenticated user found.');
      return;
    }

    try {
      setIsSaving(true);
      await updatePassword(currentUser, newPassword);

      const emailKey = currentUser.email.trim().toLowerCase();
      const userDocRef = doc(db, 'users', emailKey);
      await updateDoc(userDocRef, {
        status: 'active',
        uid: currentUser.uid
      });

      onComplete();
    } catch (err: any) {
      logger.error('Failed to set password:', err);
      setError(err.message || 'Failed to set password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md flex flex-col border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Set Your Password</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome! Please set a new password to activate your account.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Activate Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupPasswordModal;
