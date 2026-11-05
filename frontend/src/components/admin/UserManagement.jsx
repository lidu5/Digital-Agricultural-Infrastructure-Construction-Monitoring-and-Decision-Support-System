import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Eye, EyeOff } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

const MIN_PASSWORD_LENGTH = 8

const STRENGTH_LEVELS = [
  { label: 'Too short', color: 'bg-red-500', text: 'text-red-600' },
  { label: 'Weak', color: 'bg-red-500', text: 'text-red-600' },
  { label: 'Fair', color: 'bg-yellow-500', text: 'text-yellow-600' },
  { label: 'Good', color: 'bg-green-500', text: 'text-green-600' },
  { label: 'Strong', color: 'bg-green-600', text: 'text-green-700' },
]

function getPasswordStrength(pw) {
  if (pw.length < MIN_PASSWORD_LENGTH) return 0
  let score = 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++
  return score
}

function formatApiError(data) {
  if (!data) return 'Unknown error'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  return Object.entries(data)
    .map(([field, msgs]) => `${field}: ${[].concat(msgs).join(' ')}`)
    .join('\n')
}

export default function UserManagement() {
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
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
    } else if (payload.password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    setFormError('')
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
        setFormError(formatApiError(err.response?.data))
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
    setFormError('')
    setShowPassword(false)
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
    setShowPassword(false)
    setFormError('')
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
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
                <div className="w-full">
                  <label htmlFor="user-password" className="block text-sm font-medium text-slate-700 mb-1">
                    {editingUser ? 'Password (leave blank to keep current)' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      id="user-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      minLength={MIN_PASSWORD_LENGTH}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.password ? (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${
                              i <= getPasswordStrength(formData.password)
                                ? STRENGTH_LEVELS[getPasswordStrength(formData.password)].color
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`mt-1 text-xs ${STRENGTH_LEVELS[getPasswordStrength(formData.password)].text}`}>
                        {STRENGTH_LEVELS[getPasswordStrength(formData.password)].label}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">
                      At least {MIN_PASSWORD_LENGTH} characters. Avoid common or all-numeric passwords.
                    </p>
                  )}
                </div>
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
                {formError && (
                  <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 whitespace-pre-line">
                    {formError}
                  </div>
                )}
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
