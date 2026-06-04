import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, CheckCircle2, Clock, XCircle, UserRound, ChevronRight, Plus, Search, X, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

type Appointment = {
  appointment_key: number; appointment_no: string; appointment_datetime: string
  appointment_status: string; wait_minutes: number | null
  patient_key: number; patient_full_name: string
  doctor_key: number; doctor_full_name: string; specialization: string
  department_name: string
}

type Props = { apiBase: string; token: string }

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  TAMAMLANDI: { label: 'Tamamlandı', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: <CheckCircle2 size={12} /> },
  PLANLI:     { label: 'Planlandı',  color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',       icon: <Clock size={12} /> },
  İPTAL:      { label: 'İptal',      color: 'text-red-400 bg-red-400/10 border-red-400/20',           icon: <XCircle size={12} /> },
  GELMEDİ:   { label: 'Gelmedi',    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',     icon: <UserRound size={12} /> },
}

export default function Appointments({ apiBase, token }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('ALL')
  const limit = 30
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  // Modal and Form States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
  const [selectedDoctorKey, setSelectedDoctorKey] = useState('')
  const [appointmentDatetime, setAppointmentDatetime] = useState('')
  const [waitMinutes, setWaitMinutes] = useState('')
  const [appointmentStatus, setAppointmentStatus] = useState('PLANLI')
  const [submitting, setSubmitting] = useState(false)
  const [searchingPatients, setSearchingPatients] = useState(false)

  // Fetch Appointments
  useEffect(() => {
    setLoading(true)
    fetch(`${apiBase}/api/appointments?skip=${page * limit}&limit=${limit}`, { headers })
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setAppointments(d.results || []))
      .finally(() => setLoading(false))
  }, [page])

  // Fetch Doctors when Modal Opens
  useEffect(() => {
    if (!isModalOpen) return
    fetch(`${apiBase}/api/doctors?limit=200`, { headers })
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setDoctors(d.results || []))
  }, [isModalOpen])

  // Search Patients in Modal Form
  useEffect(() => {
    if (!patientSearch || patientSearch.trim().length < 2) {
      setPatientResults([])
      return
    }
    const timer = setTimeout(() => {
      setSearchingPatients(true)
      fetch(`${apiBase}/api/patients/search?q=${encodeURIComponent(patientSearch.trim())}&limit=10`, { headers })
        .then(r => r.ok ? r.json() : { results: [] })
        .then(d => setPatientResults(d.results || []))
        .finally(() => setSearchingPatients(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch])

  // Create Appointment Submission
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) {
      toast.error('Lütfen bir hasta seçiniz.')
      return
    }
    if (!selectedDoctorKey) {
      toast.error('Lütfen bir doktor seçiniz.')
      return
    }
    if (!appointmentDatetime) {
      toast.error('Lütfen randevu tarihi ve saati seçiniz.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${apiBase}/api/appointments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          patient_key: selectedPatient.patient_key,
          doctor_key: parseInt(selectedDoctorKey, 10),
          appointment_datetime: appointmentDatetime.replace('T', ' ') + ':00',
          wait_minutes: waitMinutes ? parseInt(waitMinutes, 10) : null,
          appointment_status: appointmentStatus
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || 'Randevu oluşturulamadı.')
      }

      const data = await response.json()
      toast.success('Randevu başarıyla oluşturuldu!')
      setAppointments(prev => [data.appointment, ...prev])
      setIsModalOpen(false)
      
      // Reset form fields
      setSelectedPatient(null)
      setPatientSearch('')
      setSelectedDoctorKey('')
      setAppointmentDatetime('')
      setWaitMinutes('')
      setAppointmentStatus('PLANLI')
    } catch (err: any) {
      toast.error(err.message || 'Bir hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = filter === 'ALL' ? appointments : appointments.filter(a => a.appointment_status === filter)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Randevular</h2>
          <p className="text-sm text-gray-500 mt-0.5">Tüm hasta randevularını yönetin ve yenilerini oluşturun</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface border border-white/5 rounded-2xl p-1">
            {['ALL', 'PLANLI', 'TAMAMLANDI', 'İPTAL', 'GELMEDİ'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === s ? 'bg-medical-blue text-white shadow-lg shadow-medical-blue/20' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {s === 'ALL' ? 'Tümü' : STATUS_META[s]?.label}
              </button>
            ))}
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Yeni Randevu
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Randevu No', 'Hasta', 'Doktor / Bölüm', 'Tarih & Saat', 'Bekleme', 'Durum'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-500">Randevu bulunamadı</td></tr>
              ) : (
                filtered.map(a => {
                  const meta = STATUS_META[a.appointment_status] || { label: a.appointment_status, color: 'text-gray-400 bg-gray-400/10 border-gray-400/20', icon: null }
                  const dt = new Date(a.appointment_datetime)
                  return (
                    <motion.tr key={a.appointment_key} whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }} className="group transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">{a.appointment_no}</td>
                      <td className="px-6 py-4">
                        <Link to={`/patients/${a.patient_key}`} className="font-semibold text-gray-200 hover:text-medical-blue transition-colors flex items-center gap-1">
                          {a.patient_full_name} <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-200 font-medium">{a.doctor_full_name}</p>
                        <p className="text-xs text-gray-500">{a.department_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-200">{dt.toLocaleDateString('tr-TR')}</p>
                        <p className="text-xs text-gray-500">{dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {a.wait_minutes != null ? `${a.wait_minutes} dk` : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-t border-white/5">
          <span className="text-xs text-gray-500">{filtered.length} randevu gösteriliyor</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">← Önceki</button>
            <button disabled={appointments.length < limit} onClick={() => setPage(p => p + 1)} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-30">Sonraki →</button>
          </div>
        </div>
      </div>

      {/* Modal for Creating New Appointment */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative flex flex-col max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-gray-100">Yeni Randevu Kaydı</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-100 transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              {/* Patient Search */}
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Hasta Seçimi</label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-xl border border-medical-teal/30">
                    <div>
                      <p className="font-semibold text-gray-100 text-sm">{selectedPatient.patient_full_name}</p>
                      <p className="text-xs text-gray-500">TC: {selectedPatient.patient_national_id}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedPatient(null); setPatientSearch(''); }} className="text-xs font-bold text-medical-red hover:underline uppercase px-2 py-1">
                      Değiştir
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="text"
                      placeholder="Hasta adı veya TC no ile ara..."
                      value={patientSearch}
                      onChange={e => setPatientSearch(e.target.value)}
                      className="input-field pl-10"
                      required
                    />
                    {searchingPatients && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-medical-teal/20 border-t-medical-teal rounded-full animate-spin" />
                    )}

                    {patientResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-gray-800 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                        {patientResults.map(p => (
                          <button
                            key={p.patient_key}
                            type="button"
                            onClick={() => { setSelectedPatient(p); setPatientResults([]); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-secondary transition-colors text-sm border-b border-gray-800/30 last:border-0"
                          >
                            <p className="font-semibold text-gray-100">{p.patient_full_name}</p>
                            <p className="text-xs text-gray-500">TC: {p.patient_national_id} | Şehir: {p.city}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Doktor Seçimi</label>
                <select
                  value={selectedDoctorKey}
                  onChange={e => setSelectedDoctorKey(e.target.value)}
                  className="input-field text-sm"
                  required
                >
                  <option value="" disabled>Doktor seçiniz...</option>
                  {doctors.map(d => (
                    <option key={d.doctor_key} value={d.doctor_key}>
                      {d.doctor_full_name} ({d.specialization} - {d.department_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Datetime Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Randevu Tarih ve Saati</label>
                <input
                  type="datetime-local"
                  value={appointmentDatetime}
                  onChange={e => setAppointmentDatetime(e.target.value)}
                  className="input-field text-sm"
                  required
                />
              </div>

              {/* Wait Minutes (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Bekleme Süresi (Dakika - İsteğe Bağlı)</label>
                <input
                  type="number"
                  min="0"
                  max="240"
                  placeholder="Dakika cinsinden beklenen bekleme süresi..."
                  value={waitMinutes}
                  onChange={e => setWaitMinutes(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              {/* Appointment Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Başlangıç Durumu</label>
                <select
                  value={appointmentStatus}
                  onChange={e => setAppointmentStatus(e.target.value)}
                  className="input-field text-sm"
                  required
                >
                  <option value="PLANLI">Planlandı</option>
                  <option value="TAMAMLANDI">Tamamlandı</option>
                  <option value="İPTAL">İptal</option>
                  <option value="GELMEDİ">Gelmedi</option>
                </select>
              </div>

              {/* Form Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary flex-1 py-3 text-xs uppercase font-bold tracking-wider"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 py-3 text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : null}
                  {submitting ? 'Kaydediliyor' : 'Randevu Oluştur'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
