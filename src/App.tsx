import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Pending from './pages/Pending'
import Users from './pages/Users'
import ActiveJobs from './pages/ActiveJobs'
import ImportJobs from './pages/ImportJobs'
import Dashboard from './pages/Dashboard'
import { Button } from './components/ui/button'
import { LogOut, User, Menu, X, Briefcase, Upload, Users as UsersIcon, Loader2, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react'
import { useState, useEffect, type ReactNode } from 'react'
import Settings from './pages/Settings'
import SharedDashboard from './pages/SharedDashboard'
import { Toaster, toast } from 'sonner'
import { supabase } from './lib/supabaseClient'

function Sidebar() {
  const { profile } = useAuth()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(true)

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { path: '/active-jobs', label: 'Active Jobs', icon: Briefcase, adminOnly: false },
    { path: '/settings', label: 'Settings', icon: SettingsIcon, adminOnly: false },
    { path: '/users', label: 'User', icon: UsersIcon, adminOnly: true },
    { path: '/import-jobs', label: 'Import Jobs', icon: Upload, adminOnly: true },
  ]

  const filteredNavItems = navItems.filter(item => !item.adminOnly || profile?.role === 'admin')

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border shadow-sm"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r shadow-sm transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 w-64 flex flex-col`}
      >
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">FM Logistics Services</h1>
          <p className="text-sm text-gray-500">{profile?.role === 'admin' ? 'Admin Portal' : 'Employee Portal'}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || 'User'}</p>

              {profile?.contact_number && <p className="text-xs text-gray-600 truncate">{profile.contact_number}</p>}
              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

function LogoutButton() {
  const { signOut } = useAuth()
  return (
    <Button onClick={signOut} variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  )
}

// Global Loader with Safety Timeout
function GlobalLoader() {
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false)

  // Show message if loading takes > 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowLongWaitMessage(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {showLongWaitMessage && (
        <div className="text-center animate-in fade-in">
          <p className="text-sm text-muted-foreground mb-2">Taking longer than expected...</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      )}
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <GlobalLoader />

  if (!session) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()

  if (loading) return <GlobalLoader />

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

import { registerPushNotifications } from './lib/pushNotifications'

function DashboardLayout() {
  const { profile, loading } = useAuth()

  useEffect(() => {
    if (profile?.id) {
      registerPushNotifications(profile.id)
    }

    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs' },
        (payload: any) => {
          console.log("Realtime Payload:", payload) // Debugging
          if ((payload.old && payload.new && payload.old.status !== payload.new.status) || (payload.eventType === 'UPDATE')) {
            // Fallback: If old is missing (due to config), just assume it's an update we care about if status is present
            const oldStatus = payload.old?.status ? payload.old.status.replace('_', ' ').toUpperCase() : 'PREVIOUS'
            const newStatus = payload.new.status.replace('_', ' ').toUpperCase()

            // In-App Toast
            toast.info('Status Updated', {
              description: `${payload.new.company_name}: ${oldStatus} -> ${newStatus}`,
              duration: 5000,
            })

            // Trigger Web Push (Backend)
            // This ensures notification is sent even if app is backgrounded/closed on mobile
            fetch('/api/send-push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `Job Update: ${payload.new.lot_number || 'Unknown Lot'}`,
                body: `${payload.new.company_name} is now ${newStatus}`,
                url: '/dashboard'
              })
            }).catch(err => console.error("Failed to trigger push:", err));
          }
        }
      )
      .subscribe()

    // Request permission on load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(e => console.error("Permission request failed", e))
    }

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) return <GlobalLoader />

  if (profile?.status === 'pending') return <Navigate to="/pending" replace />

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 min-h-screen">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/active-jobs" element={<ActiveJobs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
          <Route path="/import-jobs" element={<AdminRoute><ImportJobs /></AdminRoute>} />
        </Routes>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/shared/:token" element={<SharedDashboard />} />
        <Route path="/pending" element={<RequireAuth><Pending /></RequireAuth>} />
        <Route path="/*" element={<RequireAuth><DashboardLayout /></RequireAuth>} />
      </Routes>
    </AuthProvider>
  )
}

export default App
