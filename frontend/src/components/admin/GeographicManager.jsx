import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, ChevronRight, ChevronDown } from 'lucide-react'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

export default function GeographicManager() {
  const [regions, setRegions] = useState([])
  const [zones, setZones] = useState([])
  const [woredas, setWoredas] = useState([])
  const [kebeles, setKebeles] = useState([])
  const [expandedRegions, setExpandedRegions] = useState({})
  const [expandedZones, setExpandedZones] = useState({})
  const [expandedWoredas, setExpandedWoredas] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('region')
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({ name: '', parent_id: '' })

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = () => {
    Promise.all([
      api.get('/geography/regions/'),
      api.get('/geography/zones/'),
      api.get('/geography/woredas/'),
      api.get('/geography/kebeles/'),
    ])
      .then(([regionsRes, zonesRes, woredasRes, kebelesRes]) => {
        setRegions(regionsRes.data)
        setZones(zonesRes.data)
        setWoredas(woredasRes.data)
        setKebeles(kebelesRes.data)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    let endpoint, payload
    switch (modalType) {
      case 'region':
        endpoint = '/geography/regions/'
        payload = { name: formData.name }
        break
      case 'zone':
        endpoint = '/geography/zones/'
        payload = { name: formData.name, region: formData.parent_id }
        break
      case 'woreda':
        endpoint = '/geography/woredas/'
        payload = { name: formData.name, zone: formData.parent_id }
        break
      case 'kebele':
        endpoint = '/geography/kebeles/'
        payload = { name: formData.name, woreda: formData.parent_id }
        break
    }

    const request = editingItem
      ? api.put(`${endpoint}${editingItem.id}/`, payload)
      : api.post(endpoint, payload)

    request
      .then(() => {
        loadAll()
        handleCloseModal()
      })
      .catch((err) => {
        console.error(err)
        alert('Failed to save: ' + (err.response?.data?.detail || 'Unknown error'))
      })
  }

  const handleDelete = (type, id) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return

    const endpoints = {
      region: '/geography/regions/',
      zone: '/geography/zones/',
      woreda: '/geography/woredas/',
      kebele: '/geography/kebeles/',
    }

    api.delete(`${endpoints[type]}${id}/`)
      .then(() => loadAll())
      .catch((err) => {
        console.error(err)
        alert('Failed to delete. It may contain child items or be in use.')
      })
  }

  const handleEdit = (type, item) => {
    setModalType(type)
    setEditingItem(item)
    setFormData({
      name: item.name,
      parent_id: item.region || item.zone || item.woreda || '',
    })
    setShowModal(true)
  }

  const handleAdd = (type, parentId = '') => {
    setModalType(type)
    setEditingItem(null)
    setFormData({ name: '', parent_id: parentId })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormData({ name: '', parent_id: '' })
  }

  const toggleRegion = (regionId) => {
    setExpandedRegions(prev => ({ ...prev, [regionId]: !prev[regionId] }))
  }

  const toggleZone = (zoneId) => {
    setExpandedZones(prev => ({ ...prev, [zoneId]: !prev[zoneId] }))
  }

  const toggleWoreda = (woredaId) => {
    setExpandedWoredas(prev => ({ ...prev, [woredaId]: !prev[woredaId] }))
  }

  if (loading) {
    return <div className="text-center py-12">Loading geographic data...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Geographic Hierarchy</h2>
        <Button onClick={() => handleAdd('region')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Region
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            {regions.map((region) => {
              const regionZones = zones.filter(z => z.region === region.id)
              const isExpanded = expandedRegions[region.id]

              return (
                <div key={region.id} className="border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between p-3 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleRegion(region.id)} className="p-1">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <span className="font-medium text-slate-900">{region.name}</span>
                      <span className="text-xs text-slate-500">({regionZones.length} zones)</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleAdd('zone', region.id)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit('region', region)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete('region', region.id)}>
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 pl-10 space-y-2">
                      {regionZones.map((zone) => {
                        const zoneWoredas = woredas.filter(w => w.zone === zone.id)
                        const isZoneExpanded = expandedZones[zone.id]

                        return (
                          <div key={zone.id} className="border border-slate-200 rounded">
                            <div className="flex items-center justify-between p-2 bg-blue-50">
                              <div className="flex items-center gap-2">
                                <button onClick={() => toggleZone(zone.id)} className="p-1">
                                  {isZoneExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <span className="font-medium text-sm">{zone.name}</span>
                                <span className="text-xs text-slate-500">({zoneWoredas.length} woredas)</span>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleAdd('woreda', zone.id)}>
                                  <Plus className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit('zone', zone)}>
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete('zone', zone.id)}>
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </Button>
                              </div>
                            </div>

                            {isZoneExpanded && (
                              <div className="p-2 pl-8 space-y-2">
                                {zoneWoredas.map((woreda) => {
                                  const woredaKebeles = kebeles.filter(k => k.woreda === woreda.id)
                                  const isWoredaExpanded = expandedWoredas[woreda.id]

                                  return (
                                    <div key={woreda.id} className="border border-slate-200 rounded">
                                      <div className="flex items-center justify-between p-2 bg-green-50">
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => toggleWoreda(woreda.id)} className="p-1">
                                            {isWoredaExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                          </button>
                                          <span className="text-sm">{woreda.name}</span>
                                          <span className="text-xs text-slate-500">({woredaKebeles.length} kebeles)</span>
                                        </div>
                                        <div className="flex gap-1">
                                          <Button variant="ghost" size="sm" onClick={() => handleAdd('kebele', woreda.id)}>
                                            <Plus className="w-3 h-3" />
                                          </Button>
                                          <Button variant="ghost" size="sm" onClick={() => handleEdit('woreda', woreda)}>
                                            <Edit2 className="w-3 h-3" />
                                          </Button>
                                          <Button variant="ghost" size="sm" onClick={() => handleDelete('woreda', woreda.id)}>
                                            <Trash2 className="w-3 h-3 text-red-600" />
                                          </Button>
                                        </div>
                                      </div>

                                      {isWoredaExpanded && (
                                        <div className="p-2 pl-8 space-y-1">
                                          {woredaKebeles.map((kebele) => (
                                            <div key={kebele.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                                              <span className="text-sm">{kebele.name}</span>
                                              <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit('kebele', kebele)}>
                                                  <Edit2 className="w-3 h-3" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete('kebele', kebele.id)}>
                                                  <Trash2 className="w-3 h-3 text-red-600" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {editingItem ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
                </CardTitle>
                <button onClick={handleCloseModal}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                {modalType === 'zone' && (
                  <Select
                    label="Region"
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    required
                  >
                    <option value="">Select Region</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </Select>
                )}
                {modalType === 'woreda' && (
                  <Select
                    label="Zone"
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    required
                  >
                    <option value="">Select Zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </Select>
                )}
                {modalType === 'kebele' && (
                  <Select
                    label="Woreda"
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    required
                  >
                    <option value="">Select Woreda</option>
                    {woredas.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </Select>
                )}
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
