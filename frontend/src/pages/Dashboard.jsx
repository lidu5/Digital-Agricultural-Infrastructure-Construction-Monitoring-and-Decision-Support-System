import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import api from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'

const STATUS_COLORS = {
  on_track: '#16a34a',
  delayed: '#eab308',
  critical: '#dc2626',
  completed: '#2563eb',
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Projects</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.total}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">On Track</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.onTrack}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Delayed</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.delayed}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Critical</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.critical}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Physical', value: parseFloat(stats.avgPhysical) },
                { name: 'Financial', value: parseFloat(stats.avgFinancial) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-slate-500 text-sm">No recent alerts</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.alert_id} className="flex items-start justify-between border-b border-slate-100 pb-3 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        alert.severity === 'critical' ? 'danger' :
                        alert.severity === 'high' ? 'warning' :
                        alert.severity === 'medium' ? 'info' : 'default'
                      }>
                        {alert.severity}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900">{alert.alert_type_name || 'Alert'}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{alert.details}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Project: {alert.project_code || alert.project}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">{new Date(alert.triggered_date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/alerts" className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-4 inline-block">
            View all alerts →
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
