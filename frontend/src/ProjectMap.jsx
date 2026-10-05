import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from './api'

const STATUS_COLORS = {
  on_track: '#16a34a',
  delayed: '#eab308',
  critical: '#dc2626',
  completed: '#2563eb',
}

function ProjectMap() {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    api.get('/projects/projects/')
      .then((res) => setProjects(res.data))
      .catch((err) => console.error(err))
  }, [])

  const withLocation = projects.filter((p) => p.latitude && p.longitude)
  const center = withLocation.length > 0
    ? [withLocation[0].latitude, withLocation[0].longitude]
    : [9.145, 40.4897] // Ethiopia, fallback if nothing has a location yet

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-slate-800 mb-3">Project Map</h2>
      <MapContainer center={center} zoom={6} style={{ height: '600px', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withLocation.map((p) => (
          <CircleMarker
            key={p.project_id}
            center={[p.latitude, p.longitude]}
            radius={9}
            pathOptions={{
              color: STATUS_COLORS[p.overall_status_flag] || '#64748b',
              fillColor: STATUS_COLORS[p.overall_status_flag] || '#64748b',
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              <strong>{p.project_code}</strong><br />
              {p.project_name}<br />
              Status: {p.overall_status_flag}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="flex gap-4 mt-3 text-sm">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <span style={{ backgroundColor: color }} className="w-3 h-3 rounded-full inline-block" />
            <span className="capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
      {withLocation.length === 0 && (
        <p className="text-slate-500 mt-3">No projects have GPS coordinates set yet.</p>
      )}
    </div>
  )
}

export default ProjectMap