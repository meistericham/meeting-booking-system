import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import {
  fetchRooms,
  createRoom,
  deleteRoom,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchArchiveCandidatesByMonth,
  fetchArchiveCandidatesByCutoffDays,
  archiveBookingsBulk,
} from '../services/dataService';
import { Booking, Room, User, UserInvite } from '../types';
import { Trash2, Plus, Monitor, Users, Settings2, Building, Archive } from 'lucide-react';
import { useAuth } from '../services/authContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import UserManagementTable from '../components/UserManagementTable';
import UnitManagement from '../components/UnitManagement';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'rooms' | 'users' | 'units'>('rooms');

  // Archiving (Super Admin)
  const [isArchiveMonthOpen, setIsArchiveMonthOpen] = useState(false);
  const [isArchive5DaysOpen, setIsArchive5DaysOpen] = useState(false);
  const [archiveYear, setArchiveYear] = useState(new Date().getFullYear());
  const [archiveMonth, setArchiveMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [archivePreview, setArchivePreview] = useState<Booking[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveConfirmText, setArchiveConfirmText] = useState('');
  const [archiveMessage, setArchiveMessage] = useState<string>('');

  
  // Rooms State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(5);

  // Users State
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    if (activeTab === 'rooms') {
      const roomData = await fetchRooms();
      setRooms(roomData);
    } else if (activeTab === 'users') {
      const userData = await fetchUsers();
      setUsers(userData);
    }
    // Units component loads its own data
  };

  const archivedBy = user?.uid || user?.email || 'system';

  const previewArchiveByMonth = async () => {
    setArchiveLoading(true);
    setArchiveMessage('');
    try {
      const list = await fetchArchiveCandidatesByMonth({ year: archiveYear, month: archiveMonth });
      setArchivePreview(list);
      setArchiveMessage(`Preview: ${list.length} bookings will be archived.`);
    } catch (e: any) {
      setArchiveMessage(e?.message || 'Failed to load preview.');
    } finally {
      setArchiveLoading(false);
    }
  };

  const runArchiveByMonth = async () => {
    if (archiveConfirmText.trim().toUpperCase() !== 'ARCHIVE') {
      setArchiveMessage('Type ARCHIVE to confirm.');
      return;
    }

    setArchiveLoading(true);
    setArchiveMessage('');
    try {
      const ids = archivePreview.map((b) => b.id);
      const res = await archiveBookingsBulk({ bookingIds: ids, archivedBy, archivedReason: 'MANUAL_MONTH' });
      setArchiveMessage(`Done. Archived ${res.updated} bookings.`);
      setArchivePreview([]);
      setArchiveConfirmText('');
    } catch (e: any) {
      setArchiveMessage(e?.message || 'Failed to archive bookings.');
    } finally {
      setArchiveLoading(false);
    }
  };

  const previewArchive5Days = async () => {
    setArchiveLoading(true);
    setArchiveMessage('');
    try {
      const list = await fetchArchiveCandidatesByCutoffDays({ days: 5 });
      setArchivePreview(list);
      setArchiveMessage(`Preview: ${list.length} bookings ended > 5 days ago will be archived.`);
    } catch (e: any) {
      setArchiveMessage(e?.message || 'Failed to load preview.');
    } finally {
      setArchiveLoading(false);
    }
  };

  const runArchive5Days = async () => {
    if (archiveConfirmText.trim().toUpperCase() !== 'ARCHIVE') {
      setArchiveMessage('Type ARCHIVE to confirm.');
      return;
    }

    setArchiveLoading(true);
    setArchiveMessage('');
    try {
      const ids = archivePreview.map((b) => b.id);
      const res = await archiveBookingsBulk({ bookingIds: ids, archivedBy, archivedReason: 'MANUAL_5_DAYS' });
      setArchiveMessage(`Done. Archived ${res.updated} bookings.`);
      setArchivePreview([]);
      setArchiveConfirmText('');
    } catch (e: any) {
      setArchiveMessage(e?.message || 'Failed to archive bookings.');
    } finally {
      setArchiveLoading(false);
    }
  };

  // --- Room Handlers ---
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRoom: Room = {
      id: `r-${Date.now()}`,
      name: newRoomName,
      capacity: newRoomCapacity,
      equipment: ['Standard Setup'],
      // Use a stable default image (avoid random placeholders)
      imageUrl: '/stb-logo.png'
    };
    await createRoom(newRoom);
    setNewRoomName('');
    setShowAddRoomModal(false);
    loadData();
  };

  const handleDeleteRoom = async (id: string) => {
    // REMOVED confirm() check
    // if (confirm("Are you sure? This will not delete historical bookings associated with this room ID.")) {
      await deleteRoom(id);
      loadData();
    // }
  };

  // --- User Handlers ---
  const handleUpdateUser = async (user: User) => {
    await updateUser(user);
    loadData();
  };

  const handleDeleteUser = async (email: string) => {
    await deleteUser(email);
    loadData();
  };

  const sendInviteEmail = async (user: UserInvite) => {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined;
    const apiKey = import.meta.env.VITE_N8N_API_KEY as string | undefined;

    if (!webhookUrl || !apiKey) {
      logger.error('Missing n8n configuration');
      return;
    }

    const inviteLink = `${window.location.origin}/#/setup-password?email=${encodeURIComponent(user.email)}`;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        link: inviteLink
      })
    });

    if (!response.ok) {
      throw new Error(`Invite webhook failed with status ${response.status}`);
    }
  };

  const handleAddUser = async (user: UserInvite) => {
    await createUser(user);
    try {
      await sendInviteEmail(user);
      alert('User created & Invitation sent successfully.');
    } catch (error) {
      logger.error('Failed to send invite email:', error);
      alert('User created, but invitation email failed to send.');
    }
    loadData();
  };

  return (
    <div className="space-y-8">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage rooms, users, and global configurations.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'rooms' 
              ? 'border-purple-600 text-purple-600 dark:text-purple-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Monitor className="w-4 h-4" /> Room Management
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'users' 
              ? 'border-purple-600 text-purple-600 dark:text-purple-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Users className="w-4 h-4" /> User Management
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'units' 
              ? 'border-purple-600 text-purple-600 dark:text-purple-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Building className="w-4 h-4" /> Units / Divisions
        </button>
      </div>

      {activeTab === 'rooms' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                <Monitor className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Rooms
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowAddRoomModal(true)}
                  icon={<Plus className="w-4 h-4" />}
                  className="text-sm"
                >
                  Add Room
                </Button>
              </div>
            </div>

          <div className="grid gap-4">
            {rooms.map(room => (
              <div key={room.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-lg hover:border-purple-200 dark:hover:border-purple-900 transition-colors bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden">
                    <img src={room.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{room.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">ID: {room.id} • Cap: {room.capacity}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteRoom(room.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
        </div>
      )}

      {activeTab === 'users' && (
        <UserManagementTable 
          users={users}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
          onAddUser={handleAddUser}
        />
      )}

      {activeTab === 'units' && (
        <UnitManagement />
      )}

            {/* Add Room Modal */}
      <Modal 
        isOpen={showAddRoomModal} 
        onClose={() => setShowAddRoomModal(false)} 
        title="Add New Room"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleAddRoom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room Name</label>
            <input 
              type="text" 
              required
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-yellow-400"
              placeholder="e.g. Orion Hall"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
            <input 
              type="number" 
              required
              min="1"
              value={newRoomCapacity}
              onChange={e => setNewRoomCapacity(parseInt(e.target.value))}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="ghost"
              onClick={() => setShowAddRoomModal(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
            >
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminDashboard;
