import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '../../api'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)

export default function FinancialProgressForm({ contractId, ipcs, preselectedItemId, editingLineItem, onClose, onSuccess }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({
    boq_item: preselectedItemId || editingLineItem?.boq_item || '',
    ipc: editingLineItem?.ipc || '',
    certified_amount_etb: editingLineItem?.certified_amount_etb || '',
    remarks: editingLineItem?.remarks || ''
  })
  const [saving, setSaving] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    api.get(`/contracts/boq-items/?contract=${contractId}`)
      .then((res) => {
        setItems(res.data)
        const matchId = preselectedItemId || editingLineItem?.boq_item
        if (matchId) {
          setSelectedItem(res.data.find((i) => i.item_id === matchId) || null)
        }
      })
      .catch(console.error)
  }, [contractId, preselectedItemId, editingLineItem])

  useEffect(() => {
    if (form.boq_item) {
      setSelectedItem(items.find((i) => i.item_id === form.boq_item) || null)
    } else {
      setSelectedItem(null)
    }
  }, [form.boq_item, items])

  const certified = parseFloat(form.certified_amount_etb) || 0
  const totalPrice = parseFloat(selectedItem?.total_price_etb) || 0
  const alreadyCertified = parseFloat(selectedItem?.cumulative_certified_etb || 0)
  const editingCertified = parseFloat(editingLineItem?.certified_amount_etb || 0)
  const otherCertified = alreadyCertified - editingCertified
  const financialProgressPct = totalPrice > 0 ? Math.min((certified / totalPrice) * 100, 100) : 0
  const cumulativePct = totalPrice > 0 ? Math.min(((otherCertified + certified) / totalPrice) * 100, 100) : 0
  const remaining = totalPrice - otherCertified

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingLineItem) {
        await api.put(`/contracts/ipc-line-items/${editingLineItem.line_item_id}/`, form)
      } else {
        await api.post('/contracts/ipc-line-items/', form)
      }
      onSuccess()
      onClose()
    } catch (err) {
      alert('Failed to save IPC line item:\n' + JSON.stringify(err.response?.data || err.message, null, 2))
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
              <CardTitle>{editingLineItem ? 'Edit IPC Line Item' : 'Add IPC Line Item'}</CardTitle>
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
                <option value="">— Select BOQ item —</option>
                {items.map((item) => (
                  <option key={item.item_id} value={item.item_id}>
                    {item.item_no} — {item.description}
                  </option>
                ))}
              </Select>

              {selectedItem && (
                <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Total Price:</span>
                    <span className="font-medium">{fmt(selectedItem.total_price_etb)} ETB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Already Certified (other IPCs):</span>
                    <span className="font-medium">{fmt(otherCertified)} ETB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining:</span>
                    <span className={`font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {fmt(remaining)} ETB
                    </span>
                  </div>
                </div>
              )}

              <Select
                label="IPC"
                value={form.ipc}
                onChange={(e) => setForm({ ...form, ipc: e.target.value })}
                required
              >
                <option value="">— Select IPC —</option>
                {(ipcs || []).map((ipc) => (
                  <option key={ipc.ipc_id} value={ipc.ipc_id}>
                    {ipc.ipc_number}{ipc.ipc_date ? ` (${new Date(ipc.ipc_date).toLocaleDateString()})` : ''}
                  </option>
                ))}
              </Select>

              <Input
                label="Certified Amount (ETB)"
                type="number"
                step="0.01"
                min="0"
                max={remaining > 0 ? remaining : undefined}
                value={form.certified_amount_etb}
                onChange={(e) => setForm({ ...form, certified_amount_etb: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Optional remarks"
                />
              </div>

              {form.certified_amount_etb && selectedItem && (
                <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">This IPC financial progress:</span>
                    <span className="font-semibold text-blue-700">{financialProgressPct.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cumulative financial progress:</span>
                    <span className="font-semibold text-blue-700">{cumulativePct.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(cumulativePct, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : editingLineItem ? 'Update' : 'Add Line Item'}
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
