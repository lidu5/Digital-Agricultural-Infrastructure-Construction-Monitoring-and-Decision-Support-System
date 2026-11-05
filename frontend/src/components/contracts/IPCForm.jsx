import { useState, useEffect, useCallback } from 'react'
import { X, Info } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function IPCForm({ contractId, onClose, onSuccess, editingIPC = null }) {
  const [loading, setLoading] = useState(false)
  const [retentionRate, setRetentionRate] = useState(null)
  const [advanceRecoveryRate, setAdvanceRecoveryRate] = useState(null)
  const [formData, setFormData] = useState({
    contract: contractId,
    ipc_number: '',
    ipc_date: '',
    certified_amount: '',
    paid_amount: '',
    retention_amount: '',
    advance_deduction: '',
  })

  useEffect(() => {
    api.get(`/contracts/contracts/${contractId}/`)
      .then((res) => {
        setRetentionRate(res.data.retention_rate ?? null)
        setAdvanceRecoveryRate(res.data.advance_payment_recovery_rate ?? null)
      })
      .catch(() => { })
  }, [contractId])

  useEffect(() => {
    if (editingIPC) {
      setFormData({
        contract: editingIPC.contract,
        ipc_number: editingIPC.ipc_number || '',
        ipc_date: editingIPC.ipc_date || '',
        certified_amount: editingIPC.certified_amount || '',
        paid_amount: editingIPC.paid_amount || '',
        retention_amount: editingIPC.retention_amount || '',
        advance_deduction: editingIPC.advance_deduction || '',
      })
    }
  }, [editingIPC])

  const recompute = useCallback((next) => {
    const certified = parseFloat(next.certified_amount) || 0

    const retRate = retentionRate !== null ? parseFloat(retentionRate) : null
    const retention = retRate !== null
      ? parseFloat((certified * retRate / 100).toFixed(2))
      : parseFloat(next.retention_amount) || 0

    const advRate = advanceRecoveryRate !== null ? parseFloat(advanceRecoveryRate) : null
    const deduction = advRate !== null
      ? parseFloat((certified * advRate / 100).toFixed(2))
      : parseFloat(next.advance_deduction) || 0

    const paid = parseFloat((certified - retention - deduction).toFixed(2))

    return {
      ...next,
      retention_amount: retention >= 0 ? String(retention) : '0',
      advance_deduction: deduction >= 0 ? String(deduction) : '0',
      paid_amount: paid >= 0 ? String(paid) : '0',
    }
  }, [retentionRate, advanceRecoveryRate])

  const handleChange = (field, value) => {
    setFormData((prev) => recompute({ ...prev, [field]: value }))
  }

  // Rates arrive asynchronously — recompute once they load so a certified
  // amount typed before the fetch resolved still gets deductions applied.
  useEffect(() => {
    if (retentionRate !== null || advanceRecoveryRate !== null) {
      setFormData((prev) => recompute(prev))
    }
  }, [retentionRate, advanceRecoveryRate, recompute])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = { ...formData }
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') payload[key] = null
      })

      let saved
      if (editingIPC) {
        const res = await api.put(`/contracts/ipcs/${editingIPC.ipc_id}/`, payload)
        saved = res.data
      } else {
        const res = await api.post('/contracts/ipcs/', payload)
        saved = res.data
      }

      onSuccess(saved)
      onClose()
    } catch (err) {
      console.error('Failed to save IPC:', err)
      const errorMsg = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : 'Unknown error'
      alert('Failed to save IPC:\n' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{editingIPC ? 'Edit IPC' : 'Add Interim Payment Certificate'}</CardTitle>
              <button onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(retentionRate !== null || advanceRecoveryRate !== null) && (
                <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {[retentionRate !== null && `Retention (${retentionRate}%)`, advanceRecoveryRate !== null && `Advance Deduction (${advanceRecoveryRate}%)`]
                      .filter(Boolean).join(' and ')}{' '}
                    and Paid Amount are auto-computed from the Certified Amount.
                  </span>
                </div>
              )}
              <Input
                label="IPC Number"
                value={formData.ipc_number}
                onChange={(e) => handleChange('ipc_number', e.target.value)}
                placeholder="e.g., IPC1"
                required
              />
              <Input
                label="IPC Date"
                type="date"
                value={formData.ipc_date}
                onChange={(e) => handleChange('ipc_date', e.target.value)}
              />
              <Input
                label="Certified Amount (ETB)"
                type="number"
                step="0.01"
                value={formData.certified_amount}
                onChange={(e) => handleChange('certified_amount', e.target.value)}
                required
              />
              <Input
                label={`Advance Deduction (ETB)${advanceRecoveryRate !== null ? ` — auto (${advanceRecoveryRate}%)` : ''}`}
                type="number"
                step="0.01"
                min="0"
                value={formData.advance_deduction}
                onChange={(e) => handleChange('advance_deduction', e.target.value)}
                placeholder="Amount recovered from advance in this IPC"
                readOnly={advanceRecoveryRate !== null}
                className={advanceRecoveryRate !== null ? 'bg-slate-50 text-slate-500' : ''}
              />
              <Input
                label={`Retention Amount (ETB)${retentionRate !== null ? ` — auto (${retentionRate}%)` : ''}`}
                type="number"
                step="0.01"
                value={formData.retention_amount}
                onChange={(e) => handleChange('retention_amount', e.target.value)}
                readOnly={retentionRate !== null}
                className={retentionRate !== null ? 'bg-slate-50 text-slate-500' : ''}
              />
              <Input
                label="Paid Amount (ETB) — auto-computed"
                type="number"
                step="0.01"
                value={formData.paid_amount}
                onChange={(e) => handleChange('paid_amount', e.target.value)}
                readOnly
                className="bg-slate-50 text-slate-500"
              />

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : (editingIPC ? 'Update' : 'Create')}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
