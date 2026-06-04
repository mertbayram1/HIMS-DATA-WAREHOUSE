import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { TrendingUp, Users, Wallet, Stethoscope } from 'lucide-react'

type Props = { apiBase: string; token: string }

const COLORS = ['#0ea5e9', '#14b8a6', '#a855f7', '#f59e0b', '#ef4444', '#22c55e', '#f97316', '#06b6d4']

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-medical-teal">{icon}</span>
      <h3 className="text-base font-bold text-gray-200">{title}</h3>
    </div>
  )
}

export default function Reports({ apiBase, token }: Props) {
  const [depts, setDepts] = useState<any[]>([])
  const [demos, setDemos] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [topDocs, setTopDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/api/reports/department-occupancy`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${apiBase}/api/reports/patient-demographics`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${apiBase}/api/reports/invoice-summary`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${apiBase}/api/reports/top-doctors?limit=8`, { headers }).then(r => r.ok ? r.json() : null),
    ]).then(([d, dem, inv, td]) => {
      if (d) setDepts(d.results || [])
      if (dem) setDemos(dem)
      if (inv) setInvoices((inv.results || []).slice(0, 6).reverse())
      if (td) setTopDocs(td.results || [])
    }).finally(() => setLoading(false))
  }, [])

  const tooltipStyle = {
    contentStyle: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    itemStyle: { color: '#0ea5e9' }, labelStyle: { color: '#0f172a' },
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100">Raporlar & Analizler</h2>
        <p className="text-sm text-gray-500 mt-0.5">Sistem geneli istatistikler ve görselleştirmeler</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-72 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Department Occupancy */}
          <div className="glass-card p-6">
            <SectionTitle icon={<Stethoscope size={18} />} title="Departman Yoğunluğu (Randevu Sayısı)" />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={depts.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="department_name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} width={130} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} randevu`, '']} />
                <Bar dataKey="total_appointments_90d" radius={[0, 8, 8, 0]} barSize={20}>
                  {depts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Insurance Distribution */}
          <div className="glass-card p-6">
            <SectionTitle icon={<Users size={18} />} title="Sigorta & Cinsiyet Dağılımı" />
            <div className="grid grid-cols-2 gap-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={demos?.insurance || []} dataKey="count" nameKey="insurance_type" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {(demos?.insurance || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={(demos?.gender || []).map((g: any) => ({ ...g, name: g.gender === 'E' ? 'Erkek' : g.gender === 'K' ? 'Kadın' : 'Diğer' }))} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {(demos?.gender || []).map((_: any, i: number) => <Cell key={i} fill={['#0ea5e9', '#f472b6', '#a78bfa'][i % 3]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="glass-card p-6">
            <SectionTitle icon={<Wallet size={18} />} title="Aylık Gelir Özeti (₺)" />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={invoices} margin={{ left: 0, right: 10 }}>
                <XAxis dataKey="invoice_month" tickFormatter={(v, i) => { const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']; return months[(v-1)] || v }} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [`${Number(v).toLocaleString('tr-TR')} ₺`, '']} />
                <Bar dataKey="net_total" name="Net Gelir" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="paid_total" name="Tahsil" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Doctors */}
          <div className="glass-card p-6">
            <SectionTitle icon={<TrendingUp size={18} />} title="En Yoğun Doktorlar" />
            <div className="space-y-3 mt-2">
              {topDocs.slice(0, 6).map((doc, i) => (
                <div key={doc.doctor_key} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-semibold text-gray-300 truncate">{doc.doctor_full_name}</p>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">{doc.appointment_count} randevu</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(doc.appointment_count / (topDocs[0]?.appointment_count || 1)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Age Distribution */}
          {demos?.age_groups && (
            <div className="glass-card p-6 lg:col-span-2">
              <SectionTitle icon={<Users size={18} />} title="Yaş Grubu Dağılımı" />
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={demos.age_groups} margin={{ left: 0, right: 10 }}>
                  <XAxis dataKey="age_group" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} hasta`, '']} />
                  <Bar dataKey="count" name="Hasta" radius={[8, 8, 0, 0]}>
                    {demos.age_groups.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
