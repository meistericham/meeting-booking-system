import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Loader2,
  LogOut,
  MailPlus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserX,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { getAdminDashboardNav } from '../config/dashboardNavigation';
import { useAuth } from '../services/authContext';
import { getEmailDeliveryWarning, sendInviteEmail } from '../services/emailService';
import {
  fetchApprovedEmailInvites,
  upsertApprovedEmailInvite,
} from '../services/inviteService';
import { fetchUsers, updateUserActiveState } from '../services/userService';
import { AppUser, ApprovedEmailInvite, UserRole } from '../types';

const formatDateTime = (value?: number) => {
  if (!value) {
    return 'Not sent yet';
  }

  return new Date(value).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AdminUsersPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [invites, setInvites] = useState<ApprovedEmailInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [warning, setWarning] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteBusyEmail, setInviteBusyEmail] = useState<string | null>(null);
  const [toggleBusyUserId, setToggleBusyUserId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [userData, inviteData] = await Promise.all([
        fetchUsers(),
        fetchApprovedEmailInvites(),
      ]);
      setUsers(userData);
      setInvites(inviteData);
    } catch {
      setError('Unable to load user management right now.');
      setUsers([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) {
      return users;
    }

    const search = searchTerm.toLowerCase();
    return users.filter((entry) =>
      [
        entry.displayName,
        entry.email,
        entry.organization || '',
        entry.role,
      ].some((value) => value.toLowerCase().includes(search))
    );
  }, [searchTerm, users]);

  const buildInviteUrl = (email: string) =>
    `${window.location.origin}/#/signup?email=${encodeURIComponent(email)}`;

  const handleInviteUpsert = async (email: string) => {
    if (!user) {
      return;
    }

    setInviteBusyEmail(email);
    setError('');
    setNotice('');
    setWarning('');

    try {
      const invite = await upsertApprovedEmailInvite(email, user.uid);
      const refreshedInvites = await fetchApprovedEmailInvites();
      setInvites(refreshedInvites);

      try {
        await sendInviteEmail({
          email: invite.email,
          inviteUrl: buildInviteUrl(invite.email),
          invitedByName: user.displayName,
        });
        setNotice(`Invite email sent to ${invite.email}.`);
      } catch (emailError) {
        setWarning(
          getEmailDeliveryWarning(
            emailError,
            `Invite was saved for ${invite.email}, but the email could not be sent.`
          )
        );
      }
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : 'Unable to send invite right now.'
      );
    } finally {
      setInviteBusyEmail(null);
    }
  };

  const handleCreateInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!inviteEmail.trim()) {
      setError('Invite email is required.');
      return;
    }

    await handleInviteUpsert(inviteEmail.trim());
    setInviteEmail('');
  };

  const handleToggleUser = async (entry: AppUser) => {
    if (entry.role === UserRole.ADMIN) {
      return;
    }

    setToggleBusyUserId(entry.uid);
    setError('');
    setNotice('');
    setWarning('');

    try {
      const nextIsActive = entry.isActive !== false ? false : true;
      await updateUserActiveState(entry.uid, nextIsActive);
      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.uid === entry.uid
            ? {
                ...currentUser,
                isActive: nextIsActive,
              }
            : currentUser
        )
      );
      setNotice(
        nextIsActive
          ? `${entry.displayName} is active again.`
          : `${entry.displayName} has been deactivated.`
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : 'Unable to update user status.'
      );
    } finally {
      setToggleBusyUserId(null);
    }
  };

  return (
    <DashboardShell
      badge="Admin Users"
      title="User Management"
      description="Manage invited users, resend signup emails, and control whether a user can continue logging in and booking rooms."
      userLabel={user?.displayName || user?.email}
      navItems={getAdminDashboardNav(location.pathname)}
      headerActions={
        <>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-red-300 hover:text-red-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-red-400 dark:hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </>
      }
    >
      {(error || warning || notice) && (
        <div
          className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
            error
              ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300'
              : warning
                ? 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300'
              : 'border border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300'
          }`}
        >
          {error || warning || notice}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Registered Users
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Admin accounts remain manual. User accounts can be deactivated to block login and new bookings.
              </p>
            </div>
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search users"
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </label>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No users found.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.2em] text-gray-400">
                  <tr>
                    <th className="pb-3">User</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Organization</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredUsers.map((entry) => {
                    const isBusy = toggleBusyUserId === entry.uid;
                    const isActive = entry.isActive !== false;
                    const adminManagedOutsideApp = entry.role === UserRole.ADMIN;

                    return (
                      <tr key={entry.uid}>
                        <td className="py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {entry.displayName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {entry.email}
                          </div>
                        </td>
                        <td className="py-4 capitalize text-gray-700 dark:text-gray-300">
                          {entry.role}
                        </td>
                        <td className="py-4 text-gray-600 dark:text-gray-300">
                          {entry.organization || 'Not provided'}
                        </td>
                        <td className="py-4">
                          {isActive ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            type="button"
                            disabled={isBusy || adminManagedOutsideApp}
                            onClick={() => void handleToggleUser(entry)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserX className="h-3.5 w-3.5" />
                            )}
                            {adminManagedOutsideApp
                              ? 'Admin managed manually'
                              : isActive
                                ? 'Deactivate'
                                : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 pb-6 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Invite Management
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Add invited user emails to the allowlist and resend invite emails when needed.
            </p>

            <form
              onSubmit={(event) => void handleCreateInvite(event)}
              className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"
            >
              <label className="sr-only" htmlFor="invite-email">
                Invite email
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="user@company.com"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
              <button
                type="submit"
                disabled={inviteBusyEmail !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-maroon px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {inviteBusyEmail === inviteEmail.trim().toLowerCase() ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MailPlus className="h-4 w-4" />
                )}
                Add invite
              </button>
            </form>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-maroon" />
            </div>
          ) : invites.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No invites created yet.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.2em] text-gray-400">
                  <tr>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Last Sent</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {invites.map((invite) => {
                    const isBusy = inviteBusyEmail === invite.email;
                    const isClaimed = Boolean(invite.claimedAt);

                    return (
                      <tr key={invite.id}>
                        <td className="py-4 font-medium text-gray-900 dark:text-white">
                          {invite.email}
                        </td>
                        <td className="py-4">
                          {isClaimed ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                              Claimed
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                              Awaiting signup
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-gray-500 dark:text-gray-400">
                          {formatDateTime(invite.lastSentAt)}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            type="button"
                            disabled={isBusy || isClaimed}
                            onClick={() => void handleInviteUpsert(invite.email)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-brand-maroon hover:text-brand-maroon disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-300 dark:hover:text-red-200"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Resend
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
};

export default AdminUsersPage;
