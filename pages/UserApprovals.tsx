import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { fetchUsers, updateUser } from '../services/dataService';
import { logger } from '../utils/logger';
import { User, UserRole } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { formatDateStandard } from '../utils';

const normalizeStatus = (status?: string) => {
  if (!status) return 'ACTIVE';
  const normalized = status.toUpperCase();
  if (normalized === 'INVITED') return 'PENDING';
  if (normalized === 'INACTIVE') return 'REJECTED';
  if (normalized === 'PENDING' || normalized === 'ACTIVE' || normalized === 'REJECTED') {
    return normalized;
  }
  return 'ACTIVE';
};

const UserApprovals: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const canApprove = user?.role === UserRole.SUPER_ADMIN || !!user?.canApproveUsers;

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const allUsers = await fetchUsers();
        setUsers(allUsers);
      } catch (error) {
        logger.error('Failed to load users', error);
      } finally {
        setLoading(false);
      }
    };

    if (canApprove) {
      loadUsers();
    }
  }, [canApprove]);

  if (!user) return null;
  if (!canApprove) return <Navigate to="/dashboard" replace />;

  const pendingUsers = users.filter((u) => normalizeStatus(u.status) === 'PENDING');

  const resolveCreatedAt = (createdAt?: unknown) => {
    if (!createdAt) return null;
    if (typeof createdAt === 'number') return new Date(createdAt);
    if (typeof createdAt === 'object' && createdAt && 'toDate' in createdAt) {
      const ts = createdAt as { toDate: () => Date };
      return ts.toDate();
    }
    return null;
  };

  const handleApprove = async (pendingUser: User) => {
    try {
      await updateUser({ ...pendingUser, status: 'ACTIVE' });
      setUsers((prev) =>
        prev.map((u) =>
          (u.id || u.uid || u.email) === (pendingUser.id || pendingUser.uid || pendingUser.email)
            ? { ...u, status: 'ACTIVE' }
            : u
        )
      );
    } catch (error) {
      logger.error(error);
      alert('Failed to approve user');
    }
  };

  const handleReject = async (pendingUser: User) => {
    try {
      await updateUser({ ...pendingUser, status: 'REJECTED' });
      setUsers((prev) =>
        prev.map((u) =>
          (u.id || u.uid || u.email) === (pendingUser.id || pendingUser.uid || pendingUser.email)
            ? { ...u, status: 'REJECTED' }
            : u
        )
      );
    } catch (error) {
      logger.error(error);
      alert('Failed to reject user');
    }
  };

  return (
    <div className="w-full">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New User Requests</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Review and approve pending user registrations.
        </p>
      </header>

      <Card noPadding>
        <div className="overflow-x-auto rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 font-semibold whitespace-nowrap">Name</th>
                <th className="px-6 py-3 font-semibold whitespace-nowrap">Email</th>
                <th className="px-6 py-3 font-semibold whitespace-nowrap">Role Requested</th>
                <th className="px-6 py-3 font-semibold whitespace-nowrap">Date Registered</th>
                <th className="px-6 py-3 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                    Loading requests...
                  </td>
                </tr>
              ) : pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                    No pending requests.
                  </td>
                </tr>
              ) : (
                pendingUsers.map((pendingUser) => {
                  const createdAt = resolveCreatedAt(pendingUser.createdAt);
                  return (
                    <tr key={pendingUser.email} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {pendingUser.displayName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {pendingUser.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 capitalize whitespace-nowrap">
                        {pendingUser.role}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {createdAt ? formatDateStandard(createdAt) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="primary"
                            onClick={() => handleApprove(pendingUser)}
                            className="text-xs"
                            icon={<CheckCircle2 className="h-4 w-4" />}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleReject(pendingUser)}
                            className="text-xs"
                            icon={<XCircle className="h-4 w-4" />}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default UserApprovals;
