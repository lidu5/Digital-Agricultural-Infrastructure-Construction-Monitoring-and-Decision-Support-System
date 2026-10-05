import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Filter, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import ProjectForm from '../components/projects/ProjectForm'

const statusVariant = {
  on_track: 'success',
  delayed: 'warning',
  critical: 'danger',
  completed: 'info',
}

export default function Projects() {
  const { hasPermission } = useAuth()
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)
  
  const [filters, setFilters] = useState({
    region: '',
    status: '',
    search: '',
  })

  const canEdit = hasPermission('edit')

  const loadProjects = () => {
    Promise.all([
      api.get('/projects/projects/'),
      api.get('/geography/regions/'),
    ])
      .then(([projectsRes, regionsRes]) => {
        setProjects(projectsRes.data)
        setFilteredProjects(projectsRes.data)
        setRegions(regionsRes.data)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    let filtered = projects

    if (filters.region) {
      filtered = filtered.filter(p => p.region === parseInt(filters.region))
    }

    if (filters.status) {
      filtered = filtered.filter(p => p.overall_status_flag === filters.status)
    }

    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(p => 
        p.project_code.toLowerCase().includes(search) ||
        p.project_name.toLowerCase().includes(search)
      )
    }

    setFilteredProjects(filtered)
  }, [filters, projects])

  if (loading) {
    return <div className="text-center py-12">Loading projects...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
        <div className="flex gap-3">
          {canEdit && (
            <Button onClick={() => setShowProjectForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          )}
          <Link to="/projects/map">
            <Button variant="outline">
              <MapPin className="w-4 h-4 mr-2" />
              Map View
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <Filter className="w-5 h-5 inline mr-2" />
              Filters
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ region: '', status: '', search: '' })}
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by code or name..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-md"
            />
            <Select
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
            >
              <option value="">All Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="on_track">On Track</option>
              <option value="delayed">Delayed</option>
              <option value="critical">Critical</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {filteredProjects.length} Project{filteredProjects.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Physical %</TableHead>
                <TableHead>Financial %</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.project_id}>
                  <TableCell className="font-medium">{project.project_code}</TableCell>
                  <TableCell>{project.project_name}</TableCell>
                  <TableCell>{project.region_name || project.region}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[project.overall_status_flag]}>
                      {project.overall_status_flag.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{project.physical_status_pct}%</TableCell>
                  <TableCell>{project.financial_status_pct}%</TableCell>
                  <TableCell>
                    {project.priority_level !== 'normal' && (
                      <Badge variant={project.priority_level === 'critical' ? 'danger' : 'warning'}>
                        {project.priority_level}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link to={`/projects/${project.project_id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredProjects.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No projects found matching your filters
            </div>
          )}
        </CardContent>
      </Card>

      {showProjectForm && (
        <ProjectForm
          onClose={() => setShowProjectForm(false)}
          onSuccess={() => {
            loadProjects()
            setShowProjectForm(false)
          }}
        />
      )}
    </div>
  )
}
