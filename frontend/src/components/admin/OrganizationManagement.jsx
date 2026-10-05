import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

export default function OrganizationManagement() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState(null)
  const [filterType, setFilterType] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    org_type: 'contractor',
    contact_person: '',
    phone: '',
    email: '',
    registration_no: '',
  })

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = () => {
    api.get('/accounts/organizations/')
      .then((res) => setOrganizations(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const request = editingOrg
      ? api.put(`/accounts/organizations/${editingOrg.org_id}/`, formData)
      : api.post('/accounts/organizations/', formData)

    request
      .then(() => {
        loadOrganizations()
        handleCloseModal()
      })
      .catch((err) => {
        console.error(err)
        alert('Failed to save organization: ' + (err.response?.data?.detail || 'Unknown error'))
      })
  }

  const handleDelete = (orgId) => {
    if (!confirm('Are you sure you want to delete this organization?')) return

    api.delete(`/accounts/organizations/${orgId}/`)
      .then(() => loadOrganizations())
      .catch((err) => {
        console.error(err)
        alert('Failed to delete organization')
      })
  }

  const handleEdit = (org) => {
    setEditingOrg(org)
    setFormData({
      name: org.name,
      org_type: org.org_type,
      contact_person: org.contact_person || '',
      phone: org.phone || '',
      email: org.email || '',
      registration_no: org.registration_no || '',
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingOrg(null)
    setFormData({
      name: '',
      org_type: 'contractor',
      contact_person: '',
      phone: '',
      email: '',
      registration_no: '',
    })
  }

  const orgTypeVariant = {
    contractor: 'warning',
    consultant: 'info',
    government: 'success',
    ngo: 'default',
    other: 'default',
  }

  const filteredOrgs = filterType
    ? organizations.filter(o => o.org_type === filterType)
    : organizations

  if (loading) {
    return <div className="text-center py-12">Loading organizations...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Organization Management</h2>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{filteredOrgs.length} Organization{filteredOrgs.length !== 1 ? 's' : ''}</CardTitle>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-48"
            >
              <option value="">All Types</option>
              <option value="contractor">Contractor</option>
              <option value="consultant">Consultant</option>
              <option value="government">Government Bureau</option>
              <option value="ngo">NGO</option>
              <option value="other">Other</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Registration No</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.map((org) => (
                <TableRow key={org.org_id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>
                    <Badge variant={orgTypeVariant[org.org_type]}>
                      {org.org_type_display || org.org_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{org.contact_person || '-'}</TableCell>
                  <TableCell>{org.phone || '-'}</TableCell>
                  <TableCell>{org.email || '-'}</TableCell>
                  <TableCell>{org.registration_no || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(org)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(org.org_id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{editingOrg ? 'Edit Organization' : 'Add Organization'}</CardTitle>
                <button onClick={handleCloseModal}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Organization Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Select
                  label="Type"
                  value={formData.org_type}
                  onChange={(e) => setFormData({ ...formData, org_type: e.target.value })}
                  required
                >
                  <option value="contractor">Contractor</option>
                  <option value="consultant">Consultant</option>
                  <option value="government">Government Bureau</option>
                  <option value="ngo">NGO</option>
                  <option value="other">Other</option>
                </Select>
                <Input
                  label="Contact Person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Registration Number"
                  value={formData.registration_no}
                  onChange={(e) => setFormData({ ...formData, registration_no: e.target.value })}
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingOrg ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
