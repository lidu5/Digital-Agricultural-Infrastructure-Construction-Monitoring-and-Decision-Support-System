import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

export default function DocumentForm({ projectId, editingDoc, onClose, onSuccess }) {
  const [docTypes, setDocTypes] = useState([])
  const [projects, setProjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    project: editingDoc?.project || projectId || '',
    document_type: editingDoc?.document_type || '',
    file_url: editingDoc?.file_url || '',
    description: editingDoc?.description || '',
  })
  const [file, setFile] = useState(null)

  useEffect(() => {
    const requests = [api.get('/monitoring/document-types/')]
    // Only fetch projects when the form isn't bound to a fixed project
    if (!projectId) requests.push(api.get('/projects/projects/'))
    Promise.all(requests)
      .then(([typesRes, projectsRes]) => {
        setDocTypes(typesRes.data)
        if (projectsRes) setProjects(projectsRes.data)
      })
      .catch((err) => console.error(err))
  }, [projectId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (file) {
        // Multipart when a file is attached
        const fd = new FormData()
        fd.append('project', form.project)
        fd.append('document_type', form.document_type)
        fd.append('description', form.description)
        if (form.file_url) fd.append('file_url', form.file_url)
        fd.append('file', file)
        if (editingDoc) {
          await api.put(`/monitoring/documents/${editingDoc.document_id}/`, fd)
        } else {
          await api.post('/monitoring/documents/', fd)
        }
      } else if (editingDoc) {
        await api.put(`/monitoring/documents/${editingDoc.document_id}/`, form)
      } else {
        await api.post('/monitoring/documents/', form)
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(
        typeof err.response?.data === 'object'
          ? Object.entries(err.response.data).map(([k, v]) => `${k}: ${v}`).join('\n')
          : 'Failed to save document'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{editingDoc ? 'Edit Document' : 'Upload Document'}</CardTitle>
              <button onClick={onClose}><X className="w-5 h-5" /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!projectId && (
                <Select
                  label="Project"
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                  required
                >
                  <option value="">— Select project —</option>
                  {projects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_code} — {p.project_name}
                    </option>
                  ))}
                </Select>
              )}

              <Select
                label="Document Type"
                value={form.document_type}
                onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                required
              >
                <option value="">— Select type —</option>
                {docTypes.map((t) => (
                  <option key={t.document_type_id || t.id} value={t.document_type_id || t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Upload File{editingDoc?.file || form.file_url ? '' : ' *'}
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  required={!editingDoc?.file && !form.file_url}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 border border-slate-300 rounded-md"
                />
                {editingDoc?.file && (
                  <p className="text-xs text-slate-500 mt-1">
                    Current file: <a href={editingDoc.file} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{editingDoc.file.split('/').pop()}</a>
                    {' '}— choose a new file to replace it.
                  </p>
                )}
              </div>

              <Input
                label="Or File URL (optional if file uploaded)"
                type="url"
                placeholder="https://example.com/path/to/document.pdf"
                value={form.file_url}
                onChange={(e) => setForm({ ...form, file_url: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Optional notes about this document"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 whitespace-pre-line bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : editingDoc ? 'Update' : 'Save Document'}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
