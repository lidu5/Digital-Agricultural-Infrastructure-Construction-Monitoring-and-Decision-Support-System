import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

export default function ContractForm({ project, onClose, onSuccess, editingContract = null }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [organizations, setOrganizations] = useState({
    contractors: [],
    consultants: [],
  })

  const [formData, setFormData] = useState({
    project: project?.project_id || '',
    contract_number: '',
    contractor_org: '',
    consultant_org: '',
    contract_amount: '',
    contract_quantity: '',
    quantity_unit: '',
    contract_signing_date: '',
    commencement_date: '',
    original_completion_date: '',
    contract_duration_months: '',
    performance_security_amount: '',
    performance_security_expiry: '',
    advance_payment_amount: '',
    advance_payment_recovered: '',
    current_status: 'active',
  })

  useEffect(() => {
    loadOrganizations()
    if (editingContract) {
      setFormData({
        project: editingContract.project || '',
        contract_number: editingContract.contract_number || '',
        contractor_org: editingContract.contractor_org || '',
        consultant_org: editingContract.consultant_org || '',
        contract_amount: editingContract.contract_amount || '',
        contract_quantity: editingContract.contract_quantity || '',
        quantity_unit: editingContract.quantity_unit || '',
        contract_signing_date: editingContract.contract_signing_date || '',
        commencement_date: editingContract.commencement_date || '',
        original_completion_date: editingContract.original_completion_date || '',
        contract_duration_months: editingContract.contract_duration_months || '',
        performance_security_amount: editingContract.performance_security_amount || '',
        performance_security_expiry: editingContract.performance_security_expiry || '',
        advance_payment_amount: editingContract.advance_payment_amount || '',
        advance_payment_recovered: editingContract.advance_payment_recovered || '',
        current_status: editingContract.current_status || 'active',
      })
    }
  }, [editingContract])

  const loadOrganizations = async () => {
    try {
      const res = await api.get('/accounts/organizations/')
      const contractors = res.data.filter(org => org.org_type === 'contractor')
      const consultants = res.data.filter(org => org.org_type === 'consultant')
      setOrganizations({ contractors, consultants })
    } catch (err) {
      console.error('Failed to load organizations:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = { ...formData }
      
      // Convert empty strings to null
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' && key !== 'quantity_unit') {
          payload[key] = null
        }
      })

      if (editingContract) {
        await api.put(`/contracts/contracts/${editingContract.contract_id}/`, payload)
      } else {
        await api.post('/contracts/contracts/', payload)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save contract:', err)
      console.error('Error response:', err.response?.data)
      const errorMsg = err.response?.data 
        ? JSON.stringify(err.response.data, null, 2)
        : 'Unknown error'
      alert('Failed to save contract:\n' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{editingContract ? 'Edit Contract' : 'Create New Contract'}</CardTitle>
                {project && (
                  <p className="text-sm text-slate-600 mt-1">
                    {project.project_code} - {project.project_name}
                  </p>
                )}
              </div>
              <button onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Contract Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contract Number"
                    value={formData.contract_number}
                    onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                    required
                    placeholder="e.g., CNT-2024-001"
                  />
                  <Select
                    label="Contract Status"
                    value={formData.current_status}
                    onChange={(e) => setFormData({ ...formData, current_status: e.target.value })}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="completed">Completed</option>
                    <option value="terminated">Terminated</option>
                  </Select>
                </div>
              </div>

              {/* Parties */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Contracting Parties</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Contractor"
                    value={formData.contractor_org}
                    onChange={(e) => setFormData({ ...formData, contractor_org: e.target.value })}
                    required
                  >
                    <option value="">Select Contractor</option>
                    {organizations.contractors.map((org) => (
                      <option key={org.org_id} value={org.org_id}>{org.name}</option>
                    ))}
                  </Select>
                  <Select
                    label="Consultant (Optional)"
                    value={formData.consultant_org}
                    onChange={(e) => setFormData({ ...formData, consultant_org: e.target.value })}
                  >
                    <option value="">Select Consultant</option>
                    {organizations.consultants.map((org) => (
                      <option key={org.org_id} value={org.org_id}>{org.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Financial Details */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contract Amount (ETB)"
                    type="number"
                    step="0.01"
                    value={formData.contract_amount}
                    onChange={(e) => setFormData({ ...formData, contract_amount: e.target.value })}
                    required
                    placeholder="e.g., 10000000.00"
                  />
                  {editingContract && (
                    <div className="w-full">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Revised Contract Amount (ETB)
                      </label>
                      <p className="px-3 py-2 bg-slate-100 text-slate-600 rounded-md text-sm">
                        {editingContract.revised_contract_amount
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                              .format(editingContract.revised_contract_amount)
                          : 'No approved variation orders yet'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Computed automatically from approved variation orders.
                      </p>
                    </div>
                  )}
                  <Input
                    label="Total Contract Quantity"
                    type="number"
                    step="0.01"
                    value={formData.contract_quantity}
                    onChange={(e) => setFormData({ ...formData, contract_quantity: e.target.value })}
                    placeholder="e.g., 250"
                  />
                  <Input
                    label="Quantity Unit"
                    value={formData.quantity_unit}
                    onChange={(e) => setFormData({ ...formData, quantity_unit: e.target.value })}
                    placeholder="e.g., ha, km, m3"
                  />
                  <Input
                    label="Advance Payment Amount (ETB)"
                    type="number"
                    step="0.01"
                    value={formData.advance_payment_amount}
                    onChange={(e) => setFormData({ ...formData, advance_payment_amount: e.target.value })}
                    placeholder="e.g., 1000000.00"
                  />
                  <Input
                    label="Advance Payment Recovered (ETB)"
                    type="number"
                    step="0.01"
                    value={formData.advance_payment_recovered}
                    onChange={(e) => setFormData({ ...formData, advance_payment_recovered: e.target.value })}
                    placeholder="Amount recovered"
                  />
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Contract Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contract Signing Date"
                    type="date"
                    value={formData.contract_signing_date}
                    onChange={(e) => setFormData({ ...formData, contract_signing_date: e.target.value })}
                  />
                  <Input
                    label="Commencement Date"
                    type="date"
                    value={formData.commencement_date}
                    onChange={(e) => setFormData({ ...formData, commencement_date: e.target.value })}
                  />
                  <Input
                    label="Original Completion Date"
                    type="date"
                    value={formData.original_completion_date}
                    onChange={(e) => setFormData({ ...formData, original_completion_date: e.target.value })}
                  />
                  {editingContract && (
                    <div className="w-full">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Revised Completion Date
                      </label>
                      <p className="px-3 py-2 bg-slate-100 text-slate-600 rounded-md text-sm">
                        {editingContract.revised_completion_date
                          ? new Date(editingContract.revised_completion_date).toLocaleDateString()
                          : 'No approved extensions of time yet'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Computed automatically from approved extensions of time.
                      </p>
                    </div>
                  )}
                  <Input
                    label="Contract Duration (months)"
                    type="number"
                    value={formData.contract_duration_months}
                    onChange={(e) => setFormData({ ...formData, contract_duration_months: e.target.value })}
                    placeholder="e.g., 12"
                  />
                </div>
              </div>

              {/* Performance Security */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Security</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Performance Security Amount (ETB)"
                    type="number"
                    step="0.01"
                    value={formData.performance_security_amount}
                    onChange={(e) => setFormData({ ...formData, performance_security_amount: e.target.value })}
                    placeholder="e.g., 500000.00"
                  />
                  <Input
                    label="Performance Security Expiry"
                    type="date"
                    value={formData.performance_security_expiry}
                    onChange={(e) => setFormData({ ...formData, performance_security_expiry: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : (editingContract ? 'Update Contract' : 'Create Contract')}
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
