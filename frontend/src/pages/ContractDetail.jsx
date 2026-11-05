import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, Clock, DollarSign, Plus, Pencil, Trash2, BarChart2 } from 'lucide-react'
import api from '../api'
import { useAuth } from '../contexts/AuthContext'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import ContractForm from '../components/contracts/ContractForm'
import VariationOrderForm from '../components/contracts/VariationOrderForm'
import ExtensionOfTimeForm from '../components/contracts/ExtensionOfTimeForm'
import IPCForm from '../components/contracts/IPCForm'
import ClaimForm from '../components/contracts/ClaimForm'
import BOQTab from '../components/contracts/BOQTab'
import PhysicalProgressForm from '../components/contracts/PhysicalProgressForm'
import FinancialProgressForm from '../components/contracts/FinancialProgressForm'
import IPCBreakdownForm from '../components/contracts/IPCBreakdownForm'

export default function ContractDetail() {
  const { id } = useParams()
  const { isAdmin, isRegionalManager } = useAuth()
  const canEdit = isAdmin || isRegionalManager
  const [contract, setContract] = useState(null)
  const [variationOrders, setVariationOrders] = useState([])
  const [extensionsOfTime, setExtensionsOfTime] = useState([])
  const [ipcs, setIpcs] = useState([])
  const [claims, setClaims] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  const [showVOForm, setShowVOForm] = useState(false)
  const [editingVO, setEditingVO] = useState(null)
  const [showEOTForm, setShowEOTForm] = useState(false)
  const [editingEOT, setEditingEOT] = useState(null)
  const [showIPCForm, setShowIPCForm] = useState(false)
  const [editingIPC, setEditingIPC] = useState(null)
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [editingClaim, setEditingClaim] = useState(null)
  const [showContractForm, setShowContractForm] = useState(false)

  const [showPhysicalProgressForm, setShowPhysicalProgressForm] = useState(false)
  const [preselectPhysicalItem, setPreselectPhysicalItem] = useState(null)
  const [editingPhysicalRecord, setEditingPhysicalRecord] = useState(null)
  const [showFinancialProgressForm, setShowFinancialProgressForm] = useState(false)
  const [editingLineItem, setEditingLineItem] = useState(null)
  const [preselectFinancialItem, setPreselectFinancialItem] = useState(null)
  const [physicalProgressHistory, setPhysicalProgressHistory] = useState([])
  const [financialLineItems, setFinancialLineItems] = useState([])
  const [boqRefreshKey, setBoqRefreshKey] = useState(0)
  const [pendingIPCBreakdown, setPendingIPCBreakdown] = useState(null)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get(`/contracts/contracts/${id}/`),
      api.get(`/contracts/variation-orders/?contract=${id}`),
      api.get(`/contracts/extensions-of-time/?contract=${id}`),
      api.get(`/contracts/ipcs/?contract=${id}`),
      api.get(`/contracts/claims/?contract=${id}`),
      api.get(`/contracts/physical-progress/?contract=${id}`),
      api.get(`/contracts/ipc-line-items/?contract=${id}`),
    ])
      .then(([contractRes, voRes, eotRes, ipcRes, claimRes, physRes, finRes]) => {
        setContract(contractRes.data)
        setVariationOrders(voRes.data)
        setExtensionsOfTime(eotRes.data)
        setIpcs(ipcRes.data)
        setClaims(claimRes.data)
        setPhysicalProgressHistory(physRes.data)
        setFinancialLineItems(finRes.data)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleDelete = async (endpoint, itemId, label) => {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return
    try {
      await api.delete(`/contracts/${endpoint}/${itemId}/`)
      loadData()
      setBoqRefreshKey((k) => k + 1)
    } catch (err) {
      console.error(`Failed to delete ${label}:`, err)
      alert(`Failed to delete ${label}.`)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading contract details...</div>
  }

  if (!contract) {
    return <div className="text-center py-12">Contract not found</div>
  }

  const totalCertified = ipcs.reduce((sum, ipc) => sum + parseFloat(ipc.certified_amount || 0), 0)
  const totalPaid = ipcs.reduce((sum, ipc) => sum + parseFloat(ipc.paid_amount || 0), 0)
  const totalRetention = ipcs.reduce((sum, ipc) => sum + parseFloat(ipc.retention_amount || 0), 0)
  const totalAdvanceDeduction = ipcs.reduce((sum, ipc) => sum + parseFloat(ipc.advance_deduction || 0), 0)
  const totalDeductions = totalRetention + totalAdvanceDeduction
  const netPayable = totalCertified - totalDeductions
  const unpaidCertified = totalCertified - totalPaid
  const contractValue = parseFloat(contract.revised_contract_amount || contract.contract_amount || 0)
  const remainingToCertify = contractValue - totalCertified
  const advanceBalance = parseFloat(contract.advance_payment_amount || 0) - totalAdvanceDeduction
  const financialProgressPct = contractValue > 0 ? Math.min((totalCertified / contractValue) * 100, 100) : parseFloat(contract.financial_progress_pct || 0)

  const etb = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n)
  const Row = ({ label, value, plain, valueClass = 'text-slate-900' }) => (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={valueClass}>{plain !== undefined ? plain : etb(value ?? 0)}</span>
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'variations', label: `Variation Orders (${variationOrders.length})` },
    { id: 'extensions', label: `Extensions of Time (${extensionsOfTime.length})` },
    { id: 'payments', label: `IPCs (${ipcs.length})` },
    { id: 'claims', label: `Claims (${claims.length})` },
    { id: 'boq', label: 'BOQ & Physical Progress' },
    { id: 'financial', label: `Financial Progress (${financialLineItems.length})` },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/contracts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{contract.contract_number}</h1>
            <p className="text-slate-600 mt-1">Project: {contract.project_code || contract.project}</p>
          </div>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setShowContractForm(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Contract
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-slate-600">Contract Amount</p>
                <p className="font-medium text-lg">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                    .format(contract.contract_amount)}
                </p>
                {contract.revised_contract_amount && (
                  <p className="text-xs text-blue-600">
                    Revised: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                      .format(contract.revised_contract_amount)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-slate-600">Duration</p>
                <p className="font-medium">{contract.contract_duration_months || 'N/A'} months</p>
                <p className="text-xs text-slate-500">
                  {contract.original_completion_date 
                    ? new Date(contract.original_completion_date).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <Badge variant={
                  contract.current_status === 'active' ? 'success' :
                  contract.current_status === 'suspended' ? 'warning' :
                  contract.current_status === 'completed' ? 'info' : 'danger'
                }>
                  {contract.current_status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-slate-600">Contractor</dt>
                  <dd className="text-sm text-slate-900">{contract.contractor_org_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Consultant</dt>
                  <dd className="text-sm text-slate-900">{contract.consultant_org_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Signing Date</dt>
                  <dd className="text-sm text-slate-900">
                    {contract.contract_signing_date 
                      ? new Date(contract.contract_signing_date).toLocaleDateString()
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Commencement Date</dt>
                  <dd className="text-sm text-slate-900">
                    {contract.commencement_date 
                      ? new Date(contract.commencement_date).toLocaleDateString()
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Performance Security</dt>
                  <dd className="text-sm text-slate-900">
                    {contract.performance_security_amount 
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                          .format(contract.performance_security_amount)
                      : 'N/A'}
                  </dd>
                </div>
                {contract.performance_security_expiry && (
                  <div>
                    <dt className="text-sm font-medium text-slate-600">Security Expiry</dt>
                    <dd className="text-sm text-slate-900">
                      {new Date(contract.performance_security_expiry).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Financial Progress */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm text-slate-600">Financial Progress</span>
                  <span className="text-2xl font-bold text-blue-600">{financialProgressPct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${financialProgressPct}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">Σ IPC certified ÷ {contract.revised_contract_amount ? 'revised ' : ''}contract value</p>
              </div>

              {/* Contract Value & Remaining */}
              <div className="pt-3 border-t border-slate-100 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contract Value</p>
                <Row label="Contract Amount" value={contractValue} />
                <Row label="Total Certified (Requested)" value={totalCertified} valueClass="text-blue-700 font-semibold" />
                <Row label="Remaining to Certify" value={remainingToCertify} valueClass={remainingToCertify < 0 ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'} />
              </div>

              {/* Deductions */}
              <div className="pt-3 border-t border-slate-100 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Deductions</p>
                <Row label="Retention Held" value={totalRetention} valueClass="text-amber-700" />
                <Row label="Advance Recovered" value={totalAdvanceDeduction} valueClass="text-amber-700" />
                <Row label="Total Deductions" value={totalDeductions} valueClass="text-red-600 font-semibold" />
              </div>

              {/* Net & Payments */}
              <div className="pt-3 border-t border-slate-100 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payments</p>
                <Row label="Net Payable (Certified − Deductions)" value={netPayable} />
                <Row label="Total Paid" value={totalPaid} valueClass="text-green-700 font-semibold" />
                <Row label="Unpaid Certified" value={unpaidCertified} valueClass={unpaidCertified > 0 ? 'text-orange-600 font-semibold' : 'text-slate-700'} />
              </div>

              {/* Advance */}
              {parseFloat(contract.advance_payment_amount || 0) > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Advance Payment</p>
                  <Row label="Advance Given" value={parseFloat(contract.advance_payment_amount)} />
                  <Row label="Recovery Rate" plain={contract.advance_payment_recovery_rate != null ? `${parseFloat(contract.advance_payment_recovery_rate).toFixed(2)}% per IPC` : 'N/A'} />
                  <Row label="Recovered so far" value={totalAdvanceDeduction} />
                  <Row label="Advance Outstanding" value={advanceBalance} valueClass={advanceBalance > 0 ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'} />

                  {financialProgressPct >= 80 && advanceBalance > 0 && (
                    <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-300 px-3 py-2">
                      <span className="text-red-500 text-base leading-tight mt-0.5">⚠</span>
                      <div>
                        <p className="text-xs font-semibold text-red-700">Advance Recovery Required</p>
                        <p className="text-xs text-red-600 mt-0.5">
                          Financial progress has reached {financialProgressPct.toFixed(1)}% (≥ 80%).
                          The full advance balance of {etb(advanceBalance)} must be recovered
                          in the next IPC per FIDIC Sub-Clause 14.2.
                        </p>
                      </div>
                    </div>
                  )}

                  {advanceBalance <= 0 && totalAdvanceDeduction > 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2">
                      <span className="text-green-600 text-base">✓</span>
                      <p className="text-xs text-green-700 font-medium">Advance fully recovered</p>
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'variations' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Variation Orders</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => { setEditingVO(null); setShowVOForm(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variation Order
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>VO Number</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Approved Date</TableHead>
                  <TableHead>Description</TableHead>
                  {canEdit && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {variationOrders.map((vo) => (
                  <TableRow key={vo.vo_id}>
                    <TableCell className="font-medium">{vo.vo_number}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                        .format(vo.value)}
                    </TableCell>
                    <TableCell>
                      {vo.approved_date ? new Date(vo.approved_date).toLocaleDateString() : 'Pending'}
                    </TableCell>
                    <TableCell>{vo.description || '-'}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingVO(vo); setShowVOForm(true) }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete('variation-orders', vo.vo_id, 'variation order')}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {variationOrders.length === 0 && (
              <p className="text-slate-500 text-center py-12">No variation orders</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'extensions' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Extensions of Time</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => { setEditingEOT(null); setShowEOTForm(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Extension
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EoT Number</TableHead>
                  <TableHead>Approved Days</TableHead>
                  <TableHead>Approved Date</TableHead>
                  <TableHead>Reason</TableHead>
                  {canEdit && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {extensionsOfTime.map((eot) => (
                  <TableRow key={eot.eot_id}>
                    <TableCell className="font-medium">{eot.eot_number}</TableCell>
                    <TableCell>{eot.approved_days} days</TableCell>
                    <TableCell>
                      {eot.approved_date ? new Date(eot.approved_date).toLocaleDateString() : 'Pending'}
                    </TableCell>
                    <TableCell>{eot.reason || '-'}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingEOT(eot); setShowEOTForm(true) }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete('extensions-of-time', eot.eot_id, 'extension of time')}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {extensionsOfTime.length === 0 && (
              <p className="text-slate-500 text-center py-12">No extensions of time</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Interim Payment Certificates (IPCs)</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => { setEditingIPC(null); setShowIPCForm(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add IPC
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IPC Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Certified Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Retention</TableHead>
                  <TableHead>Adv. Deduction</TableHead>
                  {canEdit && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipcs.map((ipc) => (
                  <TableRow key={ipc.ipc_id}>
                    <TableCell className="font-medium">{ipc.ipc_number}</TableCell>
                    <TableCell>
                      {ipc.ipc_date ? new Date(ipc.ipc_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                        .format(ipc.certified_amount)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                        .format(ipc.paid_amount)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                        .format(ipc.retention_amount)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                        .format(ipc.advance_deduction || 0)}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" title="Allocate to BOQ items" onClick={() => setPendingIPCBreakdown(ipc)}>
                            <BarChart2 className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingIPC(ipc); setShowIPCForm(true) }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete('ipcs', ipc.ipc_id, 'IPC')}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {ipcs.length === 0 && (
              <p className="text-slate-500 text-center py-12">No payment certificates</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'claims' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Claims</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => { setEditingClaim(null); setShowClaimForm(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Claim
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Letters</TableHead>
                  {canEdit && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.claim_id}>
                    <TableCell>
                      {claim.requested_date ? new Date(claim.requested_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {claim.approved_date ? new Date(claim.approved_date).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                        .format(claim.claim_amount)}
                    </TableCell>
                    <TableCell>{claim.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        claim.status === 'approved' ? 'success' :
                        claim.status === 'rejected' ? 'danger' :
                        claim.status === 'under_review' ? 'info' : 'warning'
                      }>
                        {claim.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {claim.request_letter && (
                          <a href={claim.request_letter} target="_blank" rel="noreferrer"
                            className="text-blue-600 hover:underline text-xs">
                            Request
                          </a>
                        )}
                        {claim.approval_letter && (
                          <a href={claim.approval_letter} target="_blank" rel="noreferrer"
                            className="text-blue-600 hover:underline text-xs">
                            Approval
                          </a>
                        )}
                        {!claim.request_letter && !claim.approval_letter && '—'}
                      </div>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingClaim(claim); setShowClaimForm(true) }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete('claims', claim.claim_id, 'claim')}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {claims.length === 0 && (
              <p className="text-slate-500 text-center py-12">No claims</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'boq' && (
        <>
          <BOQTab
            key={boqRefreshKey}
            contractId={id}
            canEdit={canEdit}
            onAddPhysicalProgress={() => {
              setPreselectPhysicalItem(null)
              setEditingPhysicalRecord(null)
              setShowPhysicalProgressForm(true)
            }}
          />

          {physicalProgressHistory.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Physical Progress History</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item No</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Qty Completed</TableHead>
                      <TableHead className="text-right">Qty %</TableHead>
                      <TableHead className="text-right">Physical %</TableHead>
                      {canEdit && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {physicalProgressHistory.map((rec) => (
                      <TableRow key={rec.progress_id}>
                        <TableCell className="font-mono text-xs">{rec.boq_item_no}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate" title={rec.boq_item_description}>
                          {rec.boq_item_description}
                        </TableCell>
                        <TableCell>{rec.record_date}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {parseFloat(rec.actual_qty_completed).toLocaleString()} {rec.boq_item_unit}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {parseFloat(rec.qty_completion_pct || 0).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {parseFloat(rec.physical_progress_pct || 0).toFixed(4)}%
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingPhysicalRecord(rec)
                                setShowPhysicalProgressForm(true)
                              }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() =>
                                handleDelete('physical-progress', rec.progress_id, 'progress record')
                              }>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === 'financial' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                <BarChart2 className="w-5 h-5 inline mr-2 text-blue-500" />
                Financial Progress — IPC Line Items
              </CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => { setEditingLineItem(null); setPreselectFinancialItem(null); setShowFinancialProgressForm(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Line Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>IPC</TableHead>
                  <TableHead>IPC Date</TableHead>
                  <TableHead className="text-right">Total Price</TableHead>
                  <TableHead className="text-right">Certified (ETB)</TableHead>
                  <TableHead className="text-center">Financial %</TableHead>
                  <TableHead>Remarks</TableHead>
                  {canEdit && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialLineItems.map((li) => (
                  <TableRow key={li.line_item_id}>
                    <TableCell className="font-mono text-xs">{li.boq_item_no}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={li.boq_item_description}>
                      {li.boq_item_description}
                    </TableCell>
                    <TableCell className="font-medium">{li.ipc_number}</TableCell>
                    <TableCell>{li.ipc_date ? new Date(li.ipc_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(li.boq_item_total_price || 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(li.certified_amount_etb || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-14 bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(parseFloat(li.financial_progress_pct || 0), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums">{parseFloat(li.financial_progress_pct || 0).toFixed(2)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-xs truncate">{li.remarks || '—'}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingLineItem(li); setShowFinancialProgressForm(true) }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete('ipc-line-items', li.line_item_id, 'IPC line item')}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {financialLineItems.length === 0 && (
              <p className="text-slate-500 text-center py-12">No IPC line items yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {showContractForm && (
        <ContractForm
          editingContract={contract}
          onClose={() => setShowContractForm(false)}
          onSuccess={loadData}
        />
      )}
      {showVOForm && (
        <VariationOrderForm
          contractId={id}
          editingVO={editingVO}
          onClose={() => setShowVOForm(false)}
          onSuccess={loadData}
        />
      )}
      {showEOTForm && (
        <ExtensionOfTimeForm
          contractId={id}
          editingEOT={editingEOT}
          onClose={() => setShowEOTForm(false)}
          onSuccess={loadData}
        />
      )}
      {showIPCForm && (
        <IPCForm
          contractId={id}
          editingIPC={editingIPC}
          onClose={() => setShowIPCForm(false)}
          onSuccess={(savedIPC) => {
            loadData()
            setPendingIPCBreakdown(savedIPC)
          }}
        />
      )}
      {pendingIPCBreakdown && (
        <IPCBreakdownForm
          contractId={id}
          ipc={pendingIPCBreakdown}
          onClose={() => setPendingIPCBreakdown(null)}
          onSuccess={() => { loadData(); setBoqRefreshKey((k) => k + 1) }}
        />
      )}
      {showClaimForm && (
        <ClaimForm
          contractId={id}
          editingClaim={editingClaim}
          onClose={() => setShowClaimForm(false)}
          onSuccess={loadData}
        />
      )}
      {showPhysicalProgressForm && (
        <PhysicalProgressForm
          contractId={id}
          preselectedItemId={preselectPhysicalItem}
          editingRecord={editingPhysicalRecord}
          onClose={() => { setShowPhysicalProgressForm(false); setPreselectPhysicalItem(null); setEditingPhysicalRecord(null) }}
          onSuccess={() => { loadData(); setBoqRefreshKey((k) => k + 1) }}
        />
      )}
      {showFinancialProgressForm && (
        <FinancialProgressForm
          contractId={id}
          ipcs={ipcs}
          preselectedItemId={preselectFinancialItem}
          editingLineItem={editingLineItem}
          onClose={() => { setShowFinancialProgressForm(false); setEditingLineItem(null); setPreselectFinancialItem(null) }}
          onSuccess={() => { loadData(); setBoqRefreshKey((k) => k + 1) }}
        />
      )}
    </div>
  )
}
