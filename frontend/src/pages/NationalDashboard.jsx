import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, AlertTriangle, Wrench, Clock } from 'lucide-react'
import api from '../api'
import '../styles/national.css'

const STATUS_CLASS = {
  on_track: 'is-ok',
  delayed: 'is-warn',
  critical: 'is-bad',
  completed: 'is-done',
}

const STATUS_COLORS = {
  on_track: '#16a34a',
  delayed: '#eab308',
  critical: '#dc2626',
  completed: '#2563eb',
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

function fmtNum(v) {
  return Number(v || 0).toLocaleString()
}

// keeps a progress bar between 0 and 100
function pct(v) {
  const n = Number(v)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function ProgressBar({ label, value, financial }) {
  return (
    <div className="nat-bar-row">
      <div className="nat-bar-label">
        <span>{label}</span>
        <b>{value}%</b>
      </div>
      <div className={`nat-bar ${financial ? 'is-fin' : ''}`}>
        <i style={{ width: `${pct(value)}%` }} />
      </div>
    </div>
  )
}

function RegionCard({ card, isNational }) {
  const total = card.total_projects || 0
  const burn = card.financial_burn
  const burnDelta = burn ? burn.current_period_certified - burn.previous_period_certified : null
  const cls = `nat-region ${isNational ? 'is-national' : ''} ${card.stale ? 'is-stale' : ''}`

  return (
    <div className={cls}>
      <div className="nat-region-head">
        <h3 style={isNational ? { color: '#1d4ed8' } : undefined}>{card.name}</h3>
        {card.stale && <span className="nat-pill is-warn">Stale &gt;30d</span>}
      </div>
      <div className="nat-region-count">{total} projects</div>

      {total > 0 && (
        <div className="nat-split">
          {Object.entries(card.status_breakdown).map(([k, v]) => (
            <i key={k} style={{ width: `${(v / total) * 100}%`, background: STATUS_COLORS[k] }} />
          ))}
        </div>
      )}
      <div className="nat-legend">
        {Object.entries(card.status_breakdown).map(([k, v]) => (
          <span key={k} className={`nat-pill ${STATUS_CLASS[k]}`}>{v} {STATUS_LABELS[k]}</span>
        ))}
      </div>

      <ProgressBar label="Physical progress" value={card.avg_physical_pct} />
      <ProgressBar label="Financial progress" value={card.avg_financial_pct} financial />

      <div className="nat-facts">
        <div className="nat-fact"><span>Irrigable area</span><b>{fmtNum(card.total_irrigable_area_ha)} ha</b></div>
        <div className="nat-fact"><span>Households</span><b>{fmtNum(card.total_beneficiaries_thh)}</b></div>
        <div className={`nat-fact ${card.stale ? 'is-warn' : ''}`}>
          <span>Last update</span>
          <b>{card.avg_days_since_update === null ? 'no data' : `${card.avg_days_since_update}d ago avg`}</b>
        </div>
        {burn && (
          <div className="nat-fact">
            <span>Certified this month</span>
            <b style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {fmtMoney(burn.current_period_certified)}
              {burnDelta > 0 && <TrendingUp size={15} color="#16a34a" />}
              {burnDelta < 0 && <TrendingDown size={15} color="#dc2626" />}
              <small style={{ color: '#8aa095', fontWeight: 500 }}>(prev {fmtMoney(burn.previous_period_certified)})</small>
            </b>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniProgress({ value, financial }) {
  return (
    <div className="nat-mini">
      <div className={`nat-bar ${financial ? 'is-fin' : ''}`}><i style={{ width: `${pct(value)}%` }} /></div>
      <span>{value}%</span>
    </div>
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

  const nat = data.national_card
  const sb = nat.status_breakdown || {}

  return (
    <div>
      {/* Summary strip */}
      <section className="nat-summary">
        <h2>National Overview</h2>
        <p>All irrigation projects across regions, at a glance.</p>
        <div className="nat-summary-grid">
          <div className="nat-summary-item"><b>{nat.total_projects}</b><span>Projects</span></div>
          <div className="nat-summary-item"><b>{sb.on_track || 0}</b><span>On track</span></div>
          <div className="nat-summary-item"><b>{sb.delayed || 0}</b><span>Delayed</span></div>
          <div className="nat-summary-item"><b>{sb.critical || 0}</b><span>Critical</span></div>
          <div className="nat-summary-item"><b>{fmtNum(nat.total_irrigable_area_ha)}</b><span>Hectares</span></div>
          <div className="nat-summary-item"><b>{fmtNum(nat.total_beneficiaries_thh)}</b><span>Households</span></div>
        </div>
      </section>

      {/* 1. Region comparison cards */}
      <div className="nat-regions">
        <RegionCard card={data.national_card} isNational />
        {data.region_cards.map((c) => <RegionCard key={c.region_id} card={c} />)}
      </div>

      <div className="nat-lists">
        {/* 2. Top 5 at-risk projects */}
        <div className="dss-panel">
          <div className="dss-panel-head">
            <div className="nat-list-head">
              <span className="nat-list-icon is-bad"><AlertTriangle size={18} /></span>
              Top 5 At-Risk Projects
            </div>
          </div>
          <div className="dss-panel-body">
            {data.at_risk_projects.length === 0 ? (
              <p className="nat-empty">No projects at risk.</p>
            ) : (
              data.at_risk_projects.map((p, i) => (
                <div key={p.project_id} className="nat-item">
                  <span className="nat-rank">{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/projects/${p.project_id}`} className="nat-link">
                      {p.project_code} — {p.project_name}
                    </Link>
                    <div className="nat-sub">{p.region_name}</div>
                    <div className="nat-meta">
                      <span style={{ color: '#dc2626' }}>gap {p.gap_pct}%</span>
                      <span style={{ color: '#b45309' }}>
                        {p.days_stale === null ? 'never updated' : `${p.days_stale}d stale`}
                      </span>
                      {p.technical_support_required && <Wrench size={14} color="#ea580c" />}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Open technical support requests */}
        <div className="dss-panel">
          <div className="dss-panel-head">
            <div className="nat-list-head">
              <span className="nat-list-icon is-warn"><Wrench size={18} /></span>
              Open Technical Support
            </div>
          </div>
          <div className="dss-panel-body">
            {data.open_tech_support.length === 0 ? (
              <p className="nat-empty">No open requests.</p>
            ) : (
              data.open_tech_support.map((i) => (
                <div key={i.issue_id} className="nat-item">
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/projects/${i.project_id}`} className="nat-link">
                      {i.project_code} — {i.project_name}
                    </Link>
                    <div className="nat-sub">{i.region_name} · {i.responsible_org || 'No responsible org'}</div>
                    <div className="nat-meta"><span style={{ color: '#ea580c' }}>open {i.days_open}d · {i.status}</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. Overdue issues */}
        <div className="dss-panel">
          <div className="dss-panel-head">
            <div className="nat-list-head">
              <span className="nat-list-icon is-bad"><Clock size={18} /></span>
              Overdue Issues
            </div>
          </div>
          <div className="dss-panel-body">
            {data.overdue_issues.length === 0 ? (
              <p className="nat-empty">No overdue issues.</p>
            ) : (
              data.overdue_issues.map((i) => (
                <div key={i.issue_id} className="nat-item">
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/projects/${i.project_id}`} className="nat-link">
                      {i.project_code} — {i.project_name}
                    </Link>
                    <div className="nat-sub">{i.problem_category} · {i.responsible_org || 'No responsible org'}</div>
                    <div className="nat-meta"><span style={{ color: '#dc2626' }}>{i.days_overdue}d overdue · {i.status}</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Filterable project table */}
      <div className="dss-panel" style={{ marginTop: 24 }}>
        <div className="dss-panel-head">
          <div className="nat-table-head">
            <span>All Projects</span>
            <div className="nat-filters">
              <select
                className="nat-select"
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
              >
                <option value="">All regions</option>
                {data.region_cards.map((r) => (
                  <option key={r.region_id} value={r.region_id}>{r.name}</option>
                ))}
              </select>
              <select
                className="nat-select"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <label className="nat-check">
                <input
                  type="checkbox"
                  checked={filters.techSupport}
                  onChange={(e) => setFilters({ ...filters, techSupport: e.target.checked })}
                />
                Tech support
              </label>
              <label className="nat-check">
                <input
                  type="checkbox"
                  checked={filters.staleOnly}
                  onChange={(e) => setFilters({ ...filters, staleOnly: e.target.checked })}
                />
                Stale data only (&gt;30d)
              </label>
            </div>
          </div>
        </div>

        <div className="dss-panel-body nat-scroll">
          <table className="nat-table">
            <thead>
              <tr>
                {['Code', 'Name', 'Region', 'Status', 'Physical', 'Financial', 'Time', 'Last update', 'Support', 'Priority'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => (
                <tr key={p.project_id}>
                  <td data-label="Code"><span className="nat-code">{p.project_code}</span></td>
                  <td data-label="Name">
                    <Link to={`/projects/${p.project_id}`} className="nat-link">{p.project_name}</Link>
                  </td>
                  <td data-label="Region">{p.region_name}</td>
                  <td data-label="Status">
                    <span className={`nat-pill ${STATUS_CLASS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                  </td>
                  <td data-label="Physical"><MiniProgress value={p.physical_pct} /></td>
                  <td data-label="Financial"><MiniProgress value={p.financial_pct} financial /></td>
                  <td data-label="Time"><MiniProgress value={p.time_pct} /></td>
                  <td data-label="Last update">
                    {p.days_stale === null ? (
                      <span className="nat-never">never</span>
                    ) : (
                      <span className={p.days_stale > 30 ? 'nat-stale' : ''}>{p.days_stale}d</span>
                    )}
                  </td>
                  <td data-label="Support">
                    {p.technical_support_required ? <Wrench size={16} color="#ea580c" /> : '—'}
                  </td>
                  <td data-label="Priority">
                    <select
                      value={p.priority_level}
                      disabled={savingPriority === p.project_id}
                      onChange={(e) => handlePriorityChange(p.project_id, e.target.value)}
                      className={`nat-priority ${p.priority_level === 'high' ? 'is-high' : ''} ${p.priority_level === 'critical' ? 'is-critical' : ''}`}
                    >
                      {PRIORITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#5d6f65' }}>No projects match the filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}