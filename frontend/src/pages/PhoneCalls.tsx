import { useQuery } from '@tantml:react-query'
import { phoneAPI } from '../lib/api'
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react'

const PhoneCalls = () => {
  const { data: callHistory, isLoading } = useQuery({
    queryKey: ['call-history'],
    queryFn: () => phoneAPI.getCallHistory(),
  })

  const { data: activeCalls } = useQuery({
    queryKey: ['active-calls'],
    queryFn: () => phoneAPI.getActiveCalls(),
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  const getCallIcon = (type: string, status: string) => {
    if (status === 'missed') {
      return <PhoneMissed className="w-5 h-5 text-red-600" />
    }
    if (type.includes('incoming')) {
      return <PhoneIncoming className="w-5 h-5 text-green-600" />
    }
    return <PhoneOutgoing className="w-5 h-5 text-blue-600" />
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading call history...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">3CX Phone System</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          Make Call
        </button>
      </div>

      {/* Active Calls */}
      {activeCalls?.calls && activeCalls.calls.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-600 animate-pulse" />
            Active Calls ({activeCalls.calls.length})
          </h2>
          <div className="space-y-3">
            {activeCalls.calls.map((call: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium text-gray-900">{call.from_number || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">To: {call.to_number || 'Unknown'}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                    Transfer
                  </button>
                  <button className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                    End
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left">
          <Phone className="w-8 h-8 text-indigo-600 mb-2" />
          <p className="font-semibold text-gray-900">Make Call</p>
          <p className="text-sm text-gray-600">Initiate a new call</p>
        </button>
        <button className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left">
          <PhoneIncoming className="w-8 h-8 text-green-600 mb-2" />
          <p className="font-semibold text-gray-900">Incoming</p>
          <p className="text-sm text-gray-600">View incoming calls</p>
        </button>
        <button className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left">
          <PhoneOutgoing className="w-8 h-8 text-blue-600 mb-2" />
          <p className="font-semibold text-gray-900">Outgoing</p>
          <p className="text-sm text-gray-600">View outgoing calls</p>
        </button>
        <button className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left">
          <PhoneMissed className="w-8 h-8 text-red-600 mb-2" />
          <p className="font-semibold text-gray-900">Missed</p>
          <p className="text-sm text-gray-600">View missed calls</p>
        </button>
      </div>

      {/* Call History */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Call History</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                From
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {callHistory && callHistory.length > 0 ? (
              callHistory.map((call: any) => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCallIcon(call.call_type, call.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {call.from_extension ? `Ext ${call.from_extension}` : call.from_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {call.to_extension ? `Ext ${call.to_extension}` : call.to_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {call.duration ? formatDuration(call.duration) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      call.status === 'answered' ? 'bg-green-100 text-green-800' :
                      call.status === 'missed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(call.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  No call history found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PhoneCalls
