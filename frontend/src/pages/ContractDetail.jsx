import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, Clock, DollarSign, Plus, Pencil, Trash2 } from 'lucide-react'
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

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get(`/contracts/contracts/${id}/`),
      api.get(`/contracts/variation-orders/?contract=${id}`),
      api.get(`/contracts/extensions-of-time/?contract=${id}`),
      api.get(`/contracts/ipcs/?contract=${id}`),
      api.get(`/contracts/claims/?contract=${id}`),
    ])
      .then(([contractRes, voRes, eotRes, ipcRes, claimRes]) => {
        setContract(contractRes.data)
        setVariationOrders(voRes.data)
        setExtensionsOfTime(eotRes.data)
        setIpcs(ipcRes.data)
        setClaims(claimRes.data)
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
  const advanceBalance = parseFloat(contract.advance_payment_amount || 0) - parseFloat(contract.advance_payment_recovered || 0)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'variations', label: `Variation Orders (${variationOrders.length})` },
    { id: 'extensions', label: `Extensions of Time (${extensionsOfTime.length})` },
    { id: 'payments', label: `IPCs (${ipcs.length})` },
    { id: 'claims', label: `Claims (${claims.length})` },
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
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Total Certified</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                        .format(totalCertified)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Total Paid</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                        .format(totalPaid)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ 
                        width: `${Math.min((totalPaid / (contract.revised_contract_amount || contract.contract_amount)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Advance Payment</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                        .format(contract.advance_payment_amount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-600">Advance Recovered</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                        .format(contract.advance_payment_recovered || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-600">Advance Balance</span>
                    <span className={`font-medium ${advanceBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 })
                        .format(advanceBalance)}
                    </span>
                  </div>
                </div>
              </div>
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
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
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
                  <TableHead>Claim Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.claim_id}>
                    <TableCell>
                      {claim.claim_date ? new Date(claim.claim_date).toLocaleDateString() : 'N/A'}
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
          onSuccess={loadData}
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
    </div>
  )
}
