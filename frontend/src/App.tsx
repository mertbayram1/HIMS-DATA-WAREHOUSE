import React, { useEffect, useState, useCallback } from 'react'
import { Routes, Route, useNavigate, Link, useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'sonner'
import {
  LayoutDashboard, Users, UserPlus, LogOut, Search,
  ChevronLeft, ChevronRight, Hospital, Calendar,
  Receipt, Stethoscope, Pill, BarChart3
} from 'lucide-react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PatientDetail from './pages/PatientDetail'
import AddPatient from './pages/AddPatient'
import Appointments from './pages/Appointments'
import Invoices from './pages/Invoices'
import Doctors from './pages/Doctors'
import Medications from './pages/Medications'
import Reports from './pages/Reports'

type Patient = {
  patient_key: number; patient_full_name: string; patient_national_id: string
  gender: string; birth_date: string; city?: string; phone?: string
  insurance_type?: string; blood_type?: string
}

export default function App() {
  const [token, setToken] = useState<string | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const limit = 20
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[] | null>(null)
  const [searching, setSearching] = useState(false)

  const API_BASE = (import.meta.env.VITE_API_BASE as string) ?? 'http://127.0.0.1:8005'
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const t = localStorage.getItem('hims_token')
    if (t) setToken(t)
  }, [])

  const headers = useCallback((): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token])

  useEffect(() => {
    if (!token || location.pathname !== '/patients') return
    setLoading(true)
    fetch(`${API_BASE}/api/patients?skip=${page * limit}&limit=${limit}`, { headers: headers() })
      .then(r => r.json())
      .then(data => setPatients(data.results || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [token, location.pathname, page, API_BASE, headers])

  useEffect(() => {
    if (!token || !searchQuery || searchQuery.trim().length < 2) {
      setSearchResults(null)
      return
    }
    const timer = setTimeout(() => {
      setSearching(true)
      fetch(`${API_BASE}/api/patients/search?q=${encodeURIComponent(searchQuery.trim())}&limit=50`, { headers: headers() })
        .then(r => r.json())
        .then(data => setSearchResults(data.results || []))
        .finally(() => setSearching(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, token, API_BASE, headers])

  const handleLogin = (tok: string) => {
    localStorage.setItem('hims_token', tok)
    setToken(tok)
    navigate('/')
  }

  const handleLogout = () => {
    localStorage.removeItem('hims_token')
    setToken(null)
    navigate('/')
  }

  if (!token) return <Login onLogin={handleLogin} />

  const navGroups = [
    {
      label: 'Genel',
      items: [
        { path: '/',           label: 'Dashboard',   icon: <LayoutDashboard size={18} /> },
        { path: '/reports',    label: 'Raporlar',    icon: <BarChart3 size={18} /> },
      ]
    },
    {
      label: 'Klinik',
      items: [
        { path: '/patients',      label: 'Hastalar',      icon: <Users size={18} /> },
        { path: '/add-patient',   label: 'Yeni Hasta',    icon: <UserPlus size={18} /> },
        { path: '/appointments',  label: 'Randevular',    icon: <Calendar size={18} /> },
        { path: '/doctors',       label: 'Doktorlar',     icon: <Stethoscope size={18} /> },
      ]
    },
    {
      label: 'Finans & Stok',
      items: [
        { path: '/invoices',      label: 'Faturalar',     icon: <Receipt size={18} /> },
        { path: '/medications',   label: 'İlaç & Stok',  icon: <Pill size={18} /> },
      ]
    },
  ]

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

  return (
    <div className="flex min-h-screen bg-background">
      <Toaster theme="light" position="bottom-right" richColors />

      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-white/5 flex flex-col sticky top-0 h-screen">
        <div className="p-5 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-medical-blue to-medical-teal flex items-center justify-center shadow-lg shadow-medical-blue/20 shrink-0">
            <Hospital className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-gray-100 tracking-tight leading-tight">HIMS PRO</h1>
            <p className="text-[9px] text-medical-teal font-bold tracking-widest uppercase">Medical System</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.15em] px-3 mb-2">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm ${
                      isActive(item.path)
                        ? 'bg-medical-blue/10 text-medical-blue border border-medical-blue/20'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                    {isActive(item.path) && (
                      <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-medical-blue" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-medical-red hover:bg-medical-red/10 transition-all duration-200"
          >
            <LogOut size={18} />
            <span className="font-medium">Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="relative w-80 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-medical-teal transition-colors" size={16} />
            <input
              type="text"
              placeholder="Hasta ara (Ad, TC, Şehir)..."
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-transparent rounded-xl focus:border-medical-teal/30 focus:ring-4 focus:ring-medical-teal/5 outline-none text-sm transition-all"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                if (location.pathname !== '/patients') navigate('/patients')
              }}
            />
            {searching && <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-medical-teal/20 border-t-medical-teal rounded-full animate-spin" />}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-200">Admin Paneli</p>
              <p className="text-[10px] text-gray-500">Sistem Yöneticisi</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-medical-blue/20 flex items-center justify-center text-medical-blue font-bold text-sm border border-medical-blue/30">
              AD
            </div>
          </div>
        </header>

        <main className="p-6 flex-1">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/"              element={<Dashboard   apiBase={API_BASE} token={token} />} />
              <Route path="/reports"       element={<Reports     apiBase={API_BASE} token={token} />} />
              <Route path="/appointments"  element={<Appointments apiBase={API_BASE} token={token} />} />
              <Route path="/invoices"      element={<Invoices    apiBase={API_BASE} token={token} />} />
              <Route path="/doctors"       element={<Doctors     apiBase={API_BASE} token={token} />} />
              <Route path="/medications"   element={<Medications apiBase={API_BASE} token={token} />} />
              <Route path="/patients"      element={<PatientsList patients={searchResults || patients} loading={loading} page={page} setPage={setPage} limit={limit} searchQuery={searchQuery} />} />
              <Route path="/add-patient"   element={<AddPatient apiBase={API_BASE} token={token} onSuccess={() => navigate('/patients')} />} />
              <Route path="/patients/:id"  element={<PatientDetailWrapper apiBase={API_BASE} token={token} />} />
              <Route path="*"              element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function PatientsList({ patients, loading, page, setPage, limit, searchQuery }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">Hasta Kayıtları</h2>
        <div className="px-4 py-1 bg-white/5 rounded-lg border border-white/5 text-xs text-gray-500 font-medium uppercase tracking-widest">
          {searchQuery ? `${patients.length} Sonuç` : `Sayfa ${page + 1}`}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-5 flex items-start gap-4 animate-pulse border-white/5">
              <div className="w-12 h-12 rounded-xl bg-surface/80" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-surface/80 rounded w-3/4" />
                <div className="h-3 bg-surface/80 rounded w-1/2" />
                <div className="flex gap-2 mt-4"><div className="h-4 bg-surface/80 rounded-full w-16" /><div className="h-4 bg-surface/80 rounded-full w-16" /></div>
              </div>
            </div>
          ))
        ) : (
          patients.map((p: Patient) => (
            <Link key={p.patient_key} to={`/patients/${p.patient_key}`}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="glass-card p-5 group flex items-start gap-4 hover:border-medical-blue/30">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner ${
                  p.gender === 'E' ? 'bg-medical-blue/10 text-medical-blue' : 'bg-pink-500/10 text-pink-400'
                }`}>
                  {p.patient_full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-100 truncate group-hover:text-medical-blue transition-colors">{p.patient_full_name}</h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">TC: {p.patient_national_id}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] text-gray-400 font-bold bg-white/5 px-2 py-0.5 rounded-full uppercase">{p.city || 'Belirsiz'}</span>
                    <span className="text-[10px] text-medical-teal font-bold bg-medical-teal/10 px-2 py-0.5 rounded-full uppercase">{p.insurance_type}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-700 group-hover:text-medical-blue group-hover:translate-x-1 transition-all mt-1" />
              </motion.div>
            </Link>
          ))
        )}
      </div>
      {!searchQuery && (
        <div className="flex justify-center gap-4 pt-4">
          <button className="btn-secondary flex items-center gap-2" disabled={page === 0} onClick={() => setPage((p: number) => Math.max(0, p - 1))}>
            <ChevronLeft size={16} /> Önceki
          </button>
          <button className="btn-primary flex items-center gap-2" disabled={patients.length < limit} onClick={() => setPage((p: number) => p + 1)}>
            Sonraki <ChevronRight size={16} />
          </button>
        </div>
      )}
    </motion.div>
  )
}

function PatientDetailWrapper({ apiBase, token }: any) {
  const { pathname } = useLocation()
  const match = pathname.match(/\/patients\/(\d+)/)
  const id = match ? match[1] : null
  const navigate = useNavigate()
  if (!id) return <Navigate to="/patients" />
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <button className="btn-secondary flex items-center gap-2" onClick={() => navigate(-1)}>
        <ChevronLeft size={16} /> Geri Dön
      </button>
      <PatientDetail apiBase={apiBase} token={token} patientKey={parseInt(id, 10)} />
    </motion.div>
  )
}
