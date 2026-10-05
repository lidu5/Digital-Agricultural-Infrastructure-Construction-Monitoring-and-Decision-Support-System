import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Users, Droplet, Calendar, AlertCircle, Plus, Pencil } from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import ProgressRecordForm from '../components/monitoring/ProgressRecordForm'
import IssueForm from '../components/monitoring/IssueForm'
import MilestoneForm from '../components/projects/MilestoneForm'
import ContractForm from '../components/contracts/ContractForm'

const STATUS_COLORS = {
  on_track: '#16a34a',
  delayed: '#eab308',
  critical: '#dc2626',
  completed: '#2563eb',
}

const contractStatusVariant = {
  active: 'success',
  suspended: 'warning',
  completed: 'info',
  terminated: 'danger',
}

const formatETB = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 0,
  }).format(amount)

function LifecycleBadges({ contract }) {
  const vo = contract.variation_orders?.length || 0
  const eot = contract.extensions_of_time?.length || 0
  const ipcs = contract.ipcs || []
  const claims = contract.claims?.length || 0
  const certified = ipcs.reduce((s, i) => s + parseFloat(i.certified_amount || 0), 0)

  if (!vo && !eot && !ipcs.length && !claims) {
    return <span className="text-xs text-slate-400">—</span>
  }

  return (
    <div className="flex flex-wrap gap-1 text-xs">
      {vo > 0 && <Badge variant="warning">VO ×{vo}</Badge>}
      {eot > 0 && <Badge variant="info">EoT ×{eot}</Badge>}
      {ipcs.length > 0 && (
        <Badge variant="success" title={`Certified: ${formatETB(certified)}`}>
          IPC ×{ipcs.length}
        </Badge>
      )}
      {claims > 0 && <Badge variant="danger">Claim ×{claims}</Badge>}
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canAccessProject, canEditProject } = useAuth()
  const [project, setProject] = useState(null)
  const [progressRecords, setProgressRecords] = useState([])
  const [milestones, setMilestones] = useState([])
  const [issues, setIssues] = useState([])
  const [documents, setDocuments] = useState([])
  const [contracts, setContracts] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [showProgressForm, setShowProgressForm] = useState(false)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [showContractForm, setShowContractForm] = useState(false)
  const [editingContract, setEditingContract] = useState(null)

  const loadProjectData = () => {
    setLoading(true)
    Promise.all([
      api.get(`/projects/projects/${id}/`),
      api.get(`/monitoring/progress-records/?project=${id}`),
      api.get(`/projects/project-milestones/?project=${id}`),
      api.get(`/monitoring/issues/?project=${id}`),
      api.get(`/monitoring/documents/?project=${id}`),
      api.get(`/contracts/contracts/?project=${id}`),
    ])
      .then(([projectRes, progressRes, milestonesRes, issuesRes, docsRes, contractsRes]) => {
        const projectData = projectRes.data
        
        if (!canAccessProject(projectData)) {
          navigate('/projects')
          return
        }
        
        setProject(projectData)
        setProgressRecords(progressRes.data)
        setMilestones(milestonesRes.data)
        setIssues(issuesRes.data)
        setDocuments(docsRes.data)
        setContracts(contractsRes.data)
      })
      .catch((err) => {
        console.error(err)
        navigate('/projects')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProjectData()
  }, [id, canAccessProject, navigate])

  if (loading) {
    return <div className="text-center py-12">Loading project details...</div>
  }

  if (!project) {
    return <div className="text-center py-12">Project not found</div>
  }

  const canEdit = canEditProject(project)

  const hasGps = project.latitude != null && project.longitude != null
  const projectCoords = hasGps ? [Number(project.latitude), Number(project.longitude)] : null
  const markerColor = STATUS_COLORS[project.overall_status_flag] || '#64748b'

  const chartData = progressRecords.map(r => ({
    date: new Date(r.record_date).toLocaleDateString(),
    physical: parseFloat(r.physical_progress_pct || 0),
    financial: parseFloat(r.financial_progress_pct || 0),
    time: parseFloat(r.time_progress_pct || 0),
  })).reverse()

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'progress', label: 'Progress' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'contracts', label: `Contracts (${contracts.length})` },
    { id: 'issues', label: `Issues (${issues.length})` },
    { id: 'documents', label: `Documents (${documents.length})` },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{project.project_code}</h1>
            <p className="text-slate-600 mt-1">{project.project_name}</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => navigate(`/projects/edit/${project.project_id}`)}>
            Edit Project
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-slate-600">Location</p>
                <p className="font-medium">{project.region_name || 'N/A'}</p>
                <p className="text-xs text-slate-500">{project.zone_name || ''}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-slate-600">Beneficiaries</p>
                <p className="font-medium">{project.target_beneficiaries_thh || 0} HH</p>
                <p className="text-xs text-slate-500">
                  M: {project.target_beneficiaries_male || 0} / F: {project.target_beneficiaries_female || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Droplet className="w-8 h-8 text-cyan-500" />
              <div>
                <p className="text-sm text-slate-600">Irrigable Area</p>
                <p className="font-medium">{project.designed_irrigable_area_ha || 0} ha</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className={`w-8 h-8 ${project.technical_support_required ? 'text-red-500' : 'text-slate-300'}`} />
              <div>
                <p className="text-sm text-slate-600">Support Status</p>
                <p className="font-medium">
                  {project.technical_support_required ? 'Required' : 'Not Required'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-slate-600">Project Type</dt>
                  <dd className="text-sm text-slate-900">{project.project_type_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Water Source</dt>
                  <dd className="text-sm text-slate-900">{project.water_source_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Irrigation Technology</dt>
                  <dd className="text-sm text-slate-900">{project.irrigation_technology_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Irrigation System</dt>
                  <dd className="text-sm text-slate-900">{project.irrigation_system_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Category</dt>
                  <dd className="text-sm text-slate-900">{project.category_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Financing Source</dt>
                  <dd className="text-sm text-slate-900">{project.financing_source_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-600">Main Crops</dt>
                  <dd className="text-sm text-slate-900">
                    {project.crop_names?.length ? (
                      <span className="inline-flex flex-wrap gap-1 mt-1">
                        {project.crop_names.map((name) => (
                          <Badge key={name} variant="success">{name}</Badge>
                        ))}
                      </span>
                    ) : 'N/A'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Physical Progress</span>
                    <span className="font-medium">{project.physical_status_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${project.physical_status_pct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Financial Progress</span>
                    <span className="font-medium">{project.financial_status_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${project.financial_status_pct}%` }}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Overall Status</span>
                    <Badge variant={
                      project.overall_status_flag === 'on_track' ? 'success' :
                      project.overall_status_flag === 'delayed' ? 'warning' :
                      project.overall_status_flag === 'critical' ? 'danger' : 'info'
                    }>
                      {project.overall_status_flag.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-slate-600">Priority Level</span>
                    <Badge variant={
                      project.priority_level === 'critical' ? 'danger' :
                      project.priority_level === 'high' ? 'warning' : 'default'
                    }>
                      {project.priority_level}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                <MapPin className="w-5 h-5 inline mr-2" />
                GPS Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasGps ? (
                <>
                  <MapContainer center={projectCoords} zoom={13} style={{ height: '400px', width: '100%' }}>
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <CircleMarker
                      center={projectCoords}
                      radius={10}
                      pathOptions={{ color: markerColor, fillColor: markerColor, fillOpacity: 0.8 }}
                    >
                      <Popup>
                        <strong>{project.project_code}</strong><br />
                        {project.project_name}
                      </Popup>
                    </CircleMarker>
                  </MapContainer>
                  <p className="text-sm text-slate-600 mt-3">
                    Latitude: {projectCoords[0]}, Longitude: {projectCoords[1]}
                  </p>
                </>
              ) : (
                <p className="text-slate-500 text-center py-12">
                  No GPS coordinates recorded for this project
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'progress' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Progress Trend</CardTitle>
              {canEdit && (
                <Button onClick={() => setShowProgressForm(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Progress Record
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="physical" stroke="#3b82f6" name="Physical %" />
                  <Line type="monotone" dataKey="financial" stroke="#16a34a" name="Financial %" />
                  <Line type="monotone" dataKey="time" stroke="#eab308" name="Time %" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12">No progress records available</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'milestones' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Project Milestones</CardTitle>
              {canEdit && (
                <Button onClick={() => setShowMilestoneForm(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Actual Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.milestone_type_name || m.milestone_type}</TableCell>
                    <TableCell>{m.planned_date ? new Date(m.planned_date).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{m.actual_date ? new Date(m.actual_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        m.status === 'completed' ? 'success' :
                        m.status === 'in_progress' ? 'info' :
                        m.status === 'delayed' ? 'danger' : 'default'
                      }>
                        {m.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {milestones.length === 0 && (
              <p className="text-slate-500 text-center py-12">No milestones recorded</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'contracts' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Project Contracts</CardTitle>
              {canEdit && (
                <Button onClick={() => { setEditingContract(null); setShowContractForm(true) }} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contract
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract Number</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Completion Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => {
                  const completion = c.revised_completion_date || c.original_completion_date
                  return (
                    <TableRow key={c.contract_id}>
                      <TableCell className="font-medium">{c.contract_number}</TableCell>
                      <TableCell>{c.contractor_org_name || 'N/A'}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'ETB',
                          minimumFractionDigits: 0,
                        }).format(c.revised_contract_amount || c.contract_amount)}
                      </TableCell>
                      <TableCell>
                        <LifecycleBadges contract={c} />
                      </TableCell>
                      <TableCell>{completion ? new Date(completion).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={contractStatusVariant[c.current_status]}>{c.current_status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditingContract(c); setShowContractForm(true) }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          <Link to={`/contracts/${c.contract_id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {contracts.length === 0 && (
              <p className="text-slate-500 text-center py-12">No contracts for this project</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'issues' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Issues & Problems</CardTitle>
              {canEdit && (
                <Button onClick={() => setShowIssueForm(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Report Issue
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {issues.length > 0 ? (
              <div className="space-y-4">
                {issues.map((issue) => (
                  <div key={issue.issue_id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            issue.status === 'resolved' ? 'success' :
                            issue.status === 'escalated' ? 'danger' :
                            issue.status === 'in_progress' ? 'info' : 'warning'
                          }>
                            {issue.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm font-medium">{issue.problem_category_name || 'Issue'}</span>
                        </div>
                        <p className="text-sm text-slate-900 mb-2">{issue.problem_description}</p>
                        {issue.cause && (
                          <p className="text-sm text-slate-600"><strong>Cause:</strong> {issue.cause}</p>
                        )}
                        {issue.required_action && (
                          <p className="text-sm text-slate-600"><strong>Action:</strong> {issue.required_action}</p>
                        )}
                      </div>
                      {issue.deadline && (
                        <div className="text-right">
                          <Calendar className="w-4 h-4 inline text-slate-400" />
                          <p className="text-xs text-slate-500">{new Date(issue.deadline).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-12">No issues recorded</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <CardTitle>Project Documents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.document_id}>
                    <TableCell>{doc.document_type_name || doc.document_type}</TableCell>
                    <TableCell>{doc.description || '-'}</TableCell>
                    <TableCell>{new Date(doc.upload_date).toLocaleDateString()}</TableCell>
                    <TableCell>{doc.uploaded_by_name || 'N/A'}</TableCell>
                    <TableCell>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">View</Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {documents.length === 0 && (
              <p className="text-slate-500 text-center py-12">No documents uploaded</p>
            )}
          </CardContent>
        </Card>
      )}

      {showProgressForm && (
        <ProgressRecordForm
          project={project}
          onClose={() => setShowProgressForm(false)}
          onSuccess={() => {
            loadProjectData()
            setShowProgressForm(false)
          }}
        />
      )}

      {showIssueForm && (
        <IssueForm
          project={project}
          onClose={() => setShowIssueForm(false)}
          onSuccess={() => {
            loadProjectData()
            setShowIssueForm(false)
          }}
        />
      )}

      {showContractForm && (
        <ContractForm
          project={project}
          editingContract={editingContract}
          onClose={() => { setShowContractForm(false); setEditingContract(null) }}
          onSuccess={() => {
            loadProjectData()
            setShowContractForm(false)
            setEditingContract(null)
          }}
        />
      )}

      {showMilestoneForm && (
        <MilestoneForm
          project={project}
          onClose={() => setShowMilestoneForm(false)}
          onSuccess={() => {
            loadProjectData()
            setShowMilestoneForm(false)
          }}
        />
      )}
    </div>
  )
}
