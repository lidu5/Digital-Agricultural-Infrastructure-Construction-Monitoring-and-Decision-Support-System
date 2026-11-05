import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, X } from 'lucide-react'
import api from '../../api'
import Button from '../ui/Button'
import Input, { Select } from '../ui/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0)

const cct = (n) => parseFloat(n || 0).toFixed(2)

function ProgressBar({ value, color = 'bg-blue-500' }) {
  const clamped = Math.min(Math.max(parseFloat(value || 0), 0), 100)
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-slate-200 rounded-full h-1.5 flex-shrink-0">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs tabular-nums">{cct(clamped)}%</span>
    </div>
  )
}

// ─── Section form modal ────────────────────────────────────────────────────
function SectionForm({ contractId, sections, editingSection, onClose, onSuccess }) {
  const [form, setForm] = useState({
    contract: contractId,
    parent_section: editingSection?.parent_section || '',
    code: editingSection?.code || '',
    title: editingSection?.title || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, parent_section: form.parent_section || null }
      if (editingSection) {
        await api.put(`/contracts/boq-sections/${editingSection.section_id}/`, payload)
      } else {
        await api.post('/contracts/boq-sections/', payload)
      }
      onSuccess()
      onClose()
    } catch (err) {
      alert('Failed to save section:\n' + JSON.stringify(err.response?.data || err.message, null, 2))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{editingSection ? 'Edit Section' : 'Add BOQ Section'}</CardTitle>
              <button onClick={onClose}><X className="w-5 h-5" /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Parent Section (optional)"
                value={form.parent_section}
                onChange={(e) => setForm({ ...form, parent_section: e.target.value })}
              >
                <option value="">— None (top-level) —</option>
                {sections
                  .filter((s) => s.section_id !== editingSection?.section_id)
                  .map((s) => (
                    <option key={s.section_id} value={s.section_id}>
                      {s.code} — {s.title}
                    </option>
                  ))}
              </Select>
              <Input
                label="Code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g., A, A1, B.2"
                required
              />
              <Input
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Earthworks"
                required
              />
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : editingSection ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Item form modal ───────────────────────────────────────────────────────
function ItemForm({ contractId, sections, editingItem, onClose, onSuccess }) {
  const [form, setForm] = useState({
    contract: contractId,
    section: editingItem?.section || '',
    item_no: editingItem?.item_no || '',
    description: editingItem?.description || '',
    unit: editingItem?.unit || '',
    quantity: editingItem?.quantity || '',
    unit_rate_etb: editingItem?.unit_rate_etb || '',
    total_price_etb: editingItem?.total_price_etb || '',
    weight_pct: editingItem?.weight_pct || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingItem) {
        await api.put(`/contracts/boq-items/${editingItem.item_id}/`, form)
      } else {
        await api.post('/contracts/boq-items/', form)
      }
      onSuccess()
      onClose()
    } catch (err) {
      alert('Failed to save BOQ item:\n' + JSON.stringify(err.response?.data || err.message, null, 2))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{editingItem ? 'Edit BOQ Item' : 'Add BOQ Item'}</CardTitle>
              <button onClick={onClose}><X className="w-5 h-5" /></button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Section"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                required
              >
                <option value="">— Select section —</option>
                {sections.map((s) => (
                  <option key={s.section_id} value={s.section_id}>
                    {s.code} — {s.title}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Item No"
                  value={form.item_no}
                  onChange={(e) => setForm({ ...form, item_no: e.target.value })}
                  placeholder="e.g., A.1.1"
                  required
                />
                <Input
                  label="Unit"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="e.g., m³"
                  required
                />
              </div>
              <Input
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Item description"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Quantity"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
                <Input
                  label="Unit Rate (ETB)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.unit_rate_etb}
                  onChange={(e) => setForm({ ...form, unit_rate_etb: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Total Price (ETB)"
                type="number"
                step="0.01"
                min="0"
                value={form.total_price_etb}
                onChange={(e) => setForm({ ...form, total_price_etb: e.target.value })}
                placeholder="Enter freely; can differ from Qty × Rate"
                required
              />
              <Input
                label="Weight % (contract-global, all items must sum to 100)"
                type="number"
                step="0.0001"
                min="0.0001"
                max="100"
                value={form.weight_pct}
                onChange={(e) => setForm({ ...form, weight_pct: e.target.value })}
                required
              />
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : editingItem ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Single section row (recursive) ────────────────────────────────────────
function SectionRow({ section, depth, canEdit, onEditSection, onDeleteSection, onEditItem, onDeleteItem, onAddItem }) {
  const [open, setOpen] = useState(true)
  const hasChildren = section.child_sections?.length > 0 || section.items?.length > 0
  const indent = depth * 20

  return (
    <>
      <TableRow className="bg-slate-50">
        <TableCell colSpan={2}>
          <div className="flex items-center gap-1 font-semibold text-slate-700" style={{ paddingLeft: indent }}>
            <button
              className="p-0.5 hover:bg-slate-200 rounded"
              onClick={() => setOpen((v) => !v)}
              disabled={!hasChildren}
            >
              {hasChildren
                ? open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                : <span className="w-4 h-4 inline-block" />}
            </button>
            <span className="text-xs text-slate-500 mr-1">{section.code}</span>
            {section.title}
          </div>
        </TableCell>
        <TableCell />
        <TableCell />
        <TableCell />
        <TableCell className="text-right text-xs text-slate-500">
          {fmt(section.items?.reduce((s, i) => s + parseFloat(i.total_price_etb || 0), 0))}
        </TableCell>
        <TableCell className="text-center text-xs">
          <ProgressBar value={section.physical_progress_pct} color="bg-green-500" />
        </TableCell>
        <TableCell className="text-center text-xs">
          <ProgressBar value={section.financial_progress_pct} color="bg-blue-500" />
        </TableCell>
        {canEdit && (
          <TableCell>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" title="Add item to this section" onClick={() => onAddItem(section.section_id)}>
                <Plus className="w-4 h-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEditSection(section)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDeleteSection(section.section_id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>

      {open && (
        <>
          {section.items?.map((item) => (
            <ItemRow
              key={item.item_id}
              item={item}
              depth={depth + 1}
              canEdit={canEdit}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
            />
          ))}
          {section.child_sections?.map((child) => (
            <SectionRow
              key={child.section_id}
              section={child}
              depth={depth + 1}
              canEdit={canEdit}
              onEditSection={onEditSection}
              onDeleteSection={onDeleteSection}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              onAddItem={onAddItem}
            />
          ))}
        </>
      )}
    </>
  )
}

function ItemRow({ item, depth, canEdit, onEdit, onDelete }) {
  const indent = depth * 20 + 24
  return (
    <TableRow className="hover:bg-slate-50/50">
      <TableCell>
        <span className="text-xs font-mono text-slate-500" style={{ paddingLeft: indent }}>
          {item.item_no}
        </span>
      </TableCell>
      <TableCell className="text-sm max-w-xs truncate" title={item.description}>
        {item.description}
      </TableCell>
      <TableCell className="text-center text-sm">{item.unit}</TableCell>
      <TableCell className="text-right text-sm tabular-nums">{fmt(item.quantity)}</TableCell>
      <TableCell className="text-right text-sm tabular-nums">{fmt(item.unit_rate_etb)}</TableCell>
      <TableCell className="text-right text-sm tabular-nums">{fmt(item.total_price_etb)}</TableCell>
      <TableCell className="text-center">
        <ProgressBar value={item.physical_progress_pct} color="bg-green-500" />
      </TableCell>
      <TableCell className="text-center">
        <ProgressBar value={item.financial_progress_pct} color="bg-blue-500" />
      </TableCell>
      {canEdit && (
        <TableCell>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(item.item_id)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  )
}

// ─── Main BOQTab component ─────────────────────────────────────────────────
export default function BOQTab({ contractId, canEdit, onAddPhysicalProgress }) {
  const [sections, setSections] = useState([])
  const [allSections, setAllSections] = useState([])
  const [totalWeight, setTotalWeight] = useState(0)
  const [loading, setLoading] = useState(true)

  const [showSectionForm, setShowSectionForm] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [preselectSection, setPreselectSection] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get(`/contracts/boq-sections/?contract=${contractId}`),
      api.get(`/contracts/boq-items/?contract=${contractId}`),
    ])
      .then(([secRes, itemRes]) => {
        setAllSections(secRes.data)
        const topLevel = secRes.data.filter((s) => !s.parent_section)
        setSections(topLevel)
        const w = itemRes.data.reduce((s, i) => s + parseFloat(i.weight_pct || 0), 0)
        setTotalWeight(w)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [contractId])

  useEffect(() => { load() }, [load])

  const handleDeleteSection = async (id) => {
    if (!window.confirm('Delete this section and all its items? This cannot be undone.')) return
    try {
      await api.delete(`/contracts/boq-sections/${id}/`)
      load()
    } catch (err) {
      alert('Failed to delete section:\n' + JSON.stringify(err.response?.data || err.message, null, 2))
    }
  }

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this BOQ item? This cannot be undone.')) return
    try {
      await api.delete(`/contracts/boq-items/${id}/`)
      load()
    } catch (err) {
      alert('Failed to delete item:\n' + JSON.stringify(err.response?.data || err.message, null, 2))
    }
  }

  const handleAddItem = (sectionId) => {
    setEditingItem(null)
    setPreselectSection(sectionId)
    setShowItemForm(true)
  }

  if (loading) return <p className="text-center py-8 text-slate-500">Loading BOQ…</p>

  const weightOk = Math.abs(totalWeight - 100) < 0.005
  const remaining = (100 - totalWeight).toFixed(4)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
            weightOk ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            Total weight: {totalWeight.toFixed(4)}%
            {!weightOk && ` (${remaining > 0 ? remaining + '% remaining' : Math.abs(remaining) + '% over'})`}
          </span>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditingSection(null); setShowSectionForm(true) }}>
              <Plus className="w-4 h-4 mr-1" />
              Add Section
            </Button>
            <Button size="sm" onClick={() => { setEditingItem(null); setPreselectSection(null); setShowItemForm(true) }}>
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
            {onAddPhysicalProgress && (
              <Button size="sm" variant="secondary" onClick={onAddPhysicalProgress}>
                <Plus className="w-4 h-4 mr-1" />
                Record Progress
              </Button>
            )}
          </div>
        )}
      </div>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            No BOQ sections yet.{canEdit ? ' Add a section to get started.' : ''}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Item No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center w-16">Unit</TableHead>
                  <TableHead className="text-right w-24">Qty</TableHead>
                  <TableHead className="text-right w-28">Unit Rate</TableHead>
                  <TableHead className="text-right w-32">Total Price</TableHead>
                  <TableHead className="text-center w-36">Physical %</TableHead>
                  <TableHead className="text-center w-36">Financial %</TableHead>
                  {canEdit && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <SectionRow
                    key={section.section_id}
                    section={section}
                    depth={0}
                    canEdit={canEdit}
                    onEditSection={(s) => { setEditingSection(s); setShowSectionForm(true) }}
                    onDeleteSection={handleDeleteSection}
                    onEditItem={(i) => { setEditingItem(i); setPreselectSection(null); setShowItemForm(true) }}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={handleAddItem}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {showSectionForm && (
        <SectionForm
          contractId={contractId}
          sections={allSections}
          editingSection={editingSection}
          onClose={() => setShowSectionForm(false)}
          onSuccess={load}
        />
      )}

      {showItemForm && (
        <ItemForm
          contractId={contractId}
          sections={allSections}
          editingItem={
            editingItem
              ? editingItem
              : preselectSection
              ? { section: preselectSection }
              : null
          }
          onClose={() => { setShowItemForm(false); setPreselectSection(null) }}
          onSuccess={load}
        />
      )}
    </div>
  )
}
