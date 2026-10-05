import { useState } from 'react'
import { Users, Building2, Database, MapPin } from 'lucide-react'
import UserManagement from '../components/admin/UserManagement'
import OrganizationManagement from '../components/admin/OrganizationManagement'
import LookupTableManager from '../components/admin/LookupTableManager'
import GeographicManager from '../components/admin/GeographicManager'

export default function Admin() {
  const [activeTab, setActiveTab] = useState('users')

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'organizations', label: 'Organizations', icon: Building2 },
    { id: 'lookups', label: 'Lookup Tables', icon: Database },
    { id: 'geography', label: 'Geography', icon: MapPin },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Administration</h1>

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

      <div>
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'organizations' && <OrganizationManagement />}
        {activeTab === 'lookups' && <LookupTableManager />}
        {activeTab === 'geography' && <GeographicManager />}
      </div>
    </div>
  )
}
