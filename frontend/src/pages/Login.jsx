import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import irrigationBg from '../assets/irrigation1.jpg'
import moaLogo from '../assets/Moa picture.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/token/', { username: email, password })
      const token = res.data.token
      
      localStorage.setItem('token', token)
      
      const userRes = await api.get('/accounts/me/')
      login(token, userRes.data)
      
      navigate('/')
    } catch (err) {
      setError('Login failed. Please check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center relative"
      style={{ backgroundImage: `url(${irrigationBg})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-900/30 to-slate-900/10" />

      <div className="relative min-h-screen max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="text-white">
          <div className="flex items-center gap-3 mb-8">
            <img src={moaLogo} alt="Ministry of Agriculture logo" className="w-15 h-15 rounded-full" />
            <span className="text-2xl font-bold tracking-wide">DIPCMT-DSS</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight uppercase">
            Monitor<br />Every Drop
          </h1>
          <p className="mt-6 text-xl font-medium">
            Digital Agricultural Infrastructure Construction Monitoring and Decision Support System
          </p>
          <p className="mt-3 text-sm text-slate-200 max-w-md">
            Track irrigation projects, contracts and progress across every region, and act on delays before they become critical.
          </p>
        </div>

        <div className="w-full max-w-md lg:ml-auto bg-white/20 backdrop-blur-md border border-white/30 rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium uppercase tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
