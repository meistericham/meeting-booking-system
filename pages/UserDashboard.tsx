import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/authContext';
import { fetchRooms, fetchBookings, fetchUnits, fetchUsers, fetchUserTickets } from '../services/dataService';
import { Room, Booking, Unit, User } from '../types';
import { Users, Monitor, Calendar as CalendarIcon, ChevronDown, ChevronUp, LifeBuoy } from 'lucide-react';
import { formatDateStandard } from '../utils';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import RoomAvailability from '../components/RoomAvailability';
import StatusBadge from '../components/StatusBadge';
import BookingForm from '../components/BookingForm';

const UserDashboard = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]); 
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasUnreadTickets, setHasUnreadTickets] = useState(false);
  
  // Modal & Selection State
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    setLoading(true);
    const [roomsData, bookingsData, unitsData, usersData] = await Promise.all([fetchRooms(), fetchBookings(), fetchUnits(), fetchUsers()]);
    setRooms(roomsData);
    setAllBookings(bookingsData);
    setMyBookings(bookingsData.filter(b => b.userId === user?.uid).sort((a, b) => b.startTime - a.startTime));
    setUnits(unitsData);
    setUsers(usersData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    const loadTickets = async () => {
      if (!user) return;
      const tickets = await fetchUserTickets(user.uid);
      setHasUnreadTickets(tickets.some(ticket => !ticket.isReadByUser));
    };
    loadTickets();
  }, [user]);

  
  // Handler for Date selection from Availability Component
  const handleAvailabilityDateSelect = (dateStr: string, roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
        setSelectedDate(dateStr);
        setSelectedRoom(room); // Triggers Modal
    }
  };

  const handleBookingSuccess = () => {
    setSelectedRoom(null);
    loadData(); // Refresh data to show new booking
    alert("Booking submitted! Waiting for Admin approval.");
  };

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading workspace data...</div>;

  const weekStart = new Date();
  const dayOfWeek = weekStart.getDay(); // 0 = Sunday
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekStartTs = weekStart.getTime();
  const weekEndTs = weekEnd.getTime();

  const pastBookings = myBookings
    .filter(bk => bk.endTime < weekStartTs)
    .sort((a, b) => b.startTime - a.startTime);

  const currentWeekBookings = myBookings
    .filter(bk => bk.startTime < weekEndTs && bk.endTime >= weekStartTs)
    .sort((a, b) => a.startTime - b.startTime);

  const upcomingBookings = myBookings
    .filter(bk => bk.startTime >= weekEndTs)
    .sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Workspace Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Find and book the perfect space for your team.</p>
        </div>
        <Link to="/support" className="relative inline-flex">
          <Button icon={<LifeBuoy className="w-4 h-4" />}>
            Help & Support
          </Button>
          {hasUnreadTickets && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
          )}
        </Link>
      </header>

      {/* --- Calendar Section --- */}
      {/* Full-bleed on mobile (override page padding) */}
      <div className="-mx-4 sm:mx-0">
        <RoomAvailability
          rooms={rooms}
          bookings={allBookings}
          allUsers={users}
          onDateSelect={handleAvailabilityDateSelect}
        />
      </div>

      {/* Available Rooms Grid */}
      <section>
        <h2 className="text-lg sm:text-xl font-semibold mb-4 flex flex-col sm:flex-row sm:items-center gap-2 text-gray-900 dark:text-white">
          <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Quick Book by Room
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map(room => (
            <Card key={room.id} noPadding className="hover:shadow-md transition-shadow">
              <div className="h-40 sm:h-48 bg-gray-200 dark:bg-gray-800 relative">
                 <img src={room.imageUrl} alt={room.name} className="w-full h-full object-cover" />
                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                   <h3 className="text-white font-bold text-lg">{room.name}</h3>
                 </div>
              </div>
              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {room.capacity} ppl</span>
                  <span className="flex items-center gap-1"><Monitor className="w-4 h-4" /> {room.equipment.length} items</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {room.equipment.map(eq => (
                    <span key={eq} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded-full">{eq}</span>
                  ))}
                </div>
                <Button 
                  onClick={() => setSelectedRoom(room)}
                  className="w-full"
                >
                  Book Now
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* My Bookings */}
      <section className="space-y-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold flex flex-col sm:flex-row sm:items-center gap-2 text-gray-900 dark:text-white">
            <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> My Requests
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Keep track of what is happening now, next, and in the past.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Happening This Week
          </h3>
          {currentWeekBookings.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 italic">No bookings this week.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentWeekBookings.map(bk => {
                const start = new Date(bk.startTime);
                const end = new Date(bk.endTime);
                return (
                  <div key={bk.id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-gray-900 dark:text-white font-medium">{bk.roomName}</div>
                      <StatusBadge status={bk.status} />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {formatDateStandard(start)} · {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {bk.purpose}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Card
          noPadding
          className="-mx-4 sm:mx-0 rounded-none shadow-none border-0 border-y border-gray-200 dark:border-gray-800 sm:rounded-xl sm:shadow-sm sm:border sm:border-gray-200 sm:dark:border-gray-700"
        >
          <div className="px-4 py-4 sm:p-6">
            <button
              type="button"
              onClick={() => setShowUpcoming(prev => !prev)}
              className="w-full flex items-center justify-between text-left"
              aria-expanded={showUpcoming}
            >
            <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Upcoming Bookings
            </span>
            <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {showUpcoming ? 'Hide' : 'Show'}
              {showUpcoming ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>
            {showUpcoming && (
              <div className="mt-4">
              {upcomingBookings.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No upcoming bookings.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingBookings.map(bk => {
                    const start = new Date(bk.startTime);
                    const end = new Date(bk.endTime);
                    return (
                      <div key={bk.id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-gray-900 dark:text-white font-medium">{bk.roomName}</div>
                          <StatusBadge status={bk.status} />
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {formatDateStandard(start)} · {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {bk.purpose}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          </div>
        </Card>

        <Card
          noPadding
          className="-mx-4 sm:mx-0 rounded-none shadow-none border-0 border-y border-gray-200 dark:border-gray-800 sm:rounded-xl sm:shadow-sm sm:border sm:border-gray-200 sm:dark:border-gray-700"
        >
          <div className="px-4 py-4 sm:p-6">
            <button
              type="button"
              onClick={() => setShowHistory(prev => !prev)}
            className="w-full flex items-center justify-between text-left"
            aria-expanded={showHistory}
          >
            <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Past History
            </span>
            <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {showHistory ? 'Hide' : 'Show'}
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>
          {showHistory && (
            <div className="mt-4">
              {pastBookings.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No past bookings.</p>
              ) : (
                <>
                  <div className="space-y-2 sm:hidden">
                    {pastBookings.map(bk => {
                      const start = new Date(bk.startTime);
                      return (
                        <div key={bk.id} className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm">
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-white font-medium">{bk.roomName}</span>
                            <span className="text-gray-500 dark:text-gray-400">{formatDateStandard(start)}</span>
                          </div>
                          <StatusBadge status={bk.status} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="hidden sm:block overflow-x-auto rounded-lg shadow border border-gray-200 dark:border-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
                          <th className="pb-2 font-medium whitespace-nowrap">Date</th>
                          <th className="pb-2 font-medium whitespace-nowrap">Room</th>
                          <th className="pb-2 font-medium whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {pastBookings.map(bk => {
                          const start = new Date(bk.startTime);
                          return (
                            <tr key={bk.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDateStandard(start)}</td>
                              <td className="py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{bk.roomName}</td>
                              <td className="py-3">
                                <StatusBadge status={bk.status} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        </Card>
      </section>

      {/* Booking Modal - Now using extracted component */}
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

export default UserDashboard;
