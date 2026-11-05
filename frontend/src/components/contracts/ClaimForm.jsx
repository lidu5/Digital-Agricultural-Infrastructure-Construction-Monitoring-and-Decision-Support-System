import { useState, useEffect } from 'react'
import { X, Paperclip } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

const fileName = (url) => (url ? decodeURIComponent(url.split('/').pop()) : null)

export default function ClaimForm({ contractId, onClose, onSuccess, editingClaim = null }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    contract: contractId,
    requested_date: '',
    approved_date: '',
    claim_amount: '',
    description: '',
    status: 'open',
  })
  const [requestLetter, setRequestLetter] = useState(null)
  const [approvalLetter, setApprovalLetter] = useState(null)

  useEffect(() => {
    if (editingClaim) {
      setFormData({
        contract: editingClaim.contract,
        requested_date: editingClaim.requested_date || '',
        approved_date: editingClaim.approved_date || '',
        claim_amount: editingClaim.claim_amount || '',
        description: editingClaim.description || '',
        status: editingClaim.status || 'open',
      })
    }
  }, [editingClaim])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.status === 'approved' && !formData.approved_date) {
      alert('Approved Date is required when the claim status is Approved.')
      return
    }
    if (formData.status === 'approved' && !approvalLetter && !editingClaim?.approval_letter) {
      alert('An approval letter must be uploaded when the claim status is Approved.')
      return
    }

    setLoading(true)

    try {
      const data = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== null) data.append(key, value)
      })
      if (requestLetter) data.append('request_letter', requestLetter)
      if (approvalLetter) data.append('approval_letter', approvalLetter)

      if (editingClaim) {
        // PATCH so files that weren't re-selected keep their existing values
        await api.patch(`/contracts/claims/${editingClaim.claim_id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await api.post('/contracts/claims/', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Requested Date"
                  type="date"
                  value={formData.requested_date}
                  onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
                />
                <Input
                  label="Approved Date"
                  type="date"
                  value={formData.approved_date}
                  onChange={(e) => setFormData({ ...formData, approved_date: e.target.value })}
                />
              </div>
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

              {/* Request Letter */}
              <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Request Letter
                </label>
                {editingClaim?.request_letter && (
                  <p className="text-xs text-slate-500 mb-1">
                    Current:{' '}
                    <a href={editingClaim.request_letter} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {fileName(editingClaim.request_letter)}
                    </a>
                  </p>
                )}
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-md text-sm text-slate-600 cursor-pointer hover:border-blue-400 hover:text-blue-600">
                  <Paperclip className="w-4 h-4" />
                  <span className="truncate">
                    {requestLetter ? requestLetter.name : 'Choose file…'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setRequestLetter(e.target.files[0] || null)}
                  />
                </label>
              </div>

              {/* Approval Letter */}
              <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Approval Letter
                </label>
                {editingClaim?.approval_letter && (
                  <p className="text-xs text-slate-500 mb-1">
                    Current:{' '}
                    <a href={editingClaim.approval_letter} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {fileName(editingClaim.approval_letter)}
                    </a>
                  </p>
                )}
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-md text-sm text-slate-600 cursor-pointer hover:border-blue-400 hover:text-blue-600">
                  <Paperclip className="w-4 h-4" />
                  <span className="truncate">
                    {approvalLetter ? approvalLetter.name : 'Choose file…'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setApprovalLetter(e.target.files[0] || null)}
                  />
                </label>
                {formData.status === 'approved' && (
                  <p className="mt-1 text-xs text-amber-600">
                    Required — this claim is marked as approved.
                  </p>
                )}
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
