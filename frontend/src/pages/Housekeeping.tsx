import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { housekeepingAPI } from '../lib/api'
import { Play, CheckCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const Housekeeping = () => {
  const queryClient = useQueryClient()

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['housekeeping-tasks'],
    queryFn: () => housekeepingAPI.getTasks(),
  })

  const startMutation = useMutation({
    mutationFn: (taskId: number) => housekeepingAPI.startTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
      toast.success('Task started!')
    },
    onError: () => toast.error('Failed to start task'),
  })

  const completeMutation = useMutation({
    mutationFn: (taskId: number) => housekeepingAPI.completeTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
      toast.success('Task completed!')
    },
    onError: () => toast.error('Failed to complete task'),
  })

  const verifyMutation = useMutation({
    mutationFn: (taskId: number) => housekeepingAPI.verifyTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
      toast.success('Task verified!')
    },
    onError: () => toast.error('Failed to verify task'),
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      verified: 'bg-purple-100 text-purple-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: number) => {
    if (priority === 2) return 'text-red-600 font-bold'
    if (priority === 1) return 'text-orange-600 font-semibold'
    return 'text-gray-600'
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading tasks...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Housekeeping</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          Create Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tasks && tasks.length > 0 ? (
          tasks.map((task: any) => (
            <div key={task.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Room {task.room_id}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Task Type:</span>
                  <span className="font-medium capitalize">{task.task_type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Priority:</span>
                  <span className={getPriorityColor(task.priority)}>
                    {task.priority === 2 ? 'Urgent' : task.priority === 1 ? 'High' : 'Normal'}
                  </span>
                </div>
                {task.description && (
                  <div className="mt-2">
                    <span className="text-gray-600">Description:</span>
                    <p className="text-gray-900 mt-1">{task.description}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                {task.status === 'pending' && (
                  <button
                    onClick={() => startMutation.mutate(task.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                )}
                {task.status === 'in_progress' && (
                  <button
                    onClick={() => completeMutation.mutate(task.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete
                  </button>
                )}
                {task.status === 'completed' && (
                  <button
                    onClick={() => verifyMutation.mutate(task.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Verify
                  </button>
                )}
              </div>

              {task.started_at && (
                <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Started: {new Date(task.started_at).toLocaleString()}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-gray-500">
            No housekeeping tasks found
          </div>
        )}
      </div>
    </div>
  )
}

export default Housekeeping
