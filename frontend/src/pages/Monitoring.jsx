import { useState, useEffect } from 'react'
import { Activity, AlertCircle, FileText, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import DocumentForm from '../components/monitoring/DocumentForm'

export default function Monitoring() {
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('edit')
  const [activeTab, setActiveTab] = useState('progress')
  const [progressRecords, setProgressRecords] = useState([])
  const [issues, setIssues] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDocForm, setShowDocForm] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)

  const loadData = () => {
    Promise.all([
      api.get('/monitoring/progress-records/'),
      api.get('/monitoring/issues/'),
      api.get('/monitoring/documents/'),
    ])
      .then(([progressRes, issuesRes, docsRes]) => {
        setProgressRecords(progressRes.data.slice(0, 50))
        setIssues(issuesRes.data.slice(0, 50))
        setDocuments(docsRes.data.slice(0, 50))
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [])

  const handleDocDelete = async (doc) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return
    try {
      await api.delete(`/monitoring/documents/${doc.document_id}/`)
      loadData()
    } catch (err) {
      console.error('Failed to delete document:', err)
      alert('Failed to delete document.')
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading monitoring data...</div>
  }

  const tabs = [
    { id: 'progress', label: `Progress Records (${progressRecords.length})`, icon: Activity },
    { id: 'issues', label: `Issues (${issues.length})`, icon: AlertCircle },
    { id: 'documents', label: `Documents (${documents.length})`, icon: FileText },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Monitoring</h1>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === 'progress' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Progress Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Physical %</TableHead>
                  <TableHead>Financial %</TableHead>
                  <TableHead>Time %</TableHead>
                  <TableHead>Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progressRecords.map((record) => (
                  <TableRow key={record.record_id}>
                    <TableCell>{new Date(record.record_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{record.project_name || record.project_code || record.project}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(record.physical_progress_pct || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm">{record.physical_progress_pct || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${Math.min(record.financial_progress_pct || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm">{record.financial_progress_pct || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-yellow-600 h-2 rounded-full"
                            style={{ width: `${Math.min(record.time_progress_pct || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm">{record.time_progress_pct || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{record.recorded_by_name || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {progressRecords.length === 0 && (
              <p className="text-slate-500 text-center py-12">No progress records</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'issues' && (
        <Card>
          <CardHeader>
            <CardTitle>Issues & Problems</CardTitle>
          </CardHeader>
          <CardContent>
            {issues.length > 0 ? (
              <div className="space-y-4">
                {issues.map((issue) => (
                  <div key={issue.issue_id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          issue.status === 'resolved' ? 'success' :
                          issue.status === 'escalated' ? 'danger' :
                          issue.status === 'in_progress' ? 'info' : 'warning'
                        }>
                          {issue.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm font-medium text-slate-900">
                          {issue.problem_category_name || 'Issue'}
                        </span>
                        {issue.is_technical_support_request && (
                          <Badge variant="danger">Tech Support</Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(issue.raised_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-900 mb-2">{issue.problem_description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-600">Project:</span>{' '}
                        <span className="font-medium">{issue.project_name || issue.project_code || issue.project}</span>
                      </div>
                      {issue.responsible_org_name && (
                        <div>
                          <span className="text-slate-600">Responsible:</span>{' '}
                          <span className="font-medium">{issue.responsible_org_name}</span>
                        </div>
                      )}
                      {issue.deadline && (
                        <div>
                          <span className="text-slate-600">Deadline:</span>{' '}
                          <span className="font-medium">{new Date(issue.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                      {issue.raised_by_name && (
                        <div>
                          <span className="text-slate-600">Raised by:</span>{' '}
                          <span className="font-medium">{issue.raised_by_name}</span>
                        </div>
                      )}
                    </div>
                    {issue.cause && (
                      <p className="text-sm text-slate-600 mt-2">
                        <strong>Cause:</strong> {issue.cause}
                      </p>
                    )}
                    {issue.required_action && (
                      <p className="text-sm text-slate-600 mt-1">
                        <strong>Action:</strong> {issue.required_action}
                      </p>
                    )}
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
            <div className="flex justify-between items-center">
              <CardTitle>Project Documents</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => { setEditingDoc(null); setShowDocForm(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
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
                    <TableCell className="font-medium">{doc.project_name || doc.project_code || doc.project}</TableCell>
                    <TableCell>{doc.document_type_name || doc.document_type}</TableCell>
                    <TableCell>{doc.description || '-'}</TableCell>
                    <TableCell>{new Date(doc.upload_date).toLocaleDateString()}</TableCell>
                    <TableCell>{doc.uploaded_by_name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(doc.file || doc.file_url) && (
                          <a href={doc.file || doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">View</Button>
                          </a>
                        )}
                        {canEdit && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingDoc(doc); setShowDocForm(true) }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDocDelete(doc)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
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

      {showDocForm && (
        <DocumentForm
          editingDoc={editingDoc}
          onClose={() => { setShowDocForm(false); setEditingDoc(null) }}
          onSuccess={() => {
            loadData()
            setShowDocForm(false)
            setEditingDoc(null)
          }}
        />
      )}
    </div>
  )
}
