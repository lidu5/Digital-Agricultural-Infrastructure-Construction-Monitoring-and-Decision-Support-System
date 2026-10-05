import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, AlertTriangle, Wrench, Clock } from 'lucide-react'
import api from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'

const STATUS_VARIANTS = {
  on_track: 'success',
  delayed: 'warning',
  critical: 'danger',
  completed: 'info',
}

const STATUS_LABELS = {
  on_track: 'On Track',
  delayed: 'Delayed',
  critical: 'Critical',
  completed: 'Completed',
}

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

function fmtMoney(v) {
  return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function RegionCard({ card, isNational }) {
  const border = card.stale ? 'border-amber-400 border-2' : ''
  const burn = card.financial_burn
  const burnDelta = burn ? burn.current_period_certified - burn.previous_period_certified : null
  return (
    <Card className={border}>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${isNational ? 'text-blue-700' : 'text-slate-800'}`}>{card.name}</h3>
          {card.stale && (
            <Badge variant="warning">Stale &gt;30d</Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-slate-900 mt-1">{card.total_projects} projects</p>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {Object.entries(card.status_breakdown).map(([k, v]) => (
            <Badge key={k} variant={STATUS_VARIANTS[k]}>{v} {STATUS_LABELS[k]}</Badge>
          ))}
        </div>
        <div className="mt-3 space-y-1 text-sm text-slate-600">
          <div>Physical: <span className="font-medium text-slate-900">{card.avg_physical_pct}%</span> · Financial: <span className="font-medium text-slate-900">{card.avg_financial_pct}%</span></div>
          <div>Area: <span className="font-medium text-slate-900">{card.total_irrigable_area_ha.toLocaleString()} ha</span> · Households: <span className="font-medium text-slate-900">{card.total_beneficiaries_thh.toLocaleString()}</span></div>
          <div className={card.stale ? 'text-amber-700 font-medium' : ''}>
            Last update: {card.avg_days_since_update === null ? 'no data' : `${card.avg_days_since_update}d ago avg`}
          </div>
          {burn && (
            <div className="flex items-center gap-1 pt-1">
              Certified this month: <span className="font-medium text-slate-900">{fmtMoney(burn.current_period_certified)}</span>
              {burnDelta > 0 && <TrendingUp className="w-4 h-4 text-green-600" />}
              {burnDelta < 0 && <TrendingDown className="w-4 h-4 text-red-600" />}
              <span className="text-xs text-slate-400">(prev {fmtMoney(burn.previous_period_certified)})</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function NationalDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ region: '', status: '', techSupport: false, staleOnly: false })
  const [savingPriority, setSavingPriority] = useState(null)

  const load = () => {
    api.get('/monitoring/national-dashboard/')
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filteredProjects = useMemo(() => {
    if (!data) return []
    return data.projects
      .filter((p) => !filters.region || String(p.region_id) === filters.region)
      .filter((p) => !filters.status || p.status === filters.status)
      .filter((p) => !filters.techSupport || p.technical_support_required)
      .filter((p) => !filters.staleOnly || p.days_stale === null || p.days_stale > 30)
      .sort((a, b) => b.risk_score - a.risk_score)
  }, [data, filters])

  const handlePriorityChange = async (projectId, value) => {
    setSavingPriority(projectId)
    try {
      await api.patch(`/projects/projects/${projectId}/`, { priority_level: value })
      setData((d) => ({
        ...d,
        projects: d.projects.map((p) => p.project_id === projectId ? { ...p, priority_level: value } : p),
      }))
    } catch (err) {
      console.error('Failed to update priority', err)
      alert('Failed to update priority level')
    } finally {
      setSavingPriority(null)
    }
  }

  if (loading) return <div className="text-center py-12">Loading national dashboard...</div>
  if (!data) return <div className="text-center py-12 text-slate-500">Failed to load dashboard data.</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">National Overview</h1>

      {/* 1. Region comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <RegionCard card={data.national_card} isNational />
        {data.region_cards.map((c) => <RegionCard key={c.region_id} card={c} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Top 5 at-risk projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Top 5 At-Risk Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.at_risk_projects.length === 0 ? (
              <p className="text-sm text-slate-500">No projects</p>
            ) : (
              <div className="space-y-3">
                {data.at_risk_projects.map((p, i) => (
                  <div key={p.project_id} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
                    <span className="text-lg font-bold text-slate-300 w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Link to={`/projects/${p.project_id}`} className="text-sm font-medium text-blue-600 hover:underline">
                        {p.project_code} — {p.project_name}
                      </Link>
                      <p className="text-xs text-slate-500">{p.region_name}</p>
                      <div className="flex gap-3 text-xs mt-1">
                        <span className="text-red-600">gap {p.gap_pct}%</span>
                        <span className="text-amber-600">{p.days_stale === null ? 'never updated' : `${p.days_stale}d stale`}</span>
                        {p.technical_support_required && <Wrench className="w-3.5 h-3.5 text-orange-500" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Open technical support requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-500" /> Open Technical Support Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.open_tech_support.length === 0 ? (
              <p className="text-sm text-slate-500">No open requests</p>
            ) : (
              <div className="space-y-3">
                {data.open_tech_support.map((i) => (
                  <div key={i.issue_id} className="border-b border-slate-100 pb-3 last:border-0">
                    <Link to={`/projects/${i.project_id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {i.project_code} — {i.project_name}
                    </Link>
                    <p className="text-xs text-slate-500">{i.region_name} · {i.responsible_org || 'No responsible org'}</p>
                    <p className="text-xs text-orange-600 font-medium mt-0.5">open {i.days_open}d · {i.status}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Overdue issues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500" /> Overdue Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.overdue_issues.length === 0 ? (
              <p className="text-sm text-slate-500">No overdue issues</p>
            ) : (
              <div className="space-y-3">
                {data.overdue_issues.map((i) => (
                  <div key={i.issue_id} className="border-b border-slate-100 pb-3 last:border-0">
                    <Link to={`/projects/${i.project_id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {i.project_code} — {i.project_name}
                    </Link>
                    <p className="text-xs text-slate-500">{i.problem_category} · {i.responsible_org || 'No responsible org'}</p>
                    <p className="text-xs text-red-600 font-medium mt-0.5">{i.days_overdue}d overdue · {i.status}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Filterable project table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>All Projects</CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <select
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
              >
                <option value="">All regions</option>
                {data.region_cards.map((r) => (
                  <option key={r.region_id} value={r.region_id}>{r.name}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={filters.techSupport}
                  onChange={(e) => setFilters({ ...filters, techSupport: e.target.checked })}
                />
                Tech support
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={filters.staleOnly}
                  onChange={(e) => setFilters({ ...filters, staleOnly: e.target.checked })}
                />
                Stale data only (&gt;30d)
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Code', 'Name', 'Region', 'Status', 'Phys %', 'Fin %', 'Time %', 'Last Update', 'Support', 'Priority'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredProjects.map((p) => (
                  <tr key={p.project_id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs">{p.project_code}</td>
                    <td className="px-4 py-2.5">
                      <Link to={`/projects/${p.project_id}`} className="text-blue-600 hover:underline font-medium">
                        {p.project_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{p.region_name}</td>
                    <td className="px-4 py-2.5"><Badge variant={STATUS_VARIANTS[p.status]}>{STATUS_LABELS[p.status]}</Badge></td>
                    <td className="px-4 py-2.5">{p.physical_pct}%</td>
                    <td className="px-4 py-2.5">{p.financial_pct}%</td>
                    <td className="px-4 py-2.5">{p.time_pct}%</td>
                    <td className="px-4 py-2.5">
                      {p.days_stale === null ? (
                        <span className="text-red-600 font-medium">never</span>
                      ) : (
                        <span className={p.days_stale > 30 ? 'text-amber-700 font-medium' : ''}>{p.days_stale}d</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.technical_support_required && <Wrench className="w-4 h-4 text-orange-500" />}
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={p.priority_level}
                        disabled={savingPriority === p.project_id}
                        onChange={(e) => handlePriorityChange(p.project_id, e.target.value)}
                        className={`border rounded px-1.5 py-1 text-xs ${
                          p.priority_level === 'critical' ? 'border-red-400 text-red-700' :
                          p.priority_level === 'high' ? 'border-amber-400 text-amber-700' :
                          'border-slate-300 text-slate-700'
                        }`}
                      >
                        {PRIORITY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">No projects match the filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
