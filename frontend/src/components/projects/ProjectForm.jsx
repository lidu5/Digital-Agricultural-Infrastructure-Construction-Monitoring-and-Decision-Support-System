import { useState, useEffect } from 'react'
import { X, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'

export default function ProjectForm({ onClose, onSuccess, editingProject = null }) {
  const { user, isAdmin, isRegionalManager, userRegion } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showCropMenu, setShowCropMenu] = useState(false)
  const [lookupData, setLookupData] = useState({
    regions: [],
    zones: [],
    woredas: [],
    kebeles: [],
    projectTypes: [],
    waterSources: [],
    irrigationTechnologies: [],
    irrigationSystems: [],
    projectCategories: [],
    financingSources: [],
    crops: [],
  })

  const [formData, setFormData] = useState({
    project_name: '',
    project_code: '',
    region: userRegion || '',
    zone: '',
    woreda: '',
    kebele: '',
    project_type: '',
    water_source: '',
    irrigation_technology: '',
    irrigation_system: '',
    category: '',
    financing_source: '',
    designed_irrigable_area_ha: '',
    target_beneficiaries_thh: '',
    target_beneficiaries_male: '',
    target_beneficiaries_female: '',
    latitude: '',
    longitude: '',
    crops: [],
  })

  useEffect(() => {
    loadLookupData()
    if (editingProject) {
      setFormData({
        project_name: editingProject.project_name || '',
        project_code: editingProject.project_code || '',
        region: editingProject.region || '',
        zone: editingProject.zone || '',
        woreda: editingProject.woreda || '',
        kebele: editingProject.kebele || '',
        project_type: editingProject.project_type || '',
        water_source: editingProject.water_source || '',
        irrigation_technology: editingProject.irrigation_technology || '',
        irrigation_system: editingProject.irrigation_system || '',
        category: editingProject.category || '',
        financing_source: editingProject.financing_source || '',
        designed_irrigable_area_ha: editingProject.designed_irrigable_area_ha || '',
        target_beneficiaries_thh: editingProject.target_beneficiaries_thh || '',
        target_beneficiaries_male: editingProject.target_beneficiaries_male || '',
        target_beneficiaries_female: editingProject.target_beneficiaries_female || '',
        latitude: editingProject.latitude || '',
        longitude: editingProject.longitude || '',
        crops: editingProject.crops || [],
      })
    }
  }, [editingProject])

  const loadLookupData = async () => {
    try {
      const [
        regionsRes,
        zonesRes,
        woredasRes,
        kebelesRes,
        projectTypesRes,
        waterSourcesRes,
        irrigationTechRes,
        irrigationSysRes,
        projectCatRes,
        financingRes,
        cropsRes,
      ] = await Promise.all([
        api.get('/geography/regions/'),
        api.get('/geography/zones/'),
        api.get('/geography/woredas/'),
        api.get('/geography/kebeles/'),
        api.get('/geography/project-types/'),
        api.get('/geography/water-sources/'),
        api.get('/geography/irrigation-technologies/'),
        api.get('/geography/irrigation-systems/'),
        api.get('/geography/project-categories/'),
        api.get('/geography/financing-sources/'),
        api.get('/geography/crops/'),
      ])

      setLookupData({
        regions: regionsRes.data,
        zones: zonesRes.data,
        woredas: woredasRes.data,
        kebeles: kebelesRes.data,
        projectTypes: projectTypesRes.data,
        waterSources: waterSourcesRes.data,
        irrigationTechnologies: irrigationTechRes.data,
        irrigationSystems: irrigationSysRes.data,
        projectCategories: projectCatRes.data,
        financingSources: financingRes.data,
        crops: cropsRes.data,
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
      
      // Regional managers can only create in their region
      if (isRegionalManager) {
        payload.region = userRegion
      }

      // Convert empty strings to null for optional fields
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null
        }
      })

      if (editingProject) {
        await api.put(`/projects/projects/${editingProject.project_id}/`, payload)
      } else {
        await api.post('/projects/projects/', payload)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save project:', err)
      console.error('Error response:', err.response?.data)
      const errorMsg = err.response?.data 
        ? JSON.stringify(err.response.data, null, 2)
        : err.response?.data?.detail || 'Unknown error'
      alert('Failed to save project:\n' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const toggleCrop = (cropId) => {
    setFormData((prev) => ({
      ...prev,
      crops: prev.crops.includes(cropId)
        ? prev.crops.filter((id) => id !== cropId)
        : [...prev.crops, cropId],
    }))
  }

  const filteredZones = lookupData.zones.filter(z => z.region === parseInt(formData.region))
  const filteredWoredas = lookupData.woredas.filter(w => w.zone === parseInt(formData.zone))
  const filteredKebeles = lookupData.kebeles.filter(k => k.woreda === parseInt(formData.woreda))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</CardTitle>
            <button onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Project Name"
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  required
                />
                <Input
                  label="Project Code"
                  value={formData.project_code}
                  onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value, zone: '', woreda: '', kebele: '' })}
                  required
                  disabled={isRegionalManager}
                >
                  <option value="">Select Region</option>
                  {lookupData.regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
                <Select
                  label="Zone"
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value, woreda: '', kebele: '' })}
                  required
                  disabled={!formData.region}
                >
                  <option value="">Select Zone</option>
                  {filteredZones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </Select>
                <Select
                  label="Woreda"
                  value={formData.woreda}
                  onChange={(e) => setFormData({ ...formData, woreda: e.target.value, kebele: '' })}
                  required
                  disabled={!formData.zone}
                >
                  <option value="">Select Woreda</option>
                  {filteredWoredas.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
                <Select
                  label="Kebele"
                  value={formData.kebele}
                  onChange={(e) => setFormData({ ...formData, kebele: e.target.value })}
                  disabled={!formData.woreda}
                >
                  <option value="">Select Kebele (Optional)</option>
                  {filteredKebeles.map((k) => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="e.g., 9.145"
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="e.g., 40.4897"
                />
              </div>
            </div>

            {/* Project Classification */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Project Type"
                  value={formData.project_type}
                  onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                  required
                >
                  <option value="">Select Type</option>
                  {lookupData.projectTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
                <Select
                  label="Water Source"
                  value={formData.water_source}
                  onChange={(e) => setFormData({ ...formData, water_source: e.target.value })}
                  required
                >
                  <option value="">Select Water Source</option>
                  {lookupData.waterSources.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
                <Select
                  label="Irrigation Technology"
                  value={formData.irrigation_technology}
                  onChange={(e) => setFormData({ ...formData, irrigation_technology: e.target.value })}
                  required
                >
                  <option value="">Select Technology</option>
                  {lookupData.irrigationTechnologies.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
                <Select
                  label="Irrigation System"
                  value={formData.irrigation_system}
                  onChange={(e) => setFormData({ ...formData, irrigation_system: e.target.value })}
                  required
                >
                  <option value="">Select System</option>
                  {lookupData.irrigationSystems.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
                <Select
                  label="Project Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Select Category</option>
                  {lookupData.projectCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
                <Select
                  label="Financing Source"
                  value={formData.financing_source}
                  onChange={(e) => setFormData({ ...formData, financing_source: e.target.value })}
                  required
                >
                  <option value="">Select Financing Source</option>
                  {lookupData.financingSources.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Main Crops */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Main Crops</h3>
              {lookupData.crops.length > 0 ? (
                <div className="relative max-w-md">
                  {showCropMenu && (
                    <div className="fixed inset-0 z-10" onClick={() => setShowCropMenu(false)} />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCropMenu((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-slate-300 rounded-md bg-white text-sm text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {formData.crops.length
                      ? `${formData.crops.length} crop${formData.crops.length > 1 ? 's' : ''} selected`
                      : 'Select crops'}
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                  {showCropMenu && (
                    <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
                      {lookupData.crops.map((crop) => (
                        <button
                          key={crop.id}
                          type="button"
                          onClick={() => toggleCrop(crop.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {crop.name}
                          {formData.crops.includes(crop.id) && (
                            <Check className="w-4 h-4 text-blue-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.crops.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.crops.map((cropId) => {
                        const crop = lookupData.crops.find((c) => c.id === cropId)
                        return (
                          <span
                            key={cropId}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                          >
                            {crop?.name || cropId}
                            <button
                              type="button"
                              onClick={() => toggleCrop(cropId)}
                              className="hover:text-blue-900"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No crops defined yet — add them under Admin → Lookup Tables.</p>
              )}
            </div>

            {/* Project Details */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Designed Irrigable Area (hectares)"
                  type="number"
                  step="0.01"
                  value={formData.designed_irrigable_area_ha}
                  onChange={(e) => setFormData({ ...formData, designed_irrigable_area_ha: e.target.value })}
                />
                <Input
                  label="Target Beneficiaries (Households)"
                  type="number"
                  value={formData.target_beneficiaries_thh}
                  onChange={(e) => setFormData({ ...formData, target_beneficiaries_thh: e.target.value })}
                />
                <Input
                  label="Male Beneficiaries"
                  type="number"
                  value={formData.target_beneficiaries_male}
                  onChange={(e) => setFormData({ ...formData, target_beneficiaries_male: e.target.value })}
                />
                <Input
                  label="Female Beneficiaries"
                  type="number"
                  value={formData.target_beneficiaries_female}
                  onChange={(e) => setFormData({ ...formData, target_beneficiaries_female: e.target.value })}
                />
              </div>
            </div>

            {isRegionalManager && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> As a Regional Manager, you can only create projects in your assigned region ({lookupData.regions.find(r => r.id === userRegion)?.name}).
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving...' : (editingProject ? 'Update Project' : 'Create Project')}
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
