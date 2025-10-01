import { useQuery } from '@tanstack/react-query'
import { roomsAPI } from '../lib/api'
import { Bed, DoorOpen, Wrench, Sparkles } from 'lucide-react'

const Rooms = () => {
  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsAPI.getRooms(),
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <DoorOpen className="w-5 h-5 text-green-600" />
      case 'occupied':
        return <Bed className="w-5 h-5 text-blue-600" />
      case 'cleaning':
        return <Sparkles className="w-5 h-5 text-yellow-600" />
      case 'maintenance':
        return <Wrench className="w-5 h-5 text-orange-600" />
      default:
        return <Bed className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-100 text-green-800 border-green-200',
      occupied: 'bg-blue-100 text-blue-800 border-blue-200',
      cleaning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
      out_of_order: 'bg-red-100 text-red-800 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading rooms...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Rooms</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          Add Room
        </button>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {rooms && rooms.length > 0 ? (
          rooms.map((room: any) => (
            <div
              key={room.id}
              className={`border-2 rounded-lg p-6 transition-all hover:shadow-lg ${getStatusColor(room.status)}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">Room {room.room_number}</h3>
                {getStatusIcon(room.status)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Type:</span>
                  <span className="capitalize">{room.room_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Floor:</span>
                  <span>{room.floor || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Capacity:</span>
                  <span>{room.max_occupancy} guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Price:</span>
                  <span className="font-bold">${room.base_price}/night</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-current/20">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {room.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-gray-500">
            No rooms found
          </div>
        )}
      </div>
    </div>
  )
}

export default Rooms
