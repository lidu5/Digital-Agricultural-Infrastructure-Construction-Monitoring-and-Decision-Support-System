import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import ContractForm from '../components/contracts/ContractForm'

const statusVariant = {
  active: 'success',
  suspended: 'warning',
  completed: 'info',
  terminated: 'danger',
}

export default function Contracts() {
  const { hasPermission } = useAuth()
  const [contracts, setContracts] = useState([])
  const [filteredContracts, setFilteredContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showContractForm, setShowContractForm] = useState(false)

  const canEdit = hasPermission('edit')

  const loadContracts = () => {
    setLoading(true)
    api.get('/contracts/contracts/')
      .then((res) => {
        setContracts(res.data)
        setFilteredContracts(res.data)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadContracts()
  }, [])

  useEffect(() => {
    if (statusFilter) {
      setFilteredContracts(contracts.filter(c => c.current_status === statusFilter))
    } else {
      setFilteredContracts(contracts)
    }
  }, [statusFilter, contracts])

  if (loading) {
    return <div className="text-center py-12">Loading contracts...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Contracts</h1>
        {canEdit && (
          <Button onClick={() => setShowContractForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Contract
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter by Status</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter('')}>
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="completed">Completed</option>
            <option value="terminated">Terminated</option>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {filteredContracts.length} Contract{filteredContracts.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract Number</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Completion Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.contract_id}>
                  <TableCell className="font-medium">{contract.contract_number}</TableCell>
                  <TableCell>{contract.project_code || contract.project}</TableCell>
                  <TableCell>{contract.contractor_org_name || 'N/A'}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'ETB',
                      minimumFractionDigits: 0,
                    }).format(contract.revised_contract_amount || contract.contract_amount)}
                  </TableCell>
                  <TableCell>
                    {contract.revised_completion_date || contract.original_completion_date
                      ? new Date(contract.revised_completion_date || contract.original_completion_date).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[contract.current_status]}>
                      {contract.current_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link to={`/contracts/${contract.contract_id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredContracts.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No contracts found
            </div>
          )}
        </CardContent>
      </Card>

      {showContractForm && (
        <ContractForm
          onClose={() => setShowContractForm(false)}
          onSuccess={() => {
            loadContracts()
            setShowContractForm(false)
          }}
        />
      )}
    </div>
  )
}
