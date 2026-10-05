import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'national_viewer',
    region: '',
    password: '',
    is_active: true,
  })

  useEffect(() => {
    loadUsers()
    loadRegions()
  }, [])

  const loadUsers = () => {
    api.get('/accounts/users/')
      .then((res) => setUsers(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  const loadRegions = () => {
    api.get('/geography/regions/')
      .then((res) => setRegions(res.data))
      .catch((err) => console.error(err))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { ...formData }
    
    if (formData.role !== 'regional_manager') {
      payload.region = null
    }
    
    if (!payload.password) {
      delete payload.password
    }

    const request = editingUser
      ? api.put(`/accounts/users/${editingUser.user_id}/`, payload)
      : api.post('/accounts/users/', payload)

    request
      .then(() => {
        loadUsers()
        handleCloseModal()
      })
      .catch((err) => {
        console.error(err)
        alert('Failed to save user: ' + (err.response?.data?.detail || 'Unknown error'))
      })
  }

  const handleDelete = (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    api.delete(`/accounts/users/${userId}/`)
      .then(() => loadUsers())
      .catch((err) => {
        console.error(err)
        alert('Failed to delete user')
      })
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      region: user.region || '',
      password: '',
      is_active: user.is_active,
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingUser(null)
    setFormData({
      full_name: '',
      email: '',
      role: 'national_viewer',
      region: '',
      password: '',
      is_active: true,
    })
  }

  const roleVariant = {
    admin: 'danger',
    regional_manager: 'warning',
    national_viewer: 'info',
  }

  if (loading) {
    return <div className="text-center py-12">Loading users...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{users.length} User{users.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleVariant[user.role]}>
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.region_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'success' : 'default'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user.user_id)}
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
                <CardTitle>{editingUser ? 'Edit User' : 'Add User'}</CardTitle>
                <button onClick={handleCloseModal}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <Select
                  label="Role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="national_viewer">National Viewer</option>
                  <option value="regional_manager">Regional Bureau Manager</option>
                  <option value="admin">System Administrator</option>
                </Select>
                {formData.role === 'regional_manager' && (
                  <Select
                    label="Region"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    required
                  >
                    <option value="">Select Region</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </Select>
                )}
                <Input
                  label={editingUser ? 'Password (leave blank to keep current)' : 'Password'}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                    Active
                  </label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingUser ? 'Update' : 'Create'}
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
