import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    const response = await api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  register: async (data: any) => {
    const response = await api.post('/api/auth/register', data)
    return response.data
  },
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me')
    return response.data
  },
}

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await api.get('/api/dashboard/stats')
    return response.data
  },
  getRevenueChart: async (days: number = 30) => {
    const response = await api.get(`/api/dashboard/revenue-chart?days=${days}`)
    return response.data
  },
  getOccupancyChart: async (days: number = 30) => {
    const response = await api.get(`/api/dashboard/occupancy-chart?days=${days}`)
    return response.data
  },
  getUpcomingCheckins: async () => {
    const response = await api.get('/api/dashboard/upcoming-checkins')
    return response.data
  },
  getUpcomingCheckouts: async () => {
    const response = await api.get('/api/dashboard/upcoming-checkouts')
    return response.data
  },
}

// Rooms API
export const roomsAPI = {
  getRooms: async (params?: any) => {
    const response = await api.get('/api/rooms', { params })
    return response.data
  },
  getRoom: async (id: number) => {
    const response = await api.get(`/api/rooms/${id}`)
    return response.data
  },
  createRoom: async (data: any) => {
    const response = await api.post('/api/rooms', data)
    return response.data
  },
  updateRoom: async (id: number, data: any) => {
    const response = await api.put(`/api/rooms/${id}`, data)
    return response.data
  },
  getAvailableRooms: async (checkIn: string, checkOut: string) => {
    const response = await api.get('/api/rooms/available', {
      params: { check_in: checkIn, check_out: checkOut },
    })
    return response.data
  },
}

// Bookings API
export const bookingsAPI = {
  getBookings: async (params?: any) => {
    const response = await api.get('/api/bookings', { params })
    return response.data
  },
  getBooking: async (id: number) => {
    const response = await api.get(`/api/bookings/${id}`)
    return response.data
  },
  createBooking: async (data: any) => {
    const response = await api.post('/api/bookings', data)
    return response.data
  },
  updateBooking: async (id: number, data: any) => {
    const response = await api.put(`/api/bookings/${id}`, data)
    return response.data
  },
  confirmBooking: async (id: number) => {
    const response = await api.post(`/api/bookings/${id}/confirm`)
    return response.data
  },
  checkIn: async (id: number) => {
    const response = await api.post(`/api/bookings/${id}/check-in`)
    return response.data
  },
  checkOut: async (id: number) => {
    const response = await api.post(`/api/bookings/${id}/check-out`)
    return response.data
  },
  cancelBooking: async (id: number) => {
    const response = await api.post(`/api/bookings/${id}/cancel`)
    return response.data
  },
}

// Housekeeping API
export const housekeepingAPI = {
  getTasks: async (params?: any) => {
    const response = await api.get('/api/housekeeping/tasks', { params })
    return response.data
  },
  getPendingTasks: async () => {
    const response = await api.get('/api/housekeeping/tasks/pending')
    return response.data
  },
  createTask: async (data: any) => {
    const response = await api.post('/api/housekeeping/tasks', data)
    return response.data
  },
  assignTask: async (taskId: number, userId: number) => {
    const response = await api.post(`/api/housekeeping/tasks/${taskId}/assign`, { user_id: userId })
    return response.data
  },
  startTask: async (taskId: number) => {
    const response = await api.post(`/api/housekeeping/tasks/${taskId}/start`)
    return response.data
  },
  completeTask: async (taskId: number, notes?: string) => {
    const response = await api.post(`/api/housekeeping/tasks/${taskId}/complete`, { notes })
    return response.data
  },
  verifyTask: async (taskId: number) => {
    const response = await api.post(`/api/housekeeping/tasks/${taskId}/verify`)
    return response.data
  },
  getWorkload: async () => {
    const response = await api.get('/api/housekeeping/workload')
    return response.data
  },
}

// Payments API
export const paymentsAPI = {
  getPayments: async (params?: any) => {
    const response = await api.get('/api/payments', { params })
    return response.data
  },
  createPayment: async (data: any) => {
    const response = await api.post('/api/payments', data)
    return response.data
  },
  confirmPayment: async (id: number) => {
    const response = await api.post(`/api/payments/${id}/confirm`)
    return response.data
  },
  refundPayment: async (id: number, amount?: number, reason?: string) => {
    const response = await api.post(`/api/payments/${id}/refund`, { amount, reason })
    return response.data
  },
}

// 3CX Phone API
export const phoneAPI = {
  makeCall: async (fromExtension: string, toNumber: string) => {
    const response = await api.post('/api/3cx/calls/make', { from_extension: fromExtension, to_number: toNumber })
    return response.data
  },
  transferCall: async (callId: string, toExtension: string) => {
    const response = await api.post('/api/3cx/calls/transfer', { call_id: callId, to_extension: toExtension })
    return response.data
  },
  getActiveCalls: async () => {
    const response = await api.get('/api/3cx/calls/active')
    return response.data
  },
  getCallHistory: async (params?: any) => {
    const response = await api.get('/api/3cx/calls/history', { params })
    return response.data
  },
  getRoomExtension: async (roomNumber: string) => {
    const response = await api.get(`/api/3cx/rooms/${roomNumber}/extension`)
    return response.data
  },
  setPresence: async (extension: string, status: string) => {
    const response = await api.post('/api/3cx/presence', { extension, status })
    return response.data
  },
}
