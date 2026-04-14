import React, { useMemo } from 'react';
import { Booking, Room, BookingStatus } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { TrendingUp, Users, Activity, Building } from 'lucide-react';
import Card from './ui/Card';

interface DashboardAnalyticsProps {
  bookings: Booking[];
  rooms: Room[];
}

const COLORS = ['#8a1c22', '#fbbf24', '#1f1f1f', '#b45309', '#6b7280', '#9ca3af'];

const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({ bookings, rooms }) => {
  
  // --- Data Processing ---
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Filter for Current Month & Approved/Completed Bookings
    const activeBookings = bookings.filter(b => {
      const d = new Date(b.startTime);
      return d.getMonth() === currentMonth && 
             d.getFullYear() === currentYear &&
             (b.status === BookingStatus.APPROVED || b.status === BookingStatus.BLOCKED);
    });

    // 2. KPI: Total Bookings
    const totalBookings = activeBookings.length;

    // 3. KPI: Utilization Rate
    // Formula: Total Duration / (Num Rooms * 22 Working Days * 9 Hours)
    const totalDurationHours = activeBookings.reduce((acc, curr) => {
      return acc + (curr.endTime - curr.startTime) / (1000 * 60 * 60);
    }, 0);
    
    // Estimate Capacity: 9 hours/day (8am-5pm), ~22 days/month
    const maxCapacityHours = rooms.length * 22 * 9; 
    const utilizationRate = maxCapacityHours > 0 
      ? Math.round((totalDurationHours / maxCapacityHours) * 100) 
      : 0;

    // 4. Data for Bar Chart (Room Popularity)
    const roomData = rooms.map(room => {
      const count = activeBookings.filter(b => b.roomId === room.id).length;
      return { name: room.name.split(' ')[0], full_name: room.name, count }; // Short name for X-Axis
    }).sort((a, b) => b.count - a.count); // Sort desc

    // 5. Data for Pie Chart (Department Breakdown)
    const deptMap: Record<string, number> = {};
    activeBookings.forEach(b => {
      const unitName = b.unit || 'Unknown'; // Fallback
      deptMap[unitName] = (deptMap[unitName] || 0) + 1;
    });

    const deptData = Object.keys(deptMap).map(key => ({
      name: key,
      value: deptMap[key]
    })).sort((a, b) => b.value - a.value).slice(0, 6); // Top 6 only to keep chart clean

    // 6. KPI: Most Active Dept
    const topDept = deptData.length > 0 ? deptData[0].name : 'N/A';

    return {
      totalBookings,
      utilizationRate,
      topDept,
      roomData,
      deptData
    };
  }, [bookings, rooms]);

  return (
    <div className="space-y-6">
      
      {/* Section A: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {/* Total Bookings */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between h-full">
           <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Bookings (This Month)</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalBookings}</h3>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                 <TrendingUp className="w-3 h-3" /> Active requests
              </p>
           </div>
           <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
           </div>
        </div>

        {/* Utilization Rate */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between h-full">
           <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Utilization Rate</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.utilizationRate}%</h3>
              <p className="text-xs text-gray-500 mt-2">
                 Based on business hours
              </p>
           </div>
           <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
           </div>
        </div>

        {/* Top Department */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between h-full">
           <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Most Active Dept</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate max-w-[180px]" title={stats.topDept}>
                  {stats.topDept}
              </h3>
              <p className="text-xs text-brand-maroon mt-2">
                 Top Booker
              </p>
           </div>
           <div className="p-3 bg-yellow-50 rounded-lg">
              <Building className="w-6 h-6 text-brand-maroon" />
           </div>
        </div>
      </div>

      {/* Section B & C: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Room Popularity */}
        <Card className="min-h-[320px] lg:col-span-2 flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" /> Room Popularity
            </h3>
            <div className="flex-grow w-full h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.roomData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="#9ca3af" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                        />
                        <YAxis 
                            stroke="#9ca3af" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            allowDecimals={false}
                        />
                        <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar 
                            dataKey="count" 
                            fill="#8a1c22" 
                            radius={[4, 4, 0, 0]} 
                            barSize={40}
                            name="Bookings"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        {/* Department Breakdown */}
        <Card className="min-h-[320px] lg:col-span-1 flex flex-col">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-gray-400" /> Department Breakdown
            </h3>
            <div className="flex-grow w-full h-64 sm:h-80 flex items-center justify-center">
                 {stats.deptData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats.deptData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {stats.deptData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36} 
                                iconType="circle"
                                formatter={(value) => <span className="text-sm text-gray-600 dark:text-gray-300 ml-1">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                 ) : (
                    <p className="text-gray-400 italic">No data available yet</p>
                 )}
            </div>
        </Card>

      </div>
    </div>
  );
};

export default DashboardAnalytics;
