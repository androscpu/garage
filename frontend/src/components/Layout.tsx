import { Outlet, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Calendar, 
  Bed, 
  Sparkles, 
  CreditCard, 
  Phone,
  LogOut 
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const Layout = () => {
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Bookings', href: '/bookings', icon: Calendar },
    { name: 'Rooms', href: '/rooms', icon: Bed },
    { name: 'Housekeeping', href: '/housekeeping', icon: Sparkles },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Phone System', href: '/phone', icon: Phone },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-indigo-900 text-white">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 bg-indigo-950 px-4">
            <h1 className="text-xl font-bold">CloudHotel PMS</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-800 text-white'
                      : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-4 bg-indigo-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{user?.full_name || user?.username}</p>
                <p className="text-xs text-indigo-300">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-indigo-900 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
