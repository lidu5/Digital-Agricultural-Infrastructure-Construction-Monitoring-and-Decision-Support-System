import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

export default function IssueForm({ project, onClose, onSuccess, editingIssue = null }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [lookupData, setLookupData] = useState({
    problemCategories: [],
    organizations: [],
  })

  const [formData, setFormData] = useState({
    project: project.project_id,
    problem_category: '',
    problem_description: '',
    cause: '',
    impact: '',
    responsible_org: '',
    required_action: '',
    deadline: '',
    status: 'open',
  })

  useEffect(() => {
    loadLookupData()
    if (editingIssue) {
      setFormData({
        project: editingIssue.project || project.project_id,
        problem_category: editingIssue.problem_category || '',
        problem_description: editingIssue.problem_description || '',
        cause: editingIssue.cause || '',
        impact: editingIssue.impact || '',
        responsible_org: editingIssue.responsible_org || '',
        required_action: editingIssue.required_action || '',
        deadline: editingIssue.deadline || '',
        status: editingIssue.status || 'open',
      })
    }
  }, [editingIssue, project])

  const loadLookupData = async () => {
    try {
      const [categoriesRes, orgsRes] = await Promise.all([
        api.get('/monitoring/problem-categories/'),
        api.get('/accounts/organizations/'),
      ])
      setLookupData({
        problemCategories: categoriesRes.data,
        organizations: orgsRes.data,
      })
    } catch (err) {
      console.error('Failed to load lookup data:', err)
    }
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

      // Add raised_by
      if (!editingIssue) {
        payload.raised_by = user.user_id
      }

      if (editingIssue) {
        await api.put(`/monitoring/issues/${editingIssue.issue_id}/`, payload)
      } else {
        await api.post('/monitoring/issues/', payload)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save issue:', err)
      console.error('Error response:', err.response?.data)
      const errorMsg = err.response?.data 
        ? JSON.stringify(err.response.data, null, 2)
        : 'Unknown error'
      alert('Failed to save issue:\n' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{editingIssue ? 'Edit Issue' : 'Report New Issue'}</CardTitle>
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
              {/* Problem Details */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Problem Details</h3>
                <div className="space-y-4">
                  <Select
                    label="Problem Category"
                    value={formData.problem_category}
                    onChange={(e) => setFormData({ ...formData, problem_category: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {lookupData.problemCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </Select>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Problem Description *
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      rows="3"
                      value={formData.problem_description}
                      onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
                      required
                      placeholder="Describe the problem in detail..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cause
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      rows="2"
                      value={formData.cause}
                      onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                      placeholder="What caused this problem?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Impact
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      rows="2"
                      value={formData.impact}
                      onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                      placeholder="What is the impact on the project?"
                    />
                  </div>
                </div>
              </div>

              {/* Action Required */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Action Required</h3>
                <div className="space-y-4">
                  <Select
                    label="Responsible Organization"
                    value={formData.responsible_org}
                    onChange={(e) => setFormData({ ...formData, responsible_org: e.target.value })}
                  >
                    <option value="">Select Organization</option>
                    {lookupData.organizations.map((org) => (
                      <option key={org.org_id} value={org.org_id}>
                        {org.name} ({org.org_type})
                      </option>
                    ))}
                  </Select>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Required Action
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      rows="3"
                      value={formData.required_action}
                      onChange={(e) => setFormData({ ...formData, required_action: e.target.value })}
                      placeholder="What action needs to be taken?"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                    <Select
                      label="Status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      required
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="escalated">Escalated</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : (editingIssue ? 'Update Issue' : 'Report Issue')}
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
