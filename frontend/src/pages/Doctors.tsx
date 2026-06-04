import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Mail, Building2 } from 'lucide-react'

type Doctor = {
  doctor_key: number; doctor_full_name: string; title: string
  specialization: string; phone: string | null; email: string | null
  department_name: string
}
type Props = { apiBase: string; token: string }

const TITLE_COLOR: Record<string, string> = {
  'Prof. Dr.': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'Doç. Dr.':  'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'Uzman Dr.': 'text-medical-teal bg-medical-teal/10 border-medical-teal/20',
  'Dr.':       'text-medical-blue bg-medical-blue/10 border-medical-blue/20',
}

export default function Doctors({ apiBase, token }: Props) {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch(`${apiBase}/api/doctors?limit=200`, { headers })
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setDoctors(d.results || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = doctors.filter(d =>
    [d.doctor_full_name, d.department_name, d.specialization]
      .some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Doktorlar</h2>
          <p className="text-sm text-gray-500 mt-0.5">{doctors.length} aktif doktor</p>
        </div>
        <input type="text" placeholder="İsim, bölüm veya uzmanlık ara..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-72 px-4 py-2.5 bg-surface border border-white/5 rounded-2xl text-sm outline-none focus:border-medical-teal/30 transition-all" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [...Array(9)].map((_, i) => (
            <div key={i} className="glass-card p-5 flex gap-4 animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : filtered.map(doc => {
          const initials = doc.doctor_full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')
          const tc = TITLE_COLOR[doc.title] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'
          return (
            <motion.div key={doc.doctor_key} whileHover={{ scale: 1.02 }}
              className="glass-card p-5 flex gap-4 hover:border-medical-blue/30 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-medical-blue/20 to-medical-teal/20 flex items-center justify-center font-bold text-lg text-medical-blue border border-medical-blue/20 shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-100 truncate">{doc.doctor_full_name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${tc}`}>{doc.title}</span>
                </div>
                <p className="text-xs text-medical-teal font-semibold mt-0.5">{doc.specialization}</p>
                <p className="flex items-center gap-1 mt-2 text-xs text-gray-500"><Building2 size={11} />{doc.department_name}</p>
                <div className="mt-2 flex flex-col gap-1">
                  {doc.phone && <a href={`tel:${doc.phone}`} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-medical-teal transition-colors"><Phone size={10} />{doc.phone}</a>}
                  {doc.email && <a href={`mailto:${doc.email}`} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-medical-teal transition-colors truncate"><Mail size={10} />{doc.email}</a>}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
