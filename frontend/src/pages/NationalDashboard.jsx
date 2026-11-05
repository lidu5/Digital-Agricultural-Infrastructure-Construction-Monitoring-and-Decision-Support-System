import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  AlertTriangle, Wrench, Clock, Bell, ChevronDown, ChevronRight,
  Users, FolderOpen, Sprout, CheckCircle2, CircleAlert, Timer,
} from 'lucide-react'
import api from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'

const selectCls = 'border border-slate-300 rounded-md px-2.5 py-1.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500'

const STATUS_META = {
  on_track: { label: 'On Track', color: '#16a34a', pill: 'bg-emerald-100 text-emerald-700' },
  delayed: { label: 'Delayed', color: '#d97706', pill: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Critical', color: '#dc2626', pill: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', color: '#2563eb', pill: 'bg-blue-100 text-blue-700' },
}

const SEVERITY_PILL = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
  critical: 'bg-red-600 text-white',
}

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const fmtNum = (n) => new Intl.NumberFormat('en-US').format(Math.round(n))
const pct = (v) => Math.max(0, Math.min(100, Number(v) || 0))

const Pill = ({ children, className }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${className}`}>
    {children}
  </span>
)

// ---------------------------------------------------------------------------
// KPI strip
// ---------------------------------------------------------------------------
function KpiCard({ icon: Icon, label, value, sub, tone, onClick }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    teal: 'bg-teal-50 text-teal-600',
  }
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 text-left w-full hover:shadow-md hover:border-slate-300 transition-all"
    >
      <span className={`w-11 h-11 rounded-xl grid place-items-center flex-none ${tones[tone]}`}>
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-extrabold text-slate-900 leading-tight">{value}</span>
        <span className="block text-xs font-medium text-slate-500 mt-0.5">{label}</span>
        {sub && <span className="block text-[11px] text-slate-400 truncate">{sub}</span>}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------
function StatusDonut({ breakdown, total }) {
  const data = Object.entries(STATUS_META)
    .map(([key, meta]) => ({ name: meta.label, value: breakdown[key] || 0, color: meta.color }))
    .filter((d) => d.value > 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={58} outerRadius={85} paddingAngle={3} stroke="none">
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v, n) => [`${v} project${v !== 1 ? 's' : ''}`, n]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="text-center -mt-2">
          <div className="text-3xl font-extrabold text-slate-900">{total}</div>
          <div className="text-[11px] text-slate-500 font-medium">projects</div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2 -mt-2">
        {data.map((d) => (
          <Pill key={d.name} className="bg-slate-100 text-slate-600">
            <span className="w-2 h-2 rounded-full mr-1.5 inline-block" style={{ background: d.color }} />
            {d.name} · {d.value}
          </Pill>
        ))}
      </div>
    </div>
  )
}

function RegionChart({ cards }) {
  const data = cards.map((c) => ({
    name: c.name.length > 12 ? `${c.name.slice(0, 11)}…` : c.name,
    Physical: Math.round(c.avg_physical_pct || 0),
    Financial: Math.round(c.avg_financial_pct || 0),
  }))
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Physical" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="Financial" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ---------------------------------------------------------------------------
// Region → Program drill-down
// ---------------------------------------------------------------------------
function ProgramCard({ prog, regionId }) {
  const navigate = useNavigate()
  const [expandBene, setExpandBene] = useState(false)
  const [expandHa, setExpandHa] = useState(false)
  const sb = prog.status_breakdown

  const goToProjects = () => {
    const params = new URLSearchParams()
    if (prog.program_id) params.set('program', prog.program_id)
    if (regionId) params.set('region', regionId)
    navigate(`/projects?${params.toString()}`)
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <button onClick={goToProjects} className="text-sm font-semibold text-blue-700 hover:underline text-left">
            {prog.program_name}
          </button>
          {prog.program_code && <span className="ml-2 text-xs text-slate-400">[{prog.program_code}]</span>}
        </div>
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
          {prog.total_projects} project{prog.total_projects !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {sb.critical > 0 && <Pill className={STATUS_META.critical.pill}>{sb.critical} Critical</Pill>}
        {sb.delayed > 0 && <Pill className={STATUS_META.delayed.pill}>{sb.delayed} Delayed</Pill>}
        {sb.on_track > 0 && <Pill className={STATUS_META.on_track.pill}>{sb.on_track} On Track</Pill>}
        {sb.completed > 0 && <Pill className={STATUS_META.completed.pill}>{sb.completed} Completed</Pill>}
      </div>

      <div className="border-t border-slate-100 pt-2">
        <button
          className="flex items-center justify-between w-full text-xs text-slate-600 hover:text-slate-900"
          onClick={() => setExpandBene((v) => !v)}
        >
          <span className="flex items-center gap-1.5">
            <Users size={13} className="text-slate-400" />
            <b className="text-slate-800">{fmtNum(prog.total_beneficiaries_thh)}</b> beneficiary HH
          </span>
          {expandBene ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        {expandBene && (
          <ul className="mt-2 space-y-1.5">
            {prog.projects.map((p) => (
              <li key={p.project_id} className="flex justify-between text-xs gap-2">
                <Link to={`/projects/${p.project_id}`} className="text-blue-600 hover:underline truncate">
                  {p.project_code} — {p.project_name}
                </Link>
                <span className="text-slate-500 whitespace-nowrap">{fmtNum(p.beneficiaries_thh)} HH</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-100 pt-2 mt-2">
        <button
          className="flex items-center justify-between w-full text-xs text-slate-600 hover:text-slate-900"
          onClick={() => setExpandHa((v) => !v)}
        >
          <span className="flex items-center gap-1.5">
            <Sprout size={13} className="text-slate-400" />
            <b className="text-slate-800">{fmtNum(prog.total_irrigable_area_ha)}</b> ha irrigable
          </span>
          {expandHa ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        {expandHa && (
          <ul className="mt-2 space-y-1.5">
            {prog.projects.map((p) => (
              <li key={p.project_id} className="flex justify-between text-xs gap-2">
                <Link to={`/projects/${p.project_id}`} className="text-blue-600 hover:underline truncate">
                  {p.project_code} — {p.project_name}
                </Link>
                <span className="text-slate-500 whitespace-nowrap">{fmtNum(p.irrigable_area_ha)} ha</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// List items for the tabbed attention panel
// ---------------------------------------------------------------------------
function AtRiskItem({ p, rank }) {
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="text-lg font-extrabold text-slate-300 w-6 flex-none">{rank}</span>
      <div className="min-w-0">
        <Link to={`/projects/${p.project_id}`} className="text-sm font-semibold text-emerald-800 hover:underline">
          {p.project_code} — {p.project_name}
        </Link>
        <div className="text-xs text-slate-500">{p.region_name}</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium mt-1">
          <span className="text-red-600">Gap {p.gap_pct}%</span>
          <span className="text-amber-600">Stale {p.days_stale === null ? 'never' : `${p.days_stale}d`}</span>
          <span className="text-slate-400">Risk {p.risk_score}</span>
          {p.technical_support_required && <span className="text-orange-600 flex items-center gap-0.5"><Wrench size={11} /> support</span>}
        </div>
      </div>
    </div>
  )
}

function TechItem({ i }) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <Link to={`/projects/${i.project_id}`} className="text-sm font-semibold text-emerald-800 hover:underline">
        {i.project_code} — {i.project_name}
      </Link>
      <div className="text-xs text-slate-500">{i.region_name} · {i.responsible_org || 'No responsible org'}</div>
      <div className="flex gap-3 text-xs font-medium mt-1">
        <span className="text-red-600">{i.days_open}d open</span>
        <span className="text-slate-400">{i.status}</span>
      </div>
    </div>
  )
}

function OverdueItem({ i }) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <Link to={`/projects/${i.project_id}`} className="text-sm font-semibold text-emerald-800 hover:underline">
        {i.project_code} — {i.project_name}
      </Link>
      <div className="text-xs text-slate-500">{i.problem_category} · {i.responsible_org || 'No responsible org'}</div>
      <div className="flex gap-3 text-xs font-medium mt-1">
        <span className="text-red-600">{i.days_overdue}d overdue</span>
        <span className="text-slate-400">{i.status}</span>
      </div>
    </div>
  )
}

function AlertItem({ a }) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <Link to={`/projects/${a.project}`} className="text-sm font-semibold text-emerald-800 hover:underline">
        {a.project_code} — {a.project_name}
      </Link>
      <div className="text-xs text-slate-500">
        {a.alert_type_name}{a.contract_number ? ` · ${a.contract_number}` : ''}
      </div>
      <div className="flex items-center gap-2 text-xs font-medium mt-1">
        <Pill className={SEVERITY_PILL[a.severity] || SEVERITY_PILL.medium}>{a.severity}</Pill>
        <span className="text-slate-400">{a.status}</span>
        <span className="text-slate-400">{a.triggered_date}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function NationalDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ region: '', status: '', techSupport: false, staleOnly: false })
  const [savingPriority, setSavingPriority] = useState(null)
  const [expandedRegions, setExpandedRegions] = useState({})
  const [listTab, setListTab] = useState('at_risk')

  const toggleRegion = (id) => setExpandedRegions((s) => ({ ...s, [id]: !s[id] }))

  const load = () => {
    Promise.all([
      api.get('/monitoring/national-dashboard/'),
      api.get('/monitoring/alerts/'),
    ])
      .then(([dashRes, alertsRes]) => {
        setData(dashRes.data)
        setAlerts(alertsRes.data.slice(0, 8))
      })
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
      .filter((p) => !filters.staleOnly || (p.days_stale !== null && p.days_stale > 30) || p.days_stale === null)
  }, [data, filters])

  const handlePriorityChange = async (projectId, newPriority) => {
    setSavingPriority(projectId)
    try {
      await api.patch(`/projects/projects/${projectId}/`, { priority_level: newPriority })
      setData((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.project_id === projectId ? { ...p, priority_level: newPriority } : p
        ),
      }))
    } catch (err) {
      console.error(err)
      alert('Failed to update priority')
    } finally {
      setSavingPriority(null)
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-slate-500">Loading dashboard…</div>
  }
  if (!data) {
    return <div className="text-center py-16 text-slate-500">Failed to load dashboard.</div>
  }

  const nat = data.national_card
  const burn = nat.financial_burn
  const burnUp = burn && burn.current_period_certified >= burn.previous_period_certified

  const LIST_TABS = [
    { id: 'at_risk', label: 'At-Risk', icon: AlertTriangle, count: data.at_risk_projects.length, color: 'text-red-600' },
    { id: 'tech', label: 'Tech Support', icon: Wrench, count: data.open_tech_support.length, color: 'text-amber-600' },
    { id: 'overdue', label: 'Overdue Issues', icon: Clock, count: data.overdue_issues.length, color: 'text-red-600' },
    { id: 'alerts', label: 'Alerts', icon: Bell, count: alerts.length, color: 'text-blue-600' },
  ]

  return (
    <div className="space-y-6">
      {/* ------- Header ------- */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">National Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            {nat.total_projects} project{nat.total_projects !== 1 ? 's' : ''} ·{' '}
            {fmtNum(nat.total_irrigable_area_ha)} ha ·{' '}
            {fmtNum(nat.total_beneficiaries_thh)} beneficiary households
          </p>
        </div>
        {burn && (
          <div className="text-right">
            <div className="text-xs text-slate-500">Certified this period</div>
            <div className="flex items-center justify-end gap-1.5">
              <span className={`text-lg font-bold ${burnUp ? 'text-emerald-600' : 'text-red-600'}`}>
                ETB {fmtNum(burn.current_period_certified)}
              </span>
              {burnUp ? <CheckCircle2 size={16} className="text-emerald-600" /> : <CircleAlert size={16} className="text-red-600" />}
            </div>
            <div className="text-[11px] text-slate-400">
              vs ETB {fmtNum(burn.previous_period_certified)} last period
            </div>
          </div>
        )}
      </div>

      {/* ------- KPI strip ------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={FolderOpen} label="Total Projects" value={nat.total_projects} tone="slate" onClick={() => navigate('/projects')} />
        <KpiCard icon={CheckCircle2} label="On Track" value={nat.status_breakdown.on_track} tone="emerald" onClick={() => navigate('/projects?status=on_track')} />
        <KpiCard icon={Timer} label="Delayed" value={nat.status_breakdown.delayed} tone="amber" onClick={() => navigate('/projects?status=delayed')} />
        <KpiCard icon={CircleAlert} label="Critical" value={nat.status_breakdown.critical} tone="red" onClick={() => navigate('/projects?status=critical')} />
        <KpiCard icon={Sprout} label="Irrigable (ha)" value={fmtNum(nat.total_irrigable_area_ha)} tone="teal" onClick={() => navigate('/projects')} />
        <KpiCard icon={Users} label="Households" value={fmtNum(nat.total_beneficiaries_thh)} tone="blue" onClick={() => navigate('/projects')} />
      </div>

      {/* ------- Charts row ------- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Project Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <StatusDonut breakdown={nat.status_breakdown} total={nat.total_projects} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Physical vs Financial Progress by Region</CardTitle></CardHeader>
          <CardContent>
            <RegionChart cards={data.region_cards} />
          </CardContent>
        </Card>
      </div>

      {/* ------- Region → Program drill-down ------- */}
      {data.region_program_summary && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-slate-800">Projects by Region &amp; Program</h3>
          {data.region_cards.map((region) => {
            const programs = data.region_program_summary[String(region.region_id)] || []
            if (programs.length === 0) return null
            const isOpen = expandedRegions[region.region_id] !== false
            return (
              <div key={region.region_id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                  onClick={() => toggleRegion(region.region_id)}
                >
                  <span className="font-semibold text-slate-800 text-sm">{region.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {region.total_projects} projects · {programs.length} program{programs.length !== 1 ? 's' : ''}
                    </span>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>
                {isOpen && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {programs.map((prog) => (
                      <ProgramCard key={prog.program_id || '__none__'} prog={prog} regionId={region.region_id} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ------- Tabbed attention lists ------- */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex gap-1 overflow-x-auto">
            {LIST_TABS.map(({ id, label, icon: Icon, count, color }) => (
              <button
                key={id}
                onClick={() => setListTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  listTab === id
                    ? 'border-emerald-600 text-slate-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={15} className={color} />
                {label}
                <span className="text-xs bg-slate-100 rounded-full px-1.5 py-0.5">{count}</span>
              </button>
            ))}
            {listTab === 'alerts' && (
              <Link to="/alerts" className="ml-auto text-xs text-blue-600 hover:underline self-center px-2">
                View all →
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto">
          {listTab === 'at_risk' && (
            data.at_risk_projects.length === 0
              ? <p className="text-sm text-slate-500 py-4">No at-risk projects.</p>
              : data.at_risk_projects.map((p, i) => <AtRiskItem key={p.project_id} p={p} rank={i + 1} />)
          )}
          {listTab === 'tech' && (
            data.open_tech_support.length === 0
              ? <p className="text-sm text-slate-500 py-4">No open technical support requests.</p>
              : data.open_tech_support.map((i) => <TechItem key={i.issue_id} i={i} />)
          )}
          {listTab === 'overdue' && (
            data.overdue_issues.length === 0
              ? <p className="text-sm text-slate-500 py-4">No overdue issues.</p>
              : data.overdue_issues.map((i) => <OverdueItem key={i.issue_id} i={i} />)
          )}
          {listTab === 'alerts' && (
            alerts.length === 0
              ? <p className="text-sm text-slate-500 py-4">No alerts.</p>
              : alerts.map((a) => <AlertItem key={a.alert_id} a={a} />)
          )}
        </CardContent>
      </Card>

      {/* ------- All projects table ------- */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">All Projects ({filteredProjects.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select
                className={selectCls}
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
              >
                <option value="">All regions</option>
                {data.region_cards.map((r) => (
                  <option key={r.region_id} value={r.region_id}>{r.name}</option>
                ))}
              </select>
              <select
                className={selectCls}
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_META).map(([v, m]) => (
                  <option key={v} value={v}>{m.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.techSupport}
                  onChange={(e) => setFilters({ ...filters, techSupport: e.target.checked })}
                />
                Tech support
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.staleOnly}
                  onChange={(e) => setFilters({ ...filters, staleOnly: e.target.checked })}
                />
                Stale (&gt;30d)
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {['Code', 'Name', 'Region', 'Status', 'Physical', 'Financial', 'Time', 'Last update', 'Support', 'Priority'].map((h) => (
                    <TableHead key={h} className="sticky top-0 bg-slate-50 z-10">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((p) => (
                  <TableRow key={p.project_id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-xs text-slate-500">{p.project_code}</TableCell>
                    <TableCell>
                      <Link to={`/projects/${p.project_id}`} className="text-emerald-800 font-medium hover:underline">
                        {p.project_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{p.region_name}</TableCell>
                    <TableCell>
                      <Pill className={STATUS_META[p.status]?.pill || 'bg-slate-100 text-slate-600'}>
                        {STATUS_META[p.status]?.label || p.status}
                      </Pill>
                    </TableCell>
                    {['physical_pct', 'financial_pct', 'time_pct'].map((key) => (
                      <TableCell key={key}>
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${key === 'financial_pct' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                              style={{ width: `${pct(p[key])}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-9 text-right">{p[key]}%</span>
                        </div>
                      </TableCell>
                    ))}
                    <TableCell>
                      {p.days_stale === null ? (
                        <span className="text-xs font-semibold text-red-600">never</span>
                      ) : (
                        <span className={`text-xs font-semibold ${p.days_stale > 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {p.days_stale}d
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.technical_support_required ? <Wrench size={15} className="text-orange-600" /> : '—'}
                    </TableCell>
                    <TableCell>
                      <select
                        value={p.priority_level}
                        disabled={savingPriority === p.project_id}
                        onChange={(e) => handlePriorityChange(p.project_id, e.target.value)}
                        className={`border rounded-md px-2 py-1 text-xs bg-white ${
                          p.priority_level === 'critical'
                            ? 'border-red-300 text-red-700'
                            : p.priority_level === 'high'
                              ? 'border-amber-300 text-amber-700'
                              : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {PRIORITY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      No projects match the filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
