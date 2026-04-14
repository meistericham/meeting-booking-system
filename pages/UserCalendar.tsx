import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/authContext';
import { fetchRooms, fetchBookings, fetchUnits, fetchUsers } from '../services/dataService';
import { Room, Booking, Unit, User } from '../types';
import { CalendarRange } from 'lucide-react';
import RoomAvailability from '../components/RoomAvailability';
import Modal from '../components/ui/Modal';
import BookingForm from '../components/BookingForm';

const UserCalendar = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]); 
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    setLoading(true);
    const [roomsData, bookingsData, unitsData, usersData] = await Promise.all([fetchRooms(), fetchBookings(), fetchUnits(), fetchUsers()]);
    setRooms(roomsData);
    setAllBookings(bookingsData);
    setUnits(unitsData);
    setUsers(usersData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler: When user clicks an empty slot in the calendar
  const handleSlotClick = (dateStr: string, roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
        setSelectedDate(dateStr);
        setSelectedRoom(room); // Triggers Modal
    }
  };

  const handleBookingSuccess = () => {
    setSelectedRoom(null);
    loadData(); // Refresh data to show new booking
    alert("Booking submitted successfully!");
  };

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading availability...</div>;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <CalendarRange className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Availability Calendar</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 ml-1">
            Check room schedules and book available slots. Red slots are occupied, Blue slots are your bookings.
        </p>
      </header>

      {/* --- Calendar Section with Privacy Mode Enabled --- */}
      <RoomAvailability
        rooms={rooms}
        bookings={allBookings}
        allUsers={users}
        onDateSelect={handleSlotClick}
        currentUserId={user?.uid}
      />

      {/* Booking Modal */}
      <Modal
        isOpen={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        title={selectedRoom ? `Book ${selectedRoom.name}` : 'Book Room'}
      >
        {selectedRoom && user && (
          <BookingForm 
            user={user}
            room={selectedRoom}
            units={units}
            existingBookings={allBookings}
            initialDate={selectedDate}
            onSuccess={handleBookingSuccess}
            onCancel={() => setSelectedRoom(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default UserCalendar;