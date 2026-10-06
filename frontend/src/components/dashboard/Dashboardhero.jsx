import { Link } from 'react-router-dom'
import { Droplets, TrendingUp, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

export function DashboardHero() {
  return (
    <section className="dss-hero">
      <span className="dss-hero-tag">
        <Droplets size={16} /> Digital Irrigation Project Monitoring
      </span>
      <h2>
        Building irrigation infrastructure
        <span>on time, on budget, on record.</span>
      </h2>
      <p>
        Track construction progress, contracts, milestones and field issues for every
        irrigation project, and get early warning before a project falls behind.
      </p>
      <div className="dss-hero-actions">
        <Link to="/projects" className="dss-btn dss-btn-light">View projects</Link>
        <Link to="/alerts" className="dss-btn dss-btn-ghost">Check alerts</Link>
      </div>
    </section>
  )
}

// Pass the numbers you already compute on the dashboard
export function StatCards({ total = 0, onTrack = 0, delayed = 0, critical = 0 }) {
  const items = [
    { label: 'Total Projects', value: total, cls: 'is-total', Icon: TrendingUp },
    { label: 'On Track', value: onTrack, cls: 'is-ok', Icon: CheckCircle2 },
    { label: 'Delayed', value: delayed, cls: 'is-warn', Icon: Clock },
    { label: 'Critical', value: critical, cls: 'is-bad', Icon: AlertTriangle },
  ]
  return (
    <div className="dss-stats">
      {items.map(({ label, value, cls, Icon }) => (
        <div key={label} className={`dss-stat ${cls}`}>
          <div>
            <div className="dss-stat-label">{label}</div>
            <div className="dss-stat-value">{value}</div>
          </div>
          <div className="dss-stat-icon"><Icon size={24} /></div>
        </div>
      ))}
    </div>
  )
}