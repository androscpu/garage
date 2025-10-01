import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../lib/api'
import { 
  Bed, 
  Calendar, 
  DollarSign, 
  Sparkles, 
  TrendingUp,
  Users,
  CheckCircle,
  Clock
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardAPI.getStats,
  })

  const { data: revenueData } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: () => dashboardAPI.getRevenueChart(30),
  })

  const { data: occupancyData } = useQuery({
    queryKey: ['occupancy-chart'],
    queryFn: () => dashboardAPI.getOccupancyChart(14),
  })

  const { data: upcomingCheckins } = useQuery({
    queryKey: ['upcoming-checkins'],
    queryFn: dashboardAPI.getUpcomingCheckins,
  })

  const { data: upcomingCheckouts } = useQuery({
    queryKey: ['upcoming-checkouts'],
    queryFn: dashboardAPI.getUpcomingCheckouts,
  })

  const statCards = [
    {
      name: 'Total Rooms',
      value: stats?.total_rooms || 0,
      icon: Bed,
      color: 'bg-blue-500',
      subValue: `${stats?.available_rooms || 0} available`,
    },
    {
      name: 'Occupancy Rate',
      value: `${stats?.occupancy_rate || 0}%`,
      icon: TrendingUp,
      color: 'bg-green-500',
      subValue: `${stats?.occupied_rooms || 0} occupied`,
    },
    {
      name: 'Today\'s Revenue',
      value: `$${stats?.total_revenue_today?.toFixed(2) || 0}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      subValue: `${stats?.total_bookings_today || 0} bookings`,
    },
    {
      name: 'Housekeeping Tasks',
      value: stats?.pending_housekeeping_tasks || 0,
      icon: Sparkles,
      color: 'bg-orange-500',
      subValue: 'Pending tasks',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-600">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600 mt-1">{stat.name}</p>
              <p className="text-xs text-gray-500 mt-2">{stat.subValue}</p>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Occupancy Rate (Last 14 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={occupancyData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="occupancy_rate" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming Check-ins/Check-outs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-ins */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Today's Check-ins</h2>
          </div>
          <div className="space-y-3">
            {upcomingCheckins && upcomingCheckins.length > 0 ? (
              upcomingCheckins.slice(0, 5).map((booking: any) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Booking #{booking.booking_reference}</p>
                    <p className="text-sm text-gray-600">Room {booking.room_id}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(booking.check_in_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No check-ins scheduled for today</p>
            )}
          </div>
        </div>

        {/* Check-outs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-orange-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Today's Check-outs</h2>
          </div>
          <div className="space-y-3">
            {upcomingCheckouts && upcomingCheckouts.length > 0 ? (
              upcomingCheckouts.slice(0, 5).map((booking: any) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Booking #{booking.booking_reference}</p>
                    <p className="text-sm text-gray-600">Room {booking.room_id}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(booking.check_out_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No check-outs scheduled for today</p>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg shadow p-6 text-white">
        <h2 className="text-lg font-semibold mb-2">This Month's Revenue</h2>
        <p className="text-4xl font-bold">${stats?.total_revenue_month?.toFixed(2) || 0}</p>
        <p className="text-indigo-200 mt-2">Keep up the great work!</p>
      </div>
    </div>
  )
}

export default Dashboard
