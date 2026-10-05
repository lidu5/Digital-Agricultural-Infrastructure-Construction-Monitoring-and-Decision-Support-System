import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { ArrowLeft } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import api from '../api'
import Button from '../components/ui/Button'
import Card, { CardContent } from '../components/ui/Card'

const STATUS_COLORS = {
  on_track: '#16a34a',
  delayed: '#eab308',
  critical: '#dc2626',
  completed: '#2563eb',
}

export default function ProjectMapPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/projects/projects/')
      .then((res) => setProjects(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const withLocation = projects.filter((p) => p.gps_location || (p.latitude && p.longitude))
  
  const getCoordinates = (project) => {
    if (project.gps_location) {
      const coords = project.gps_location.coordinates
      return [coords[1], coords[0]]
    }
    if (project.latitude && project.longitude) {
      return [project.latitude, project.longitude]
    }
    return null
  }

  const center = withLocation.length > 0 && getCoordinates(withLocation[0])
    ? getCoordinates(withLocation[0])
    : [9.145, 40.4897]

  if (loading) {
    return <div className="text-center py-12">Loading map...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Project Map</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <MapContainer center={center} zoom={6} style={{ height: '600px', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {withLocation.map((p) => {
              const coords = getCoordinates(p)
              if (!coords) return null
              
              return (
                <CircleMarker
                  key={p.project_id}
                  center={coords}
                  radius={9}
                  pathOptions={{
                    color: STATUS_COLORS[p.overall_status_flag] || '#64748b',
                    fillColor: STATUS_COLORS[p.overall_status_flag] || '#64748b',
                    fillOpacity: 0.8,
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <strong>{p.project_code}</strong><br />
                      {p.project_name}<br />
                      <span className="text-sm">Status: {p.overall_status_flag.replace('_', ' ')}</span><br />
                      <span className="text-sm">Physical: {p.physical_status_pct}%</span><br />
                      <span className="text-sm">Financial: {p.financial_status_pct}%</span><br />
                      <Link to={`/projects/${p.project_id}`} className="text-blue-600 text-sm hover:underline">
                        View Details →
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div className="font-medium text-slate-700">Legend:</div>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <span style={{ backgroundColor: color }} className="w-4 h-4 rounded-full inline-block" />
                <span className="capitalize">{status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600 mt-3">
            Showing {withLocation.length} of {projects.length} projects with GPS coordinates
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
