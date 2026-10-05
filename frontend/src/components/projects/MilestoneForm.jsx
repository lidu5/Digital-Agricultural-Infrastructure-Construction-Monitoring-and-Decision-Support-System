import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

export default function MilestoneForm({ project, onClose, onSuccess, editingMilestone = null }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [milestoneTypes, setMilestoneTypes] = useState([])

  const [formData, setFormData] = useState({
    project: project.project_id,
    milestone_type: '',
    planned_date: '',
    actual_date: '',
    status: 'pending',
    notes: '',
  })

  useEffect(() => {
    loadMilestoneTypes()
    if (editingMilestone) {
      setFormData({
        project: editingMilestone.project || project.project_id,
        milestone_type: editingMilestone.milestone_type || '',
        planned_date: editingMilestone.planned_date || '',
        actual_date: editingMilestone.actual_date || '',
        status: editingMilestone.status || 'pending',
        notes: editingMilestone.notes || '',
      })
    }
  }, [editingMilestone, project])

  const loadMilestoneTypes = async () => {
    try {
      const res = await api.get('/projects/milestone-types/')
      setMilestoneTypes(res.data)
    } catch (err) {
      console.error('Failed to load milestone types:', err)
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

      if (editingMilestone) {
        await api.put(`/projects/project-milestones/${editingMilestone.id}/`, payload)
      } else {
        await api.post('/projects/project-milestones/', payload)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save milestone:', err)
      console.error('Error response:', err.response?.data)
      
      // Check for unique constraint error
      if (err.response?.data?.non_field_errors) {
        const errors = err.response.data.non_field_errors
        if (errors.some(e => e.includes('unique'))) {
          alert('This milestone type already exists for this project.\n\nPlease choose a different milestone type or edit the existing one.')
          return
        }
      }
      
      const errorMsg = err.response?.data 
        ? JSON.stringify(err.response.data, null, 2)
        : 'Unknown error'
      alert('Failed to save milestone:\n' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{editingMilestone ? 'Edit Milestone' : 'Add Project Milestone'}</CardTitle>
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
              {/* Milestone Details */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Milestone Information</h3>
                <div className="space-y-4">
                  <Select
                    label="Milestone Type"
                    value={formData.milestone_type}
                    onChange={(e) => setFormData({ ...formData, milestone_type: e.target.value })}
                    required
                  >
                    <option value="">Select Milestone Type</option>
                    {milestoneTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.sequence_order}. {type.name}
                      </option>
                    ))}
                  </Select>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Planned Date"
                      type="date"
                      value={formData.planned_date}
                      onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
                      placeholder="Target completion date"
                    />
                    <Input
                      label="Actual Date"
                      type="date"
                      value={formData.actual_date}
                      onChange={(e) => setFormData({ ...formData, actual_date: e.target.value })}
                      placeholder="When completed"
                    />
                  </div>

                  <Select
                    label="Status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                  </Select>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      rows="4"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes or comments about this milestone..."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Milestones help track key project stages. Mark as "Completed" and set the actual date when achieved.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : (editingMilestone ? 'Update Milestone' : 'Add Milestone')}
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
