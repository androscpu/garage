import { useQuery, useMutation, useQueryClient } from '@tantml:react-query'
import { bookingsAPI } from '../lib/api'
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const Bookings = () => {
  const queryClient = useQueryClient()
  
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsAPI.getBookings(),
  })

  const confirmMutation = useMutation({
    mutationFn: (id: number) => bookingsAPI.confirmBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Booking confirmed!')
    },
    onError: () => toast.error('Failed to confirm booking'),
  })

  const checkInMutation = useMutation({
    mutationFn: (id: number) => bookingsAPI.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Guest checked in!')
    },
    onError: () => toast.error('Failed to check in'),
  })

  const checkOutMutation = useMutation({
    mutationFn: (id: number) => bookingsAPI.checkOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Guest checked out!')
    },
    onError: () => toast.error('Failed to check out'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => bookingsAPI.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Booking cancelled')
    },
    onError: () => toast.error('Failed to cancel booking'),
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      checked_in: 'bg-green-100 text-green-800',
      checked_out: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading bookings...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          New Booking
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Booking Ref
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Room
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check-in
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check-out
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings && bookings.length > 0 ? (
              bookings.map((booking: any) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {booking.booking_reference}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Room {booking.room_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(booking.check_in_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(booking.check_out_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${booking.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => confirmMutation.mutate(booking.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Confirm"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => checkInMutation.mutate(booking.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Check In"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    {booking.status === 'checked_in' && (
                      <button
                        onClick={() => checkOutMutation.mutate(booking.id)}
                        className="text-orange-600 hover:text-orange-900"
                        title="Check Out"
                      >
                        <Clock className="w-5 h-5" />
                      </button>
                    )}
                    {booking.status !== 'cancelled' && booking.status !== 'checked_out' && (
                      <button
                        onClick={() => cancelMutation.mutate(booking.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Cancel"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                  No bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Bookings
