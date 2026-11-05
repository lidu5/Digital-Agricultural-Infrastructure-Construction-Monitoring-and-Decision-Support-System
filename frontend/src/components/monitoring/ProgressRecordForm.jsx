import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const daysBetween = (from, to) => Math.round((new Date(to) - new Date(from)) / MS_PER_DAY)

const contractDefaults = (contract, recordDate) => {
  const completion = contract.revised_completion_date || contract.original_completion_date
  let totalDays = ''
  if (contract.commencement_date && completion) {
    totalDays = Math.max(daysBetween(contract.commencement_date, completion), 0)
  } else if (contract.contract_duration_months) {
    totalDays = Math.round(contract.contract_duration_months * 30.44)
  }

  const elapsedDays = contract.commencement_date && recordDate
    ? Math.max(daysBetween(contract.commencement_date, recordDate), 0)
    : ''

  return {
    total_contract_quantity: contract.contract_quantity || '',
    contract_amount_snapshot: contract.revised_contract_amount || contract.contract_amount || '',
    total_duration_days: totalDays,
    elapsed_duration_days: elapsedDays,
  }
}

export default function ProgressRecordForm({ project, onClose, onSuccess, editingRecord = null }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [contracts, setContracts] = useState([])

  const fromRecord = (name) => editingRecord?.[name] ?? ''

  const [formData, setFormData] = useState({
    project: project.project_id,
    contract: fromRecord('contract'),
    record_date: editingRecord?.record_date || new Date().toISOString().split('T')[0],
    actual_quantity_completed: fromRecord('actual_quantity_completed'),
    total_contract_quantity: fromRecord('total_contract_quantity'),
    certified_amount: fromRecord('certified_amount'),
    contract_amount_snapshot: fromRecord('contract_amount_snapshot'),
    elapsed_duration_days: fromRecord('elapsed_duration_days'),
    total_duration_days: fromRecord('total_duration_days'),
  })

  useEffect(() => {
    loadContracts()
  }, [project])

  const loadContracts = async () => {
    try {
      const res = await api.get(`/contracts/contracts/?project=${project.project_id}`)
      setContracts(res.data)
      
      // Auto-select first contract if available (new records only)
      if (!editingRecord && res.data.length > 0) {
        const contract = res.data[0]
        setFormData(prev => ({
          ...prev,
          contract: contract.contract_id,
          ...contractDefaults(contract, prev.record_date),
        }))
      }
    } catch (err) {
      console.error('Failed to load contracts:', err)
    }
  }

  const handleContractChange = (contractId) => {
    const contract = contracts.find(c => c.contract_id === contractId)
    if (contract) {
      setFormData(prev => ({
        ...prev,
        contract: contractId,
        ...contractDefaults(contract, prev.record_date),
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        contract: contractId,
      }))
    }
  }

  const handleRecordDateChange = (recordDate) => {
    setFormData(prev => {
      const contract = contracts.find(c => c.contract_id === prev.contract)
      return {
        ...prev,
        record_date: recordDate,
        ...(contract ? { elapsed_duration_days: contractDefaults(contract, recordDate).elapsed_duration_days } : {}),
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = { ...formData }
      
      // Convert empty strings to null
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null
        }
      })

      if (editingRecord) {
        await api.patch(`/monitoring/progress-records/${editingRecord.record_id}/`, payload)
      } else {
        payload.recorded_by = user.user_id
        await api.post('/monitoring/progress-records/', payload)
      }
      
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save progress record:', err)
      console.error('Error response:', err.response?.data)
      
      // Check for unique constraint error
      if (err.response?.data?.non_field_errors) {
        const errors = err.response.data.non_field_errors
        if (errors.some(e => e.includes('unique'))) {
          alert('A progress record already exists for this project on this date.\n\nPlease choose a different date or edit the existing record.')
          return
        }
      }
      
      const errorMsg = err.response?.data 
        ? JSON.stringify(err.response.data, null, 2)
        : 'Unknown error'
      alert('Failed to save progress record:\n' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Calculate percentages for preview
  const physicalPct = formData.total_contract_quantity && formData.actual_quantity_completed
    ? ((parseFloat(formData.actual_quantity_completed) / parseFloat(formData.total_contract_quantity)) * 100).toFixed(2)
    : 0

  const financialPct = formData.contract_amount_snapshot && formData.certified_amount
    ? ((parseFloat(formData.certified_amount) / parseFloat(formData.contract_amount_snapshot)) * 100).toFixed(2)
    : 0

  const timePct = formData.total_duration_days && formData.elapsed_duration_days
    ? ((parseFloat(formData.elapsed_duration_days) / parseFloat(formData.total_duration_days)) * 100).toFixed(2)
    : 0

  // Once a contract is picked, the backend rolls progress up from measured
  // contract data (BOQ quantities, certified IPCs, contract dates) — manual
  // entry only applies when there is no contract.
  const hasContract = Boolean(formData.contract)
  const selectedContract = contracts.find((c) => c.contract_id === formData.contract)

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{editingRecord ? 'Edit Progress Record' : 'Add Progress Record'}</CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {project.project_code} - {project.project_name}
                </p>
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
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Record Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contract
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      value={formData.contract}
                      onChange={(e) => handleContractChange(e.target.value)}
                    >
                      <option value="">No Contract (Optional)</option>
                      {contracts.map((c) => (
                        <option key={c.contract_id} value={c.contract_id}>
                          {c.contract_number} - {c.contractor_org_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Record Date"
                    type="date"
                    value={formData.record_date}
                    onChange={(e) => handleRecordDateChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Contract-linked record: show measured snapshot, hide manual inputs */}
              {hasContract && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Progress Snapshot</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <div className="text-xs font-medium text-emerald-700">Physical (measured)</div>
                      <div className="text-xl font-extrabold text-emerald-800 mt-1">
                        {Number(selectedContract?.physical_progress_pct || 0).toFixed(2)}%
                      </div>
                      <div className="text-[11px] text-emerald-700/70 mt-1">From BOQ item quantities</div>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="text-xs font-medium text-blue-700">Financial (certified)</div>
                      <div className="text-xl font-extrabold text-blue-800 mt-1">
                        {Number(selectedContract?.financial_progress_pct || 0).toFixed(2)}%
                      </div>
                      <div className="text-[11px] text-blue-700/70 mt-1">From certified IPCs</div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="text-xs font-medium text-amber-700">Time elapsed</div>
                      <div className="text-xl font-extrabold text-amber-800 mt-1">{timePct}%</div>
                      <div className="text-[11px] text-amber-700/70 mt-1">
                        {formData.elapsed_duration_days || 0} of {formData.total_duration_days || '—'} days
                      </div>
                    </div>
                  </div>
                  {selectedContract && !selectedContract.has_boq_items && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <p className="text-xs text-slate-600">
                        This contract has no BOQ items, so physical progress can't be measured automatically —
                        enter the completed quantity below.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Actual Quantity Completed"
                          type="number"
                          step="0.01"
                          value={formData.actual_quantity_completed}
                          onChange={(e) => setFormData({ ...formData, actual_quantity_completed: e.target.value })}
                          placeholder="e.g., 1500.00"
                        />
                        <Input
                          label="Total Contract Quantity"
                          type="number"
                          step="0.01"
                          value={formData.total_contract_quantity}
                          disabled
                          className="bg-slate-100 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    Values are computed from this contract's BOQ measurements, certified IPCs and contract dates —
                    manual fields are hidden. Choose "No Contract" to enter values manually.
                  </p>
                </div>
              )}

              {!hasContract && (
              <>
              {/* Physical Progress */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Physical Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Actual Quantity Completed"
                    type="number"
                    step="0.01"
                    value={formData.actual_quantity_completed}
                    onChange={(e) => setFormData({ ...formData, actual_quantity_completed: e.target.value })}
                    placeholder="e.g., 1500.00"
                  />
                  <Input
                    label="Total Contract Quantity"
                    type="number"
                    step="0.01"
                    value={formData.total_contract_quantity}
                    onChange={(e) => setFormData({ ...formData, total_contract_quantity: e.target.value })}
                    placeholder="e.g., 5000.00"
                    disabled={hasContract}
                    className={hasContract ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}
                  />
                </div>
                {hasContract && (
                  <p className="mt-1 text-xs text-slate-500">
                    Locked to the selected contract's quantity. Deselect the contract to enter a custom value.
                  </p>
                )}
                {physicalPct > 0 && (
                  <div className="mt-2 text-sm text-slate-600">
                    Physical Progress: <strong>{physicalPct}%</strong>
                  </div>
                )}
              </div>

              {/* Financial Progress */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Certified Amount (ETB)"
                    type="number"
                    step="0.01"
                    value={formData.certified_amount}
                    onChange={(e) => setFormData({ ...formData, certified_amount: e.target.value })}
                    placeholder="e.g., 2500000.00"
                  />
                  <Input
                    label="Contract Amount Snapshot (ETB)"
                    type="number"
                    step="0.01"
                    value={formData.contract_amount_snapshot}
                    onChange={(e) => setFormData({ ...formData, contract_amount_snapshot: e.target.value })}
                    placeholder="e.g., 10000000.00"
                    disabled={hasContract}
                    className={hasContract ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}
                  />
                </div>
                {hasContract && (
                  <p className="mt-1 text-xs text-slate-500">
                    Locked to the selected contract's revised (or original) amount.
                  </p>
                )}
                {financialPct > 0 && (
                  <div className="mt-2 text-sm text-slate-600">
                    Financial Progress: <strong>{financialPct}%</strong>
                  </div>
                )}
              </div>

              {/* Time Progress */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Time Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Elapsed Duration (days)"
                    type="number"
                    value={formData.elapsed_duration_days}
                    onChange={(e) => setFormData({ ...formData, elapsed_duration_days: e.target.value })}
                    placeholder="e.g., 180"
                  />
                  <Input
                    label="Total Duration (days)"
                    type="number"
                    value={formData.total_duration_days}
                    onChange={(e) => setFormData({ ...formData, total_duration_days: e.target.value })}
                    placeholder="e.g., 365"
                  />
                </div>
                {timePct > 0 && (
                  <div className="mt-2 text-sm text-slate-600">
                    Time Progress: <strong>{timePct}%</strong>
                  </div>
                )}
              </div>
              </>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> After saving this progress record, the project status will be automatically updated based on the progress percentages.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : (editingRecord ? 'Update Progress Record' : 'Save Progress Record')}
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
