import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function IPCForm({ contractId, onClose, onSuccess, editingIPC = null }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    contract: contractId,
    ipc_number: '',
    ipc_date: '',
    certified_amount: '',
    paid_amount: '',
    retention_amount: '',
  })

  useEffect(() => {
    if (editingIPC) {
      setFormData({
        contract: editingIPC.contract,
        ipc_number: editingIPC.ipc_number || '',
        ipc_date: editingIPC.ipc_date || '',
        certified_amount: editingIPC.certified_amount || '',
        paid_amount: editingIPC.paid_amount || '',
        retention_amount: editingIPC.retention_amount || '',
      })
    }
  }, [editingIPC])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = { ...formData }
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') payload[key] = null
      })

      if (editingIPC) {
        await api.put(`/contracts/ipcs/${editingIPC.ipc_id}/`, payload)
      } else {
        await api.post('/contracts/ipcs/', payload)
      }

      onSuccess()
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
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
              <Input
                label="IPC Number"
                value={formData.ipc_number}
                onChange={(e) => setFormData({ ...formData, ipc_number: e.target.value })}
                placeholder="e.g., IPC1"
                required
              />
              <Input
                label="IPC Date"
                type="date"
                value={formData.ipc_date}
                onChange={(e) => setFormData({ ...formData, ipc_date: e.target.value })}
              />
              <Input
                label="Certified Amount (ETB)"
                type="number"
                step="0.01"
                value={formData.certified_amount}
                onChange={(e) => setFormData({ ...formData, certified_amount: e.target.value })}
                required
              />
              <Input
                label="Paid Amount (ETB)"
                type="number"
                step="0.01"
                value={formData.paid_amount}
                onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
              />
              <Input
                label="Retention Amount (ETB)"
                type="number"
                step="0.01"
                value={formData.retention_amount}
                onChange={(e) => setFormData({ ...formData, retention_amount: e.target.value })}
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
