import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import Button from '../components/ui/Button'
import ProjectForm from '../components/projects/ProjectForm'

export default function EditProject() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canEditProject } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/projects/projects/${id}/`)
      .then((res) => {
        const projectData = res.data
        
        // Check if user can edit this project
        if (!canEditProject(projectData)) {
          navigate('/projects')
          return
        }
        
        setProject(projectData)
      })
      .catch((err) => {
        console.error(err)
        navigate('/projects')
      })
      .finally(() => setLoading(false))
  }, [id, canEditProject, navigate])

  if (loading) {
    return <div className="text-center py-12">Loading project...</div>
  }

  if (!project) {
    return <div className="text-center py-12">Project not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Project
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Edit Project</h1>
          <p className="text-slate-600 mt-1">{project.project_code} - {project.project_name}</p>
        </div>
      </div>

      <ProjectForm
        editingProject={project}
        onClose={() => navigate(`/projects/${id}`)}
        onSuccess={() => navigate(`/projects/${id}`)}
      />
    </div>
  )
}
