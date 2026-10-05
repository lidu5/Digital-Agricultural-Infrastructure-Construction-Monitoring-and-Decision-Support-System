import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      loadUser()
    } else {
      setLoading(false)
    }
  }, [])

  const loadUser = () => {
    api.get('/accounts/me/')
      .then((res) => {
        setUser(res.data)
      })
      .catch((err) => {
        console.error('Failed to load user:', err)
        localStorage.removeItem('token')
      })
      .finally(() => setLoading(false))
  }

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const hasPermission = (permission) => {
    if (!user) return false
    
    switch (permission) {
      case 'admin':
        return user.role === 'admin'
      case 'regional_manager':
        return user.role === 'regional_manager' || user.role === 'admin'
      case 'view_all_regions':
        return user.role === 'admin' || user.role === 'national_viewer'
      case 'edit':
        return user.role === 'admin' || user.role === 'regional_manager'
      default:
        return false
    }
  }

  const canAccessProject = (project) => {
    if (!user) return false
    if (user.role === 'admin' || user.role === 'national_viewer') return true
    if (user.role === 'regional_manager') {
      return project.region === user.region
    }
    return false
  }

  const canEditProject = (project) => {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role === 'regional_manager') {
      return project.region === user.region
    }
    return false
  }

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    canAccessProject,
    canEditProject,
    isAdmin: user?.role === 'admin',
    isRegionalManager: user?.role === 'regional_manager',
    isNationalViewer: user?.role === 'national_viewer',
    userRegion: user?.region,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
