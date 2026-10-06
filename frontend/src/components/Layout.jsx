import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Globe, FolderOpen, FileText, Activity,
  AlertCircle, Users, LogOut, Menu,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const BASE_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/national', label: 'National View', icon: Globe },
  { to: '/projects', label: 'Projects', icon: FolderOpen },
  { to: '/contracts', label: 'Contracts', icon: FileText },
  { to: '/monitoring', label: 'Monitoring', icon: Activity },
  { to: '/alerts', label: 'Alerts', icon: AlertCircle },
]

const ROLE_LABELS = {
  admin: 'System Administrator',
  regional_manager: 'Regional Manager',
  national_viewer: 'National Viewer',
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout, hasPermission } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Admin menu only for admins (same rule as the old layout)
  const nav = hasPermission('admin')
    ? [...BASE_NAV, { to: '/admin', label: 'Admin', icon: Users }]
    : BASE_NAV

  const current = nav.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  const displayName = user?.full_name || user?.username || ''
  const roleText = ROLE_LABELS[user?.role] || user?.role || ''

  return (
    <div className={`dss-shell ${collapsed ? 'dss-collapsed' : ''}`}>
      <aside className="dss-sidebar">
        <div className="dss-brand">
          <div className="dss-brand-mark">
  <img src="/favicon.svg" alt="DIPCMT-DSS Logo" />
</div>
          <div className="dss-brand-text">
            <div className="dss-brand-title">DIPCMT-DSS</div>
            <div className="dss-brand-sub">Irrigation Monitoring</div>
          </div>
        </div>

        <nav className="dss-nav">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `dss-link ${isActive ? 'active' : ''}`}
              title={label}
            >
              <Icon size={20} />
              <span className="dss-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dss-sidebar-foot">
          {user && (
            <div className="dss-user-chip">
              <div className="dss-avatar">{(displayName[0] || '?').toUpperCase()}</div>
              <div className="dss-user-text">
                <div className="dss-user-name">{displayName}</div>
                <div className="dss-user-role">
                  {roleText}{user.region_name ? ` · ${user.region_name}` : ''}
                </div>
              </div>
            </div>
          )}
          <button className="dss-signout" onClick={handleLogout}>
            <LogOut size={18} />
            <span className="dss-label">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="dss-main">
        <header className="dss-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="dss-icon-btn"
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1>{current ? current.label : 'DIPCMT-DSS'}</h1>
              <p>Ministry of Agriculture — Digital Irrigation Construction Monitoring</p>
            </div>
          </div>
        </header>

        <main className="dss-page">{children}</main>
      </div>
    </div>
  )
}