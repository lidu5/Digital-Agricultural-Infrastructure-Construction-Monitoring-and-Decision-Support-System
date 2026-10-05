import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function VariationOrderForm({ contractId, onClose, onSuccess, editingVO = null }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    contract: contractId,
    vo_number: '',
    value: '',
    approved_date: '',
    description: '',
  })

  useEffect(() => {
    if (editingVO) {
      setFormData({
        contract: editingVO.contract,
        vo_number: editingVO.vo_number || '',
        value: editingVO.value || '',
        approved_date: editingVO.approved_date || '',
        description: editingVO.description || '',
      })
    }
  }, [editingVO])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = { ...formData }
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') payload[key] = null
      })

      if (editingVO) {
        await api.put(`/contracts/variation-orders/${editingVO.vo_id}/`, payload)
      } else {
        await api.post('/contracts/variation-orders/', payload)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save variation order:', err)
      const errorMsg = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : 'Unknown error'
      alert('Failed to save variation order:\n' + errorMsg)
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
              <CardTitle>{editingVO ? 'Edit Variation Order' : 'Add Variation Order'}</CardTitle>
              <button onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="VO Number"
                value={formData.vo_number}
                onChange={(e) => setFormData({ ...formData, vo_number: e.target.value })}
                placeholder="e.g., VO1"
                required
              />
              <Input
                label="Value (ETB)"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Positive to increase, negative to decrease"
                required
              />
              <Input
                label="Approved Date"
                type="date"
                value={formData.approved_date}
                onChange={(e) => setFormData({ ...formData, approved_date: e.target.value })}
              />
              <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : (editingVO ? 'Update' : 'Create')}
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
