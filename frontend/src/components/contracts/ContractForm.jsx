import { useState, useEffect } from 'react'
import { X, FileText, Users, Banknote, CalendarDays, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import Card, { CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

export default function ContractForm({ project, onClose, onSuccess, editingContract = null }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
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
    contract_signing_date: '',
    commencement_date: '',
    original_completion_date: '',
    contract_duration_months: '',
    performance_security_amount: '',
    performance_security_expiry: '',
    retention_rate: '',
    advance_payment_amount: '',
    advance_payment_recovery_rate: '',
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
        contract_signing_date: editingContract.contract_signing_date || '',
        commencement_date: editingContract.commencement_date || '',
        original_completion_date: editingContract.original_completion_date || '',
        contract_duration_months: editingContract.contract_duration_months || '',
        performance_security_amount: editingContract.performance_security_amount || '',
        performance_security_expiry: editingContract.performance_security_expiry || '',
        retention_rate: editingContract.retention_rate || '',
        advance_payment_amount: editingContract.advance_payment_amount || '',
        advance_payment_recovery_rate: editingContract.advance_payment_recovery_rate || '',
        current_status: editingContract.current_status || 'active',
      })
    }
  }, [editingContract])

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }

  const computeCompletionDate = (commencement, months) => {
    if (!commencement || !months) return ''
    const d = new Date(commencement)
    if (Number.isNaN(d.getTime())) return ''
    d.setMonth(d.getMonth() + Number(months))
    return d.toISOString().slice(0, 10)
  }

  const handleTimelineChange = (name, value) => {
    const next = { ...formData, [name]: value }
    if (name === 'commencement_date' || name === 'contract_duration_months') {
      const auto = computeCompletionDate(next.commencement_date, next.contract_duration_months)
      if (auto) next.original_completion_date = auto
    }
    setFormData(next)
    setErrors((prev) => ({ ...prev, [name]: undefined, original_completion_date: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!formData.contract_number.trim()) e.contract_number = 'Contract number is required.'
    if (!formData.contractor_org) e.contractor_org = 'Please select a contractor.'
    if (formData.contract_amount === '' || Number(formData.contract_amount) <= 0) {
      e.contract_amount = 'Enter a contract amount greater than 0.'
    }
    const { contract_signing_date: sign, commencement_date: start, original_completion_date: end, contract_duration_months: dur } = formData
    if (sign && start && start < sign) e.commencement_date = 'Commencement cannot be before the signing date.'
    if (start && end && end <= start) e.original_completion_date = 'Completion must be after commencement.'
    if (start && dur && end) {
      const expected = computeCompletionDate(start, dur)
      if (expected && end !== expected) {
        e.original_completion_date = `Must equal Commencement + ${dur} months (${expected}).`
      }
    }
    if (
      formData.performance_security_amount !== '' && formData.contract_amount !== '' &&
      Number(formData.performance_security_amount) > Number(formData.contract_amount)
    ) {
      e.performance_security_amount = 'Cannot exceed the contract amount.'
    }
    return e
  }

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

    const clientErrors = validate()
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) {
      document.getElementById('contract-form-body')?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setLoading(true)

    try {
      const payload = { ...formData }
      
      // Convert empty strings to null
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null
        }
      })
      if (payload.advance_payment_amount === null) payload.advance_payment_amount = 0

      if (editingContract) {
        await api.put(`/contracts/contracts/${editingContract.contract_id}/`, payload)
      } else {
        await api.post('/contracts/contracts/', payload)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save contract:', err)
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const mapped = {}
        Object.entries(data).forEach(([key, val]) => {
          const msg = Array.isArray(val) ? val.join(' ') : String(val)
          mapped[key === 'non_field_errors' || key === 'detail' ? '_form' : key] =
            key === 'contract_number' && msg.includes('unique')
              ? 'This contract number already exists.'
              : msg
        })
        setErrors(mapped)
        document.getElementById('contract-form-body')?.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setErrors({ _form: 'Could not save the contract. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <Card className="w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <CardHeader className="border-b border-slate-200 shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{editingContract ? 'Edit Contract' : 'Create New Contract'}</CardTitle>
              {project && (
                <p className="text-sm text-slate-600 mt-1">
                  {project.project_code} - {project.project_name}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">Fields marked with * are required.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1 rounded hover:bg-slate-100 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col min-h-0 flex-1">
          <div className="overflow-y-auto flex-1 px-6 py-4" id="contract-form-body">
            <div className="space-y-6">
              {(errors._form || Object.keys(errors).some((k) => k !== '_form' && errors[k])) && (
                <div className="flex gap-2 items-start rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errors._form || 'Please fix the highlighted fields below.'}</span>
                </div>
              )}

              {/* Basic Information */}
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-3">
                  <FileText className="w-4 h-4 text-blue-600" /> Contract Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contract Number *"
                    value={formData.contract_number}
                    onChange={(e) => setField('contract_number', e.target.value)}
                    error={errors.contract_number}
                    placeholder="e.g., CNT-2024-001"
                    autoFocus
                  />
                  <Select
                    label="Contract Status"
                    value={formData.current_status}
                    onChange={(e) => setField('current_status', e.target.value)}
                    error={errors.current_status}
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
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-3">
                  <Users className="w-4 h-4 text-blue-600" /> Contracting Parties
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Contractor *"
                    value={formData.contractor_org}
                    onChange={(e) => setField('contractor_org', e.target.value)}
                    error={errors.contractor_org}
                  >
                    <option value="">Select Contractor</option>
                    {organizations.contractors.map((org) => (
                      <option key={org.org_id} value={org.org_id}>{org.name}</option>
                    ))}
                  </Select>
                  <Select
                    label="Consultant (Optional)"
                    value={formData.consultant_org}
                    onChange={(e) => setField('consultant_org', e.target.value)}
                    error={errors.consultant_org}
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
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-3">
                  <Banknote className="w-4 h-4 text-blue-600" /> Financial Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contract Amount (ETB) *"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.contract_amount}
                    onChange={(e) => setField('contract_amount', e.target.value)}
                    error={errors.contract_amount}
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
                    label="Retention Rate (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.retention_rate}
                    onChange={(e) => setField('retention_rate', e.target.value)}
                    error={errors.retention_rate}
                    placeholder="e.g., 5.00"
                  />
                  <Input
                    label="Advance Payment Amount (ETB)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.advance_payment_amount}
                    onChange={(e) => setField('advance_payment_amount', e.target.value)}
                    error={errors.advance_payment_amount}
                    placeholder="e.g., 1000000.00"
                  />
                  <Input
                    label="Advance Payment Recovery Rate (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.advance_payment_recovery_rate}
                    onChange={(e) => setField('advance_payment_recovery_rate', e.target.value)}
                    error={errors.advance_payment_recovery_rate}
                    placeholder="e.g., 20.00"
                  />
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-3">
                  <CalendarDays className="w-4 h-4 text-blue-600" /> Contract Timeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contract Signing Date"
                    type="date"
                    value={formData.contract_signing_date}
                    onChange={(e) => setField('contract_signing_date', e.target.value)}
                    error={errors.contract_signing_date}
                  />
                  <Input
                    label="Commencement Date"
                    type="date"
                    value={formData.commencement_date}
                    onChange={(e) => handleTimelineChange('commencement_date', e.target.value)}
                    error={errors.commencement_date}
                  />
                  <Input
                    label="Original Completion Date"
                    type="date"
                    value={formData.original_completion_date}
                    onChange={(e) => setField('original_completion_date', e.target.value)}
                    error={errors.original_completion_date}
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
                    min="1"
                    value={formData.contract_duration_months}
                    onChange={(e) => handleTimelineChange('contract_duration_months', e.target.value)}
                    error={errors.contract_duration_months}
                    placeholder="e.g., 12"
                  />
                  {!editingContract && (
                    <p className="md:col-span-2 text-xs text-slate-500 -mt-2">
                      Tip: enter the commencement date and duration and the completion date is filled in for you.
                    </p>
                  )}
                </div>
              </div>

              {/* Performance Security */}
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-3">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Performance Security
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Performance Security Amount (ETB)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.performance_security_amount}
                    onChange={(e) => setField('performance_security_amount', e.target.value)}
                    error={errors.performance_security_amount}
                    placeholder="e.g., 500000.00"
                  />
                  <Input
                    label="Performance Security Expiry"
                    type="date"
                    value={formData.performance_security_expiry}
                    onChange={(e) => setField('performance_security_expiry', e.target.value)}
                    error={errors.performance_security_expiry}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : (editingContract ? 'Update Contract' : 'Create Contract')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
