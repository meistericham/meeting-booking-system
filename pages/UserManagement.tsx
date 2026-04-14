import React, { useEffect, useState } from 'react';
import { useAuth } from '../services/authContext';
import { fetchUsers, updateUser } from '../services/dataService';
import { logger } from '../utils/logger';
import { User, UserRole } from '../types';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const userList = await fetchUsers();
      setUsers(userList);
    } catch (error) {
      logger.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleApprover = async (target: User) => {
    if (target.role !== UserRole.ADMIN) {
      return;
    }
    try {
      await updateUser({
        ...target,
        canApproveUsers: !target.canApproveUsers,
      });
      await loadUsers();
    } catch (error) {
      logger.error('Failed to update approver rights', error);
    }
  };

  if (!user || user.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Access restricted to Super Admins.
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Assign approver rights to Admin leaders.
        </p>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Name</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Email</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Role</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Approver Rights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((member) => (
                <tr key={member.email} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {member.displayName}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{member.email}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {member.role.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className={`inline-flex items-center gap-2 text-sm ${member.role !== UserRole.ADMIN ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      <input
                        type="checkbox"
                        checked={!!member.canApproveUsers}
                        disabled={member.role !== UserRole.ADMIN}
                        onChange={() => handleToggleApprover(member)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                      />
                      {member.role === UserRole.ADMIN ? (member.canApproveUsers ? 'Approver' : 'Standard') : 'N/A'}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
