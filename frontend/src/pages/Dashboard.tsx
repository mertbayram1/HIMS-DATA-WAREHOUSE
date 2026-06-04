import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Calendar, Stethoscope, UserRound, Pill, 
  Wallet, Activity, CheckCircle2, Clock, AlertCircle, 
  XCircle, MapPin, Droplets, ShieldCheck, BarChart3,
  TrendingUp
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type Stats = {
  patients: number; appointments: number; consultations: number;
  doctors: number; departments: number; medications: number;
  invoice_total: number; paid_total: number;
  scheduled_appointments: number; completed_appointments: number;
  cancelled_appointments: number; no_show_appointments: number;
  prescriptions: number;
}

type DataQuality = {
  prescription_without_invoice: number; invoice_without_prescription: number;
  matched_prescription_invoice: number; total_consultations: number;
}

type DeptRow = {
  department_name: string; total_appointments_90d: number;
  completed_appointments_90d: number; completion_rate_pct: number | null;
}

type DemoRow = { gender?: string; insurance_type?: string; city?: string; age_group?: string; blood_type?: string; count: number }

type Props = { apiBase: string; token: string }

export default function Dashboard({ apiBase, token }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null)
  const [depts, setDepts] = useState<DeptRow[]>([])
  const [demographics, setDemographics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'demographics'>('overview')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    const fetchJSON = (url: string) =>
      fetch(url, { headers, signal: ctrl.signal })
        .then(r => {
          if (r.status === 401) { localStorage.removeItem('hims_token'); window.location.reload(); return null }
          return r.ok ? r.json() : null
        })
        .catch(() => null)

    Promise.all([
      fetchJSON(`${apiBase}/api/stats/summary`),
      fetchJSON(`${apiBase}/api/reports/department-occupancy`),
      fetchJSON(`${apiBase}/api/reports/patient-demographics`),
      fetchJSON(`${apiBase}/api/reports/data-quality`),
    ]).then(([s, d, dem, dq]) => {
      if (s) setStats(s)
      if (d && d.results) setDepts(d.results || [])
      if (dem) setDemographics(dem)
      if (dq && dq.results) setDataQuality(dq.results[0] || null)
    }).finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [apiBase, token])

  if (loading) return <LoadingSkeleton />
  if (!stats) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="w-12 h-12 text-medical-red animate-pulse" />
      <p className="text-xl font-medium text-gray-400">İstatistikler yüklenemedi</p>
    </div>
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-12"
    >
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">
            Hastane Paneli
          </h1>
          <p className="text-gray-500 mt-1">Sistem genel durumu ve analitik veriler</p>
        </div>
        
        <div className="flex p-1 bg-secondary rounded-2xl border border-white/5">
          {(['overview', 'departments', 'demographics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === tab 
                ? 'bg-medical-blue text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'overview' ? 'Genel Bakış' : tab === 'departments' ? 'Departmanlar' : 'Demografik'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Data Quality Warning */}
            {dataQuality && dataQuality.prescription_without_invoice > 0 && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-4 rounded-2xl bg-medical-red/10 border border-medical-red/20 flex items-center gap-4"
              >
                <AlertCircle className="w-6 h-6 text-medical-red shrink-0" />
                <div className="flex-1">
                  <h4 className="text-medical-red font-semibold text-sm">Fatura Eksikliği Uyarısı</h4>
                  <p className="text-medical-red/80 text-xs mt-0.5">
                    {dataQuality.prescription_without_invoice} danışmada reçete kesilmiş ancak fatura oluşturulmamış. Lütfen Faturalar sayfasından kontrol ediniz.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <StatCard icon={<Users />} label="Toplam Hasta" value={stats.patients} color="blue" />
              <StatCard icon={<Calendar />} label="Randevu" value={stats.appointments} color="teal" />
              <StatCard icon={<Stethoscope />} label="Danışma" value={stats.consultations} color="emerald" />
              <StatCard icon={<UserRound />} label="Doktor" value={stats.doctors} color="violet" />
              <StatCard icon={<Pill />} label="Reçete" value={stats.prescriptions} color="amber" />
              <StatCard icon={<Wallet />} label="Ciro" value={stats.invoice_total} isCurrency color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Appointment Breakdown */}
              <div className="glass-card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-medical-blue" />
                    Randevu Dağılımı
                  </h3>
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <MiniStat icon={<CheckCircle2 />} label="Tamamlandı" value={stats.completed_appointments} total={stats.appointments} color="text-emerald-500" bg="bg-emerald-500" />
                  <MiniStat icon={<Clock />} label="Planlanan" value={stats.scheduled_appointments} total={stats.appointments} color="text-medical-blue" bg="bg-medical-blue" />
                  <MiniStat icon={<AlertCircle />} label="İptal" value={stats.cancelled_appointments} total={stats.appointments} color="text-amber-500" bg="bg-amber-500" />
                  <MiniStat icon={<XCircle />} label="Gelmedi" value={stats.no_show_appointments} total={stats.appointments} color="text-medical-red" bg="bg-medical-red" />
                </div>
              </div>

              {/* Top Departments */}
              <div className="glass-card p-6 space-y-6 flex flex-col">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-medical-teal" />
                  Yoğun Departmanlar
                </h3>
                <div className="flex-1 min-h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={depts.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="department_name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(15,23,42,0.02)' }}
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        itemStyle={{ color: '#0ea5e9', fontWeight: 'bold' }}
                        labelStyle={{ color: '#0f172a', marginBottom: '4px' }}
                      />
                      <Bar dataKey="total_appointments_90d" radius={[0, 8, 8, 0]} barSize={24}>
                        {depts.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#0ea5e9' : index === 1 ? '#14b8a6' : '#2ea043'} className="hover:opacity-80 transition-opacity cursor-pointer" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'departments' && (
          <motion.div 
            key="departments"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden"
          >
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-semibold">Departman Performans Raporu</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Departman</th>
                    <th className="px-6 py-4 text-right">Randevu</th>
                    <th className="px-6 py-4 text-right">Tamamlanan</th>
                    <th className="px-6 py-4 text-right">İptal</th>
                    <th className="px-6 py-4 text-right">Gelmedi</th>
                    <th className="px-6 py-4 text-right">Verimlilik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {depts.map((d, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 font-medium text-gray-200">{d.department_name}</td>
                      <td className="px-6 py-4 text-right text-gray-400">{d.total_appointments_90d}</td>
                      <td className="px-6 py-4 text-right text-emerald-500/80 font-medium">{d.completed_appointments_90d}</td>
                      <td className="px-6 py-4 text-right text-amber-500/80">{(d as any).cancelled_appointments_90d ?? 0}</td>
                      <td className="px-6 py-4 text-right text-medical-red/80">{(d as any).no_show_appointments_90d ?? 0}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          (d.completion_rate_pct ?? 0) >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 
                          (d.completion_rate_pct ?? 0) >= 50 ? 'bg-amber-500/10 text-amber-500' : 
                          'bg-medical-red/10 text-medical-red'
                        }`}>
                          {d.completion_rate_pct ?? 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'demographics' && demographics && (
          <motion.div 
            key="demographics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <DemoCard icon={<Users className="text-medical-blue" />} title="Cinsiyet" data={demographics.gender} type="gender" />
            <DemoCard icon={<ShieldCheck className="text-medical-teal" />} title="Sigorta" data={demographics.insurance} type="insurance" />
            <DemoCard icon={<BarChart3 className="text-violet-400" />} title="Yaş Grupları" data={demographics.age_groups} type="age" />
            <DemoCard icon={<MapPin className="text-medical-red" />} title="En Çok Hasta Gelen Şehirler" data={demographics.cities?.slice(0, 8)} type="city" />
            
            {/* Blood Types Grid */}
            <div className="glass-card p-6 space-y-6 lg:col-span-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Droplets className="text-medical-red" />
                Kan Grubu Dağılımı
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {demographics.blood_types?.map((b: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-medical-red/30 transition-all text-center">
                    <div className="text-2xl font-bold text-medical-red mb-1">{b.blood_type}</div>
                    <div className="text-sm text-gray-500">{b.count} Hasta</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function StatCard({ icon, label, value, color, isCurrency = false }: any) {
  const colors: any = {
    blue: 'text-medical-blue bg-medical-blue/10 border-medical-blue/20',
    teal: 'text-medical-teal bg-medical-teal/10 border-medical-teal/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    violet: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    rose: 'text-medical-red bg-medical-red/10 border-medical-red/20',
  }

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="glass-card p-5 relative group"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div className="space-y-1">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-100">
          {isCurrency && '₺'}
          {value.toLocaleString('tr-TR', isCurrency ? { minimumFractionDigits: 2 } : {})}
        </p>
      </div>
    </motion.div>
  )
}

function MiniStat({ icon, label, value, total, color, bg }: any) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
      <div className="flex items-center gap-2 mb-3">
        <span className={color}>{React.cloneElement(icon, { size: 16 })}</span>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-gray-100">{value.toLocaleString('tr-TR')}</span>
        <span className="text-[10px] text-gray-500 font-bold uppercase">{pct.toFixed(0)}%</span>
      </div>
      <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          className={`h-full ${bg}`}
        />
      </div>
    </div>
  )
}

function DemoCard({ icon, title, data, type }: any) {
  const colors = ['bg-medical-blue', 'bg-medical-teal', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500']
  const total = data?.reduce((s: number, x: any) => s + x.count, 0) || 1

  return (
    <div className="glass-card p-6 space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="space-y-4">
        {data?.map((item: any, i: number) => {
          const val = type === 'gender' ? (item.gender === 'E' ? 'Erkek' : item.gender === 'K' ? 'Kadın' : 'Diğer') :
                      type === 'insurance' ? item.insurance_type :
                      type === 'age' ? item.age_group : item.city
          const pct = (item.count / total) * 100
          return (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300 font-medium">{val}</span>
                <span className="text-gray-500">{pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  className={`h-full ${colors[i % colors.length]}`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between">
        <div className="w-48 h-8 bg-gray-800 rounded-xl" />
        <div className="w-64 h-10 bg-gray-800 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-64 bg-gray-800 rounded-2xl" />
        <div className="h-64 bg-gray-800 rounded-2xl" />
      </div>
    </div>
  )
}
