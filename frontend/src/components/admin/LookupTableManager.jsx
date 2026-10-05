import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table'
import Button from '../ui/Button'
import Input from '../ui/Input'

const LOOKUP_TABLES = [
  { key: 'project-types', label: 'Project Types', endpoint: '/geography/project-types/' },
  { key: 'water-sources', label: 'Water Sources', endpoint: '/geography/water-sources/' },
  { key: 'irrigation-technologies', label: 'Irrigation Technologies', endpoint: '/geography/irrigation-technologies/' },
  { key: 'irrigation-systems', label: 'Irrigation Systems', endpoint: '/geography/irrigation-systems/' },
  { key: 'project-categories', label: 'Project Categories', endpoint: '/geography/project-categories/' },
  { key: 'financing-sources', label: 'Financing Sources', endpoint: '/geography/financing-sources/' },
  { key: 'crops', label: 'Crops', endpoint: '/geography/crops/' },
  { key: 'problem-categories', label: 'Problem Categories', endpoint: '/monitoring/problem-categories/' },
  { key: 'document-types', label: 'Document Types', endpoint: '/monitoring/document-types/' },
  { key: 'alert-types', label: 'Alert Types', endpoint: '/monitoring/alert-types/' },
]

export default function LookupTableManager() {
  const [activeTable, setActiveTable] = useState(LOOKUP_TABLES[0])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    loadItems()
  }, [activeTable])

  const loadItems = () => {
    setLoading(true)
    api.get(activeTable.endpoint)
      .then((res) => setItems(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const request = editingItem
      ? api.put(`${activeTable.endpoint}${editingItem.id}/`, formData)
      : api.post(activeTable.endpoint, formData)

    request
      .then(() => {
        loadItems()
        handleCloseModal()
      })
      .catch((err) => {
        console.error(err)
        alert('Failed to save item: ' + (err.response?.data?.detail || 'Unknown error'))
      })
  }

  const handleDelete = (itemId) => {
    if (!confirm(`Are you sure you want to delete this ${activeTable.label.slice(0, -1).toLowerCase()}?`)) return

    api.delete(`${activeTable.endpoint}${itemId}/`)
      .then(() => loadItems())
      .catch((err) => {
        console.error(err)
        alert('Failed to delete item. It may be in use by existing records.')
      })
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormData({ name: '', description: '' })
  }

  const hasDescription = activeTable.key === 'alert-types'

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Lookup Table Management</h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {LOOKUP_TABLES.map((table) => (
                <button
                  key={table.key}
                  onClick={() => setActiveTable(table)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    activeTable.key === table.key
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {table.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{activeTable.label}</CardTitle>
                <Button onClick={() => setShowModal(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      {hasDescription && <TableHead>Description</TableHead>}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        {hasDescription && <TableCell>{item.description || '-'}</TableCell>}
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!loading && items.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No items found. Click "Add" to create one.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {editingItem ? 'Edit' : 'Add'} {activeTable.label.slice(0, -1)}
                </CardTitle>
                <button onClick={handleCloseModal}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                {hasDescription && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                    />
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingItem ? 'Update' : 'Create'}
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
