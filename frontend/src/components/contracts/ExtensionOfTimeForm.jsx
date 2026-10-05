import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function ExtensionOfTimeForm({ contractId, onClose, onSuccess, editingEOT = null }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    contract: contractId,
    eot_number: '',
    approved_days: '',
    approved_date: '',
    reason: '',
  })

  useEffect(() => {
    if (editingEOT) {
      setFormData({
        contract: editingEOT.contract,
        eot_number: editingEOT.eot_number || '',
        approved_days: editingEOT.approved_days || '',
        approved_date: editingEOT.approved_date || '',
        reason: editingEOT.reason || '',
      })
    }
  }, [editingEOT])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = { ...formData }
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '' && key !== 'reason') payload[key] = null
      })

      if (editingEOT) {
        await api.put(`/contracts/extensions-of-time/${editingEOT.eot_id}/`, payload)
      } else {
        await api.post('/contracts/extensions-of-time/', payload)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save extension of time:', err)
      const errorMsg = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : 'Unknown error'
      alert('Failed to save extension of time:\n' + errorMsg)
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
              <CardTitle>{editingEOT ? 'Edit Extension of Time' : 'Add Extension of Time'}</CardTitle>
              <button onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="EoT Number"
                value={formData.eot_number}
                onChange={(e) => setFormData({ ...formData, eot_number: e.target.value })}
                placeholder="e.g., EoT1"
                required
              />
              <Input
                label="Approved Days"
                type="number"
                value={formData.approved_days}
                onChange={(e) => setFormData({ ...formData, approved_days: e.target.value })}
                required
              />
              <Input
                label="Approved Date"
                type="date"
                value={formData.approved_date}
                onChange={(e) => setFormData({ ...formData, approved_date: e.target.value })}
              />
              <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : (editingEOT ? 'Update' : 'Create')}
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
