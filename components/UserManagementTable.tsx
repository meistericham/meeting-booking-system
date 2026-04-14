import React, { useEffect, useState } from 'react';
import { User, UserRole, UserInvite, Unit } from '../types';
import { Edit2, Trash2, Shield, ShieldCheck, User as UserIcon, Building, CheckCircle2, Ban } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { fetchUnits, updateUser } from '../services/dataService';
import Avatar from './ui/Avatar';
import { logger } from '../utils/logger';

interface UserManagementTableProps {
  users: User[];
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (email: string) => Promise<void>;
  onAddUser: (user: UserInvite) => Promise<void>;
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({ users, onUpdateUser, onDeleteUser, onAddUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [localUsers, setLocalUsers] = useState<User[]>(users);
  
  // Form State
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    department: '',
    role: UserRole.USER,
    status: 'PENDING' as 'PENDING' | 'ACTIVE' | 'REJECTED'
  });

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setUnitsLoading(true);
        const data = await fetchUnits();
        if (!mounted) return;
        setUnits([...data].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      } catch (err) {
        // non-blocking
      } finally {
        if (mounted) setUnitsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      displayName: '',
      email: '',
      department: '',
      role: UserRole.USER,
      status: 'PENDING'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName,
      email: user.email,
      department: user.department || '',
      role: user.role,
      status: normalizeStatus(user.status)
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update existing
        await onUpdateUser({
          ...editingUser,
          ...formData
        } as User);
      } else {
        // Create new
        const trimmedEmail = formData.email.trim().toLowerCase();
        if (!trimmedEmail) {
          throw new Error('Email is required to invite a user.');
        }
        if (!formData.department) {
          throw new Error('Department is required.');
        }
        const newUser: UserInvite = {
          email: trimmedEmail,
          displayName: formData.displayName,
          department: formData.department,
          role: formData.role
        };
        await onAddUser(newUser);
      }
      setIsModalOpen(false);
    } catch (error) {
      logger.error(error);
      alert("Failed to save user");
    }
  };

  const handleDelete = async (user: User) => {
    // REMOVED confirm() check
    // if (confirm(`Are you sure you want to delete ${user.displayName}?`)) {
        await onDeleteUser(user.email);
    // }
  };

  const handleApproverToggle = async (user: User) => {
    if (user.role !== UserRole.ADMIN) return;
    const updatedUser = { ...user, canApproveUsers: !user.canApproveUsers };
    try {
      await updateUser(updatedUser);
      setLocalUsers((prev) =>
        prev.map((u) => (u.email === user.email ? { ...u, canApproveUsers: updatedUser.canApproveUsers } : u))
      );
    } catch (error) {
      logger.error(error);
      alert('Failed to update approver rights');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"><Shield className="w-3 h-3" /> Super Admin</span>;
      case UserRole.ADMIN:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"><Shield className="w-3 h-3" /> Admin</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"><UserIcon className="w-3 h-3" /> User</span>;
    }
  };

  const getStatusBadge = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'ACTIVE') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"><CheckCircle2 className="w-3 h-3" /> Active</span>;
    }
    if (normalized === 'PENDING') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"><Shield className="w-3 h-3" /> Pending</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"><Ban className="w-3 h-3" /> Rejected</span>;
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openAddModal}>+ Add User</Button>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4 font-semibold whitespace-nowrap">User</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Department</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Role</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Admin Leader?</th>
                <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {localUsers.map((user) => (
                <tr key={user.email} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} size="sm" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{user.displayName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        <Building className="w-3 h-3 text-gray-400" />
                        {user.department || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-2">
                      {getRoleBadge(user.role)}
                      {user.canApproveUsers && user.role === UserRole.ADMIN && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                          <ShieldCheck className="h-3 w-3" />
                          Leader
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.role === UserRole.ADMIN ? (
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
                          checked={!!user.canApproveUsers}
                          onChange={() => handleApproverToggle(user)}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Approver</span>
                      </label>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                            title="Edit User"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleDelete(user)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete User"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input 
              type="text" 
              required
              value={formData.displayName}
              onChange={e => setFormData({...formData, displayName: e.target.value})}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              disabled={!!editingUser} // Disable email edit for simplicity
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className={`w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400 ${editingUser ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
            <select
              value={formData.department}
              onChange={e => setFormData({ ...formData, department: e.target.value })}
              disabled={unitsLoading || units.length === 0}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400 appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {unitsLoading && <option value="">Loading units…</option>}
              {!unitsLoading && units.length === 0 && <option value="">No units defined</option>}
              {!unitsLoading && units.length > 0 && (
                <>
                  <option value="">Select department</option>
                  {units.map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </>
              )}
            </select>
            {!unitsLoading && units.length === 0 && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">No units are configured yet. Add units first under Units Management.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400 appearance-none"
                >
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.USER}>User (Staff)</option>
                </select>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as 'PENDING' | 'ACTIVE' | 'REJECTED'})}
                    className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400 appearance-none"
                    disabled={!editingUser}
                >
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default UserManagementTable;
