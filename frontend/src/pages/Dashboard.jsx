import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import api from '../api'
import Badge from '../components/ui/Badge'
import { StatCards } from '../components/dashboard/DashboardHero'

const STATUS_COLORS = {
  on_track: '#16a34a',
  delayed: '#eab308',
  critical: '#dc2626',
  completed: '#2563eb',
}

const STATUS_LABELS = {
  on_track: 'On track',
  delayed: 'Delayed',
  critical: 'Critical',
  completed: 'Completed',
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/projects/projects/'),
      api.get('/monitoring/alerts/'),
    ])
      .then(([projectsRes, alertsRes]) => {
        const projectData = projectsRes.data
        setProjects(projectData)
        setAlerts(alertsRes.data.slice(0, 5))

        const statusCounts = projectData.reduce((acc, p) => {
          acc[p.overall_status_flag] = (acc[p.overall_status_flag] || 0) + 1
          return acc
        }, {})

        const avgPhysical = projectData.reduce((sum, p) => sum + parseFloat(p.physical_status_pct || 0), 0) / projectData.length || 0
        const avgFinancial = projectData.reduce((sum, p) => sum + parseFloat(p.financial_status_pct || 0), 0) / projectData.length || 0

        setStats({
          total: projectData.length,
          onTrack: statusCounts.on_track || 0,
          delayed: statusCounts.delayed || 0,
          critical: statusCounts.critical || 0,
          completed: statusCounts.completed || 0,
          avgPhysical: avgPhysical.toFixed(1),
          avgFinancial: avgFinancial.toFixed(1),
          statusData: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
        })
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>
  }

  if (!stats) {
    return <div className="text-center py-12">Could not load the dashboard. Please refresh.</div>
  }

  return (
    <div>

      <StatCards
        total={stats.total}
        onTrack={stats.onTrack}
        delayed={stats.delayed}
        critical={stats.critical}
      />

      <div className="dss-grid-2">
        <div className="dss-panel">
          <div className="dss-panel-head">Project Status Distribution</div>
          <div className="dss-panel-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.statusData.map((d) => ({ ...d, label: STATUS_LABELS[d.name] || d.name }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="label"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dss-panel">
          <div className="dss-panel-head">Average Progress</div>
          <div className="dss-panel-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: 'Physical', value: parseFloat(stats.avgPhysical) },
                  { name: 'Financial', value: parseFloat(stats.avgFinancial) },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip />
                <Bar dataKey="value" fill="#1b6b45" radius={[8, 8, 0, 0]} barSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dss-panel" style={{ marginTop: 24 }}>
        <div className="dss-panel-head">Recent Alerts</div>
        <div className="dss-panel-body">
          {alerts.length === 0 ? (
            <p className="text-slate-500 text-sm">No recent alerts</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.alert_id}
                  className="flex items-start justify-between border-b border-slate-100 pb-3 last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          alert.severity === 'critical' ? 'danger' :
                          alert.severity === 'high' ? 'warning' :
                          alert.severity === 'medium' ? 'info' : 'default'
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900">
                        {alert.alert_type_name || 'Alert'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{alert.details}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Project: {alert.project_code || alert.project}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(alert.triggered_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link
            to="/alerts"
            className="text-sm font-medium mt-4 inline-block"
            style={{ color: '#1b6b45' }}
          >
            View all alerts →
          </Link>
        </div>
      </div>
    </div>
  )
}