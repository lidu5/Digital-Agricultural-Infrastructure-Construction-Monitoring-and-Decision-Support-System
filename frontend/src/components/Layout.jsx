import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Globe, FolderOpen, FileText, Activity,
  AlertCircle, Users, LogOut, PanelLeftClose, PanelLeftOpen, CalendarDays, ClipboardList,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import logo from '../assets/Moa picture.png'

const BASE_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: Globe, end: true },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/projects', label: 'Projects', icon: FolderOpen },
      { to: '/contracts', label: 'Contracts', icon: FileText },
      { to: '/monitoring', label: 'Monitoring', icon: Activity },
      { to: '/alerts', label: 'Alerts', icon: AlertCircle },
    ],
  },
]

const ADMIN_SECTION = {
  title: 'Administration',
  items: [
    { to: '/admin', label: 'Admin', icon: Users },
    { to: '/audit', label: 'Audit Trail', icon: ClipboardList },
  ],
}

const ROLE_LABELS = {
  admin: 'System Administrator',
  regional_manager: 'Regional Manager',
  national_viewer: 'National Viewer',
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('dss-collapsed') === '1')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout, hasPermission } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    localStorage.setItem('dss-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  // Admin menu only for admins (same rule as the old layout)
  const sections = hasPermission('admin') ? [...BASE_SECTIONS, ADMIN_SECTION] : BASE_SECTIONS
  const nav = sections.flatMap((s) => s.items)

  const current = nav.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  const isDetail = current && !current.end && pathname.replace(/\/$/, '') !== current.to
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
  const displayName = user?.full_name || user?.username || ''
  const roleText = ROLE_LABELS[user?.role] || user?.role || ''

  return (
    <div className={`dss-shell ${collapsed ? 'dss-collapsed' : ''}`}>
      <aside className="dss-sidebar">
        <div className="dss-brand">
          <div className="dss-brand-mark">
            <img src={logo} alt="DIPCMT-DSS Logo" />
          </div>
          <div className="dss-brand-text">
            <div className="dss-brand-title">DIPCMT-DSS</div>
            <div className="dss-brand-sub">Irrigation Monitoring</div>
          </div>
        </div>

        <nav className="dss-nav" aria-label="Main navigation">
          {sections.map((section) => (
            <div key={section.title} className="dss-section">
              <div className="dss-section-title">{section.title}</div>
              {section.items.map(({ to, label, icon: Icon, end }) => (
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
            </div>
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
          <button className="dss-signout" onClick={handleLogout} title="Sign out">
            <LogOut size={18} />
            <span className="dss-label">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="dss-main">
        <header className="dss-topbar">
          <div className="dss-topbar-left">
            <button
              className="dss-icon-btn"
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            <div className="dss-topbar-divider" />
            <div>
              <h1>
                {current ? current.label : 'DIPCMT-DSS'}
                {isDetail && <span className="dss-crumb">/ Details</span>}
              </h1>
              <p>Ministry of Agriculture — Digital Irrigation Construction Monitoring</p>
            </div>
          </div>

          <div className="dss-topbar-right">
            <span className="dss-date-chip">
              <CalendarDays size={14} />
              {today}
            </span>
            {user && (
              <div className="dss-top-user" title={`${displayName} · ${roleText}`}>
                <div className="dss-avatar dss-avatar-sm">{(displayName[0] || '?').toUpperCase()}</div>
                <span className="dss-top-user-name">{displayName}</span>
              </div>
            )}
          </div>
        </header>

        <main className="dss-page" key={pathname}>{children}</main>
      </div>
    </div>
  )
}