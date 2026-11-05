import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, FolderKanban } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table'
import Button from '../ui/Button'
import Input from '../ui/Input'

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  start_date: '',
  end_date: '',
}

export default function ProgramManagement() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProgram, setEditingProgram] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPrograms()
  }, [])

  const loadPrograms = () => {
    setLoading(true)
    api.get('/projects/programs/')
      .then((res) => setPrograms(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  const openCreate = () => {
    setEditingProgram(null)
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (program) => {
    setEditingProgram(program)
    setFormData({
      code: program.code || '',
      name: program.name || '',
      description: program.description || '',
      start_date: program.start_date || '',
      end_date: program.end_date || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProgram(null)
    setFormData(EMPTY_FORM)
  }

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)

    const payload = { ...formData }
    Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null })

    const request = editingProgram
      ? api.put(`/projects/programs/${editingProgram.id}/`, payload)
      : api.post('/projects/programs/', payload)

    request
      .then(() => { loadPrograms(); closeModal() })
      .catch((err) => {
        console.error(err)
        const detail = err.response?.data
          ? JSON.stringify(err.response.data)
          : 'Unknown error'
        alert('Failed to save program:\n' + detail)
      })
      .finally(() => setSaving(false))
  }

  const handleDelete = (program) => {
    if (!confirm(`Delete program "${program.name}"? Projects assigned to it will be unlinked.`)) return
    api.delete(`/projects/programs/${program.id}/`)
      .then(() => loadPrograms())
      .catch((err) => {
        console.error(err)
        alert('Failed to delete: ' + (err.response?.data?.detail || 'Unknown error'))
      })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Programs</CardTitle>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Program
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 text-center py-8">Loading…</p>
          ) : programs.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No programs yet. Create one to start grouping projects.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-medium text-slate-700">{p.code}</TableCell>
                    <TableCell className="font-medium text-slate-900">{p.name}</TableCell>
                    <TableCell className="text-slate-600 max-w-xs truncate">{p.description || '—'}</TableCell>
                    <TableCell>{p.start_date || '—'}</TableCell>
                    <TableCell>{p.end_date || '—'}</TableCell>
                    <TableCell>{p.project_count ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingProgram ? 'Edit Program' : 'New Program'}</CardTitle>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Program Code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    placeholder="e.g. NRCP-02"
                  />
                  <Input
                    label="Program Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. NRCP Phase II"
                  />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Optional description…"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start Date"
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleChange}
                  />
                  <Input
                    label="End Date"
                    name="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleChange}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? 'Saving…' : editingProgram ? 'Update Program' : 'Create Program'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
