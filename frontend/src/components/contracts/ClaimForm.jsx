import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

export default function ClaimForm({ contractId, onClose, onSuccess, editingClaim = null }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    contract: contractId,
    claim_date: '',
    claim_amount: '',
    description: '',
    status: 'open',
  })

  useEffect(() => {
    if (editingClaim) {
      setFormData({
        contract: editingClaim.contract,
        claim_date: editingClaim.claim_date || '',
        claim_amount: editingClaim.claim_amount || '',
        description: editingClaim.description || '',
        status: editingClaim.status || 'open',
      })
    }
  }, [editingClaim])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = { ...formData }
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '' && key !== 'description') payload[key] = null
      })

      if (editingClaim) {
        await api.put(`/contracts/claims/${editingClaim.claim_id}/`, payload)
      } else {
        await api.post('/contracts/claims/', payload)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save claim:', err)
      const errorMsg = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : 'Unknown error'
      alert('Failed to save claim:\n' + errorMsg)
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
              <CardTitle>{editingClaim ? 'Edit Claim' : 'Add Claim'}</CardTitle>
              <button onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Claim Date"
                type="date"
                value={formData.claim_date}
                onChange={(e) => setFormData({ ...formData, claim_date: e.target.value })}
              />
              <Input
                label="Claim Amount (ETB)"
                type="number"
                step="0.01"
                value={formData.claim_amount}
                onChange={(e) => setFormData({ ...formData, claim_amount: e.target.value })}
                required
              />
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="open">Open</option>
                <option value="under_review">Under review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
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
                  {loading ? 'Saving...' : (editingClaim ? 'Update' : 'Create')}
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
