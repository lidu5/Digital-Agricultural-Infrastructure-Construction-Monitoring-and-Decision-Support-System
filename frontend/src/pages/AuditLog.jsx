import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import api from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/Input'

const ACTION_VARIANT = {
  create: 'success',
  update: 'info',
  delete: 'danger',
}

const MODEL_LABELS = {
  contract: 'Contract',
  variationorder: 'Variation Order',
  extensionoftime: 'Extension of Time',
  ipc: 'IPC',
  claim: 'Claim',
  project: 'Project',
  projectmilestone: 'Milestone',
  progressrecord: 'Progress Record',
  issue: 'Issue',
  document: 'Document',
  alert: 'Alert',
}

function DiffTable({ changed, action }) {
  const entries = Object.entries(changed)
  if (!entries.length) return <p className="text-xs text-slate-400 italic">No field details.</p>

  if (action === 'create' || action === 'delete') {
    return (
      <table className="w-full text-xs border-collapse mt-1">
        <thead>
          <tr className="bg-slate-100 text-slate-600">
            <th className="text-left px-2 py-1 font-medium w-40">Field</th>
            <th className="text-left px-2 py-1 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([field, val]) => (
            <tr key={field} className="border-t border-slate-100">
              <td className="px-2 py-1 text-slate-500 font-mono">{field}</td>
              <td className="px-2 py-1 text-slate-800 font-mono break-all">{String(val ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <table className="w-full text-xs border-collapse mt-1">
      <thead>
        <tr className="bg-slate-100 text-slate-600">
          <th className="text-left px-2 py-1 font-medium w-40">Field</th>
          <th className="text-left px-2 py-1 font-medium w-1/3">Before</th>
          <th className="text-left px-2 py-1 font-medium">After</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([field, { old: oldVal, new: newVal }]) => (
          <tr key={field} className="border-t border-slate-100">
            <td className="px-2 py-1 text-slate-500 font-mono">{field}</td>
            <td className="px-2 py-1 text-red-600 font-mono break-all">{String(oldVal ?? '—')}</td>
            <td className="px-2 py-1 text-green-700 font-mono break-all">{String(newVal ?? '—')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LogRow({ log }) {
  const [open, setOpen] = useState(false)
  const ts = new Date(log.timestamp)
  const timeStr = ts.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const modelLabel = MODEL_LABELS[log.model_name] || log.model_name

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <Badge variant={ACTION_VARIANT[log.action] || 'default'} className="shrink-0 uppercase text-xs">
          {log.action}
        </Badge>
        <span className="font-medium text-slate-800 text-sm flex-1 truncate">
          {modelLabel} — <span className="font-normal text-slate-600">{log.object_repr}</span>
        </span>
        <span className="text-xs text-slate-500 shrink-0">{log.actor_name || log.actor_email || 'system'}</span>
        <span className="text-xs text-slate-400 shrink-0 ml-2">{timeStr}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
          <div className="text-xs text-slate-500 mb-2">
            <span className="font-medium">By:</span> {log.actor_name || '—'} ({log.actor_email || 'system'})
            &nbsp;·&nbsp;
            <span className="font-medium">App:</span> {log.app_label}/{log.model_name}
            &nbsp;·&nbsp;
            <span className="font-medium">ID:</span> {log.object_id}
          </div>
          <DiffTable changed={log.changed_fields} action={log.action} />
        </div>
      )}
    </div>
  )
}

const PAGE_SIZE = 50

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [model, setModel] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)

  const fetchLogs = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, page_size: PAGE_SIZE })
    if (action) params.set('action', action)
    if (model) params.set('model', model)
    if (search) params.set('search', search)

    api.get(`/audit/logs/?${params}`)
      .then((res) => {
        setLogs(res.data.results ?? res.data)
        setCount(res.data.count ?? (res.data.results ?? res.data).length)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [action, model, search, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Audit Trail</h1>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }}>
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </Select>
            <Select value={model} onChange={(e) => { setModel(e.target.value); setPage(1) }}>
              <option value="">All Models</option>
              {Object.entries(MODEL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }}
            >
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by user or record…"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="submit" size="sm">
                <Search className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Log list */}
      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? 'Loading…' : `${count} log entr${count !== 1 ? 'ies' : 'y'}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && logs.length === 0 && (
            <p className="text-slate-500 text-center py-12">No audit log entries found.</p>
          )}
          <div className="space-y-2">
            {logs.map((log) => <LogRow key={log.id} log={log} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
              <Button
                variant="outline" size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
