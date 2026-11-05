import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '../../api'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'

export default function PhysicalProgressForm({ contractId, preselectedItemId, editingRecord, onClose, onSuccess }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({
    boq_item: editingRecord?.boq_item || preselectedItemId || '',
    record_date: editingRecord?.record_date || new Date().toISOString().slice(0, 10),
    actual_qty_completed: editingRecord?.actual_qty_completed || '',
  })
  const [saving, setSaving] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    api.get(`/contracts/boq-items/?contract=${contractId}`)
      .then((res) => {
        setItems(res.data)
        const preselectId = editingRecord?.boq_item || preselectedItemId
        if (preselectId) {
          setSelectedItem(res.data.find((i) => i.item_id === preselectId) || null)
        }
      })
      .catch(console.error)
  }, [contractId, preselectedItemId])

  useEffect(() => {
    if (form.boq_item) {
      setSelectedItem(items.find((i) => i.item_id === form.boq_item) || null)
    } else {
      setSelectedItem(null)
    }
  }, [form.boq_item, items])

  const qty = parseFloat(form.actual_qty_completed) || 0
  const boqQty = parseFloat(selectedItem?.quantity) || 0
  const weightPct = parseFloat(selectedItem?.weight_pct) || 0
  const qtyCompletionPct = boqQty > 0 ? Math.min((qty / boqQty) * 100, 100) : 0
  const physicalProgressPct = (qtyCompletionPct * weightPct) / 100

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingRecord) {
        await api.put(`/contracts/physical-progress/${editingRecord.progress_id}/`, form)
      } else {
        await api.post('/contracts/physical-progress/', form)
      }
      onSuccess()
      onClose()
    } catch (err) {
      alert('Failed to save physical progress:\n' + JSON.stringify(err.response?.data || err.message, null, 2))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{editingRecord ? 'Edit Physical Progress' : 'Record Physical Progress'}</CardTitle>
              <button onClick={onClose}><X className="w-5 h-5" /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="BOQ Item"
                value={form.boq_item}
                onChange={(e) => setForm({ ...form, boq_item: e.target.value })}
                required
              >
                <option value="">— Select item —</option>
                {items.map((item) => (
                  <option key={item.item_id} value={item.item_id}>
                    {item.item_no} — {item.description}
                  </option>
                ))}
              </Select>

              {selectedItem && (
                <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Unit:</span>
                    <span className="font-medium">{selectedItem.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BOQ Quantity:</span>
                    <span className="font-medium">{parseFloat(selectedItem.quantity).toLocaleString()} {selectedItem.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weight %:</span>
                    <span className="font-medium">{parseFloat(selectedItem.weight_pct).toFixed(4)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Qty Completed:</span>
                    <span className="font-medium">
                      {parseFloat(selectedItem.cumulative_qty_completed || 0).toLocaleString()} ({parseFloat(selectedItem.qty_completion_pct || 0).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}

              <Input
                label="Record Date"
                type="date"
                value={form.record_date}
                onChange={(e) => setForm({ ...form, record_date: e.target.value })}
                required
              />

              <Input
                label={`Actual Quantity Completed${selectedItem ? ` (${selectedItem.unit})` : ''}`}
                type="number"
                step="0.0001"
                min="0"
                max={selectedItem?.quantity || undefined}
                value={form.actual_qty_completed}
                onChange={(e) => setForm({ ...form, actual_qty_completed: e.target.value })}
                required
              />

              {form.actual_qty_completed && selectedItem && (
                <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Qty Completion %:</span>
                    <span className="font-semibold text-green-700">{qtyCompletionPct.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Physical Progress contribution:</span>
                    <span className="font-semibold text-green-700">{physicalProgressPct.toFixed(4)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(qtyCompletionPct, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : editingRecord ? 'Update' : 'Save Progress'}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
