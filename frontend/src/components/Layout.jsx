import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, FileText, Activity, AlertCircle, Users, LogOut, User, Globe } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Badge from './ui/Badge'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, hasPermission } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const baseNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'National View', href: '/national', icon: Globe },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Contracts', href: '/contracts', icon: FileText },
    { name: 'Monitoring', href: '/monitoring', icon: Activity },
    { name: 'Alerts', href: '/alerts', icon: AlertCircle },
  ]

  const navigation = hasPermission('admin')
    ? [...baseNavigation, { name: 'Admin', href: '/admin', icon: Users }]
    : baseNavigation

  const roleLabels = {
    admin: 'System Administrator',
    regional_manager: 'Regional Manager',
    national_viewer: 'National Viewer',
  }

  const roleVariants = {
    admin: 'danger',
    regional_manager: 'warning',
    national_viewer: 'info',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-blue-600">DIPCMT-DSS</h1>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/' && location.pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">{user.full_name}</div>
                    <div className="flex items-center gap-2 justify-end">
                      <Badge variant={roleVariants[user.role]} className="text-xs">
                        {roleLabels[user.role]}
                      </Badge>
                      {user.region_name && (
                        <span className="text-xs text-slate-500">{user.region_name}</span>
                      )}
                    </div>
                  </div>
                  <User className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
