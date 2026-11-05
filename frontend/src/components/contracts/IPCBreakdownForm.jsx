import { useState, useEffect, useMemo } from 'react'
import { X, Info, AlertTriangle } from 'lucide-react'
import api from '../../api'
import Button from '../ui/Button'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    n || 0
  )

export default function IPCBreakdownForm({ contractId, ipc, onClose, onSuccess }) {
  const [boqItems, setBoqItems] = useState([])
  const [rows, setRows] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/contracts/boq-items/?contract=${contractId}`),
      api.get(`/contracts/ipc-line-items/?contract=${contractId}&ipc=${ipc.ipc_id}`),
    ])
      .then(([itemsRes, lineRes]) => {
        setBoqItems(itemsRes.data)
        const initial = {}
        itemsRes.data.forEach((item) => {
          const existing = lineRes.data.find((li) => li.boq_item === item.item_id)
          initial[item.item_id] = {
            line_item_id: existing?.line_item_id || null,
            certified_amount_etb: existing ? String(existing.certified_amount_etb) : '',
            remarks: existing?.remarks || '',
          }
        })
        setRows(initial)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [contractId, ipc.ipc_id])

  const setField = (itemId, field, value) => {
    setRows((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }))
  }

  const allocatedTotal = useMemo(
    () =>
      Object.values(rows).reduce((sum, r) => sum + (parseFloat(r.certified_amount_etb) || 0), 0),
    [rows]
  )

  const ipcTotal = parseFloat(ipc.certified_amount || 0)
  const diff = allocatedTotal - ipcTotal
  const diffOk = Math.abs(diff) < 0.01

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const ops = []
      for (const item of boqItems) {
        const row = rows[item.item_id]
        const certified = parseFloat(row.certified_amount_etb) || 0
        if (certified === 0 && !row.line_item_id) continue

        if (row.line_item_id) {
          if (certified === 0) {
            ops.push(api.delete(`/contracts/ipc-line-items/${row.line_item_id}/`))
          } else {
            ops.push(
              api.put(`/contracts/ipc-line-items/${row.line_item_id}/`, {
                boq_item: item.item_id,
                ipc: ipc.ipc_id,
                certified_amount_etb: row.certified_amount_etb,
                remarks: row.remarks,
              })
            )
          }
        } else {
          ops.push(
            api.post('/contracts/ipc-line-items/', {
              boq_item: item.item_id,
              ipc: ipc.ipc_id,
              certified_amount_etb: row.certified_amount_etb,
              remarks: row.remarks,
            })
          )
        }
      }
      await Promise.all(ops)
      onSuccess()
      onClose()
    } catch (err) {
      alert(
        'Failed to save BOQ breakdown:\n' +
          JSON.stringify(err.response?.data || err.message, null, 2)
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
        <p className="text-white">Loading BOQ items…</p>
      </div>
    )
  }

  if (boqItems.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen flex items-start justify-center p-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>No BOQ Items</CardTitle>
                <button onClick={onClose}><X className="w-5 h-5" /></button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 text-sm">
                No BOQ items have been added to this contract yet. Create BOQ sections and items
                first, then come back to allocate this IPC.
              </p>
              <Button className="mt-4 w-full" onClick={onClose}>Close</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <Card className="w-full max-w-5xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Allocate IPC {ipc.ipc_number} to BOQ Items</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  IPC certified total:{' '}
                  <span className="font-semibold text-slate-700">{fmt(ipcTotal)} ETB</span>
                  {ipc.ipc_date
                    ? ` — ${new Date(ipc.ipc_date).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
              <button onClick={onClose}><X className="w-5 h-5" /></button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700 mb-4">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Enter the certified amount for each BOQ item included in this IPC. Leave items
                blank if they were not claimed. The allocated total should match the IPC certified
                amount.
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
                      <th className="pb-2 pr-3 w-24">Item No</th>
                      <th className="pb-2 pr-3">Description</th>
                      <th className="pb-2 pr-3 text-right w-28">Total Price</th>
                      <th className="pb-2 pr-3 text-right w-28">Prev. Certified</th>
                      <th className="pb-2 pr-3 w-40">Certified (ETB)</th>
                      <th className="pb-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boqItems.map((item) => {
                      const row = rows[item.item_id] || {}
                      const certified = parseFloat(row.certified_amount_etb) || 0
                      const prevCertified = parseFloat(item.cumulative_certified_etb || 0)
                      const prevExcludingThis = row.line_item_id
                        ? prevCertified -
                          (parseFloat(
                            boqItems
                              .find((i) => i.item_id === item.item_id)
                              ?.cumulative_certified_etb || 0
                          ) -
                            prevCertified)
                        : prevCertified
                      const remaining =
                        parseFloat(item.total_price_etb || 0) - prevCertified
                      const isOver = certified > 0 && certified > remaining + 0.01

                      return (
                        <tr
                          key={item.item_id}
                          className={`border-b border-slate-100 ${isOver ? 'bg-red-50' : certified > 0 ? 'bg-blue-50/40' : ''}`}
                        >
                          <td className="py-2 pr-3 font-mono text-xs text-slate-500">
                            {item.item_no}
                          </td>
                          <td className="py-2 pr-3 text-slate-700 max-w-xs">
                            <div className="truncate" title={item.description}>
                              {item.description}
                            </div>
                            <div className="text-xs text-slate-400">
                              {item.unit} · wt {parseFloat(item.weight_pct).toFixed(2)}%
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-slate-600">
                            {fmt(item.total_price_etb)}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-slate-500 text-xs">
                            {fmt(prevCertified)}
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={row.certified_amount_etb || ''}
                              onChange={(e) =>
                                setField(item.item_id, 'certified_amount_etb', e.target.value)
                              }
                              className={`w-full px-2 py-1 border rounded text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isOver ? 'border-red-400 bg-red-50' : 'border-slate-300'
                              }`}
                            />
                            {isOver && (
                              <p className="text-xs text-red-500 mt-0.5">
                                Exceeds remaining ({fmt(remaining)})
                              </p>
                            )}
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              placeholder="—"
                              value={row.remarks || ''}
                              onChange={(e) =>
                                setField(item.item_id, 'remarks', e.target.value)
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-md border px-4 py-3">
                <div className="text-sm">
                  <span className="text-slate-500">Allocated: </span>
                  <span className={`font-semibold ${diffOk ? 'text-green-700' : 'text-amber-600'}`}>
                    {fmt(allocatedTotal)} ETB
                  </span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-slate-500">IPC Total: </span>
                  <span className="font-semibold text-slate-700">{fmt(ipcTotal)} ETB</span>
                  {!diffOk && (
                    <span className="ml-3 text-amber-600 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                      {diff > 0
                        ? `${fmt(diff)} ETB over-allocated`
                        : `${fmt(Math.abs(diff))} ETB under-allocated`}
                    </span>
                  )}
                  {diffOk && allocatedTotal > 0 && (
                    <span className="ml-3 text-green-600 text-xs font-medium">✓ Balanced</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Skip for now
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Allocation'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
