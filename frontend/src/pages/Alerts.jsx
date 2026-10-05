import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import api from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/Input'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [filteredAlerts, setFilteredAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    severity: '',
    status: '',
  })

  useEffect(() => {
    api.get('/monitoring/alerts/')
      .then((res) => {
        setAlerts(res.data)
        setFilteredAlerts(res.data)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let filtered = alerts

    if (filters.severity) {
      filtered = filtered.filter(a => a.severity === filters.severity)
    }

    if (filters.status) {
      filtered = filtered.filter(a => a.status === filters.status)
    }

    setFilteredAlerts(filtered)
  }, [filters, alerts])

  if (loading) {
    return <div className="text-center py-12">Loading alerts...</div>
  }

  const severityCounts = alerts.reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Alerts</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Critical</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{severityCounts.critical || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">High</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{severityCounts.high || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Medium</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{severityCounts.medium || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Low</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{severityCounts.low || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ severity: '', status: '' })}
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filteredAlerts.length} Alert{filteredAlerts.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length > 0 ? (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div key={alert.alert_id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        alert.severity === 'critical' ? 'danger' :
                        alert.severity === 'high' ? 'warning' :
                        alert.severity === 'medium' ? 'info' : 'default'
                      }>
                        {alert.severity}
                      </Badge>
                      <Badge variant={
                        alert.status === 'resolved' ? 'success' :
                        alert.status === 'acknowledged' ? 'info' : 'warning'
                      }>
                        {alert.status}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900">
                        {alert.alert_type_name || 'Alert'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(alert.triggered_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 mb-2">{alert.details}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div>
                      <span className="font-medium">Project:</span> {alert.project_code || alert.project}
                    </div>
                    {alert.contract_number && (
                      <div>
                        <span className="font-medium">Contract:</span> {alert.contract_number}
                      </div>
                    )}
                    {alert.resolved_date && (
                      <div>
                        <span className="font-medium">Resolved:</span>{' '}
                        {new Date(alert.resolved_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-12">No alerts found</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
