import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Stethoscope, Pill, Wallet, User, 
  MapPin, Shield, Droplet, Phone, Info,
  CheckCircle2, Clock, AlertCircle, XCircle, ChevronRight
} from 'lucide-react'

type Patient = {
  patient_key: number; patient_full_name: string; patient_national_id: string
  gender: string; birth_date: string; city: string; phone?: string
  blood_type?: string; insurance_type: string; created_at?: string
}
type Appointment = {
  appointment_key: number; appointment_no: string; appointment_datetime: string
  appointment_status: string; wait_minutes?: number
  doctor_full_name: string; title: string; specialization: string; department_name: string
}
type Consultation = {
  consultation_key: number; consultation_datetime: string; diagnosis_code?: string
  diagnosis_text?: string; consultation_minutes: number; follow_up_required?: number
  doctor_full_name: string; title: string; specialization: string; department_name: string
}
type Invoice = {
  invoice_key: number; invoice_no: string; invoice_date: string
  gross_amount: number; discount_amount: number; net_amount: number
  paid_amount: number; payment_status: string
}
type Prescription = {
  prescription_detail_key: number; consultation_key: number; quantity: number
  unit_price: number; total_amount: number; usage_instructions?: string
  medication_name: string; medication_code: string
}

type Props = { apiBase: string; token: string; patientKey: number }

export default function PatientDetail({ apiBase, token, patientKey }: Props) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'appointments' | 'consultations' | 'invoices' | 'prescriptions'>('appointments')

  useEffect(() => {
    fetch(`${apiBase}/api/patients/${patientKey}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
      .then(r => { if (!r.ok) throw new Error('Yüklenemedi'); return r.json() })
      .then(data => {
        setPatient(data.patient)
        setAppointments(data.appointments || [])
        setConsultations(data.consultations || [])
        setInvoices(data.invoices || [])
        setPrescriptions(data.prescriptions || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [apiBase, token, patientKey])

  if (loading) return <LoadingSkeleton />
  if (error) return <div className="p-8 glass-card text-center text-medical-red">{error}</div>
  if (!patient) return <div className="p-8 glass-card text-center text-gray-500">Veri bulunamadı</div>

  const p = patient
  const age = Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (365.25 * 86400000))
  const genderLabel = (p.gender === 'E' || p.gender === 'M') ? 'Erkek' : 'Kadın'
  const totalInvoice = invoices.reduce((s, i) => s + (i.net_amount || 0), 0)

  const statusBadge = (s: string) => {
    const styles: any = {
      'TAMAMLANDI': 'bg-emerald-500/10 text-emerald-500',
      'PLANLI': 'bg-medical-blue/10 text-medical-blue',
      'İPTAL': 'bg-amber-500/10 text-amber-500',
      'GELMEDİ': 'bg-medical-red/10 text-medical-red',
      'PAID': 'bg-emerald-500/10 text-emerald-500',
      'PENDING': 'bg-amber-500/10 text-amber-500',
      'PARTIAL': 'bg-medical-blue/10 text-medical-blue',
    }
    return (
      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${styles[s] || 'bg-white/5 text-gray-400'}`}>
        {s}
      </span>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header Profile Card */}
      <div className="glass-card p-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-2xl ${
            p.gender === 'E' ? 'bg-gradient-to-br from-medical-blue to-medical-teal' : 'bg-gradient-to-br from-medical-red to-rose-400'
          }`}>
            {p.patient_full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-gray-100 tracking-tight">{p.patient_full_name}</h2>
              <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-gray-500 uppercase border border-white/5 tracking-widest">
                ID: {p.patient_key}
              </span>
            </div>
            <p className="text-gray-500 font-medium flex items-center gap-2">
              <Shield size={16} /> TC Kimlik No: {p.patient_national_id}
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
              <InfoItem icon={<User size={14} />} label="Yaş" value={`${age} Yaş`} />
              <InfoItem icon={<Info size={14} />} label="Cinsiyet" value={genderLabel} />
              <InfoItem icon={<MapPin size={14} />} label="Şehir" value={p.city} />
              <InfoItem icon={<Shield size={14} />} label="Sigorta" value={p.insurance_type} />
              <InfoItem icon={<Droplet size={14} />} label="Kan Grubu" value={p.blood_type || '-'} />
              <InfoItem icon={<Phone size={14} />} label="Telefon" value={p.phone || '-'} />
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-3 w-full lg:w-48">
            <QuickStat label="Toplam Fatura" value={`₺${totalInvoice.toLocaleString('tr-TR')}`} icon={<Wallet className="text-emerald-500" />} />
            <QuickStat label="Randevu Sayısı" value={appointments.length} icon={<Calendar className="text-medical-blue" />} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1 bg-secondary rounded-2xl border border-white/5 w-fit">
        {[
          { id: 'appointments', label: 'Randevular', icon: <Calendar size={16} />, count: appointments.length },
          { id: 'consultations', label: 'Muayeneler', icon: <Stethoscope size={16} />, count: consultations.length },
          { id: 'prescriptions', label: 'Reçeteler', icon: <Pill size={16} />, count: prescriptions.length },
          { id: 'invoices', label: 'Faturalar', icon: <Wallet size={16} />, count: invoices.length }
        ].map((t: any) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              tab === t.id ? 'bg-medical-blue text-white shadow-lg' : 'text-gray-500 hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-white/5'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="glass-card overflow-hidden"
        >
          {tab === 'appointments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.1em]">
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4">Doktor & Uzmanlık</th>
                    <th className="px-6 py-4">Bölüm</th>
                    <th className="px-6 py-4 text-center">Bekleme</th>
                    <th className="px-6 py-4 text-right">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {appointments.map(a => (
                    <tr key={a.appointment_key} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-300">{a.appointment_datetime}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-200">{a.doctor_full_name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{a.title} · {a.specialization}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{a.department_name}</td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-medical-teal">{a.wait_minutes ? `${a.wait_minutes} dk` : '-'}</td>
                      <td className="px-6 py-4 text-right">{statusBadge(a.appointment_status)}</td>
                    </tr>
                  ))}
                  {appointments.length === 0 && <EmptyRow colSpan={5} text="Randevu kaydı bulunmuyor." />}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'consultations' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.1em]">
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4">Doktor & Bölüm</th>
                    <th className="px-6 py-4">Tanı & Açıklama</th>
                    <th className="px-6 py-4 text-center">Süre</th>
                    <th className="px-6 py-4 text-right">Takip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {consultations.map(c => (
                    <tr key={c.consultation_key} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-300">{c.consultation_datetime}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-200">{c.doctor_full_name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{c.department_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {c.diagnosis_code && <span className="bg-medical-blue/10 text-medical-blue px-2 py-0.5 rounded text-[10px] font-bold">{c.diagnosis_code}</span>}
                          <p className="text-sm text-gray-400">{c.diagnosis_text || '-'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-400 font-medium">{c.consultation_minutes} dk</td>
                      <td className="px-6 py-4 text-right">
                        {c.follow_up_required ? (
                          <span className="text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-[10px] font-bold uppercase">Gerekli</span>
                        ) : (
                          <span className="text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase">Yok</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {consultations.length === 0 && <EmptyRow colSpan={5} text="Muayene kaydı bulunmuyor." />}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'prescriptions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.1em]">
                    <th className="px-6 py-4">İlaç Adı</th>
                    <th className="px-6 py-4">Kod</th>
                    <th className="px-6 py-4 text-center">Adet</th>
                    <th className="px-6 py-4 text-right">Birim Fiyat</th>
                    <th className="px-6 py-4 text-right">Toplam</th>
                    <th className="px-6 py-4">Kullanım Talimatı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {prescriptions.map(pr => (
                    <tr key={pr.prescription_detail_key} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-200">{pr.medication_name}</td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">{pr.medication_code}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-300">{pr.quantity}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">₺{pr.unit_price?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-medical-teal">₺{pr.total_amount?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-xs text-gray-500 italic max-w-xs truncate">{pr.usage_instructions || '-'}</td>
                    </tr>
                  ))}
                  {prescriptions.length === 0 && <EmptyRow colSpan={6} text="Reçete kaydı bulunmuyor." />}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'invoices' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.1em]">
                    <th className="px-6 py-4">Fatura No</th>
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4 text-right">Brüt</th>
                    <th className="px-6 py-4 text-right">İndirim</th>
                    <th className="px-6 py-4 text-right font-bold">Net Tutar</th>
                    <th className="px-6 py-4 text-right">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map(inv => (
                    <tr key={inv.invoice_key} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-medical-teal">{inv.invoice_no}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{inv.invoice_date}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">₺{inv.gross_amount?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-sm text-amber-500">₺{inv.discount_amount?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-sm font-black text-gray-100">₺{inv.net_amount?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">{statusBadge(inv.payment_status)}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && <EmptyRow colSpan={6} text="Fatura kaydı bulunmuyor." />}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

function InfoItem({ icon, label, value }: any) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">{icon} {label}</p>
      <p className="text-sm font-medium text-gray-300">{value}</p>
    </div>
  )
}

function QuickStat({ label, value, icon }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 flex-1">
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-black text-gray-100">{value}</p>
      </div>
      <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
    </div>
  )
}

function EmptyRow({ colSpan, text }: any) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 mb-2 shadow-inner border border-white/5">
            <AlertCircle size={24} />
          </div>
          <p className="text-gray-400 font-medium">{text}</p>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Kayıt Bulunamadı</p>
        </motion.div>
      </td>
    </tr>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-48 bg-surface rounded-3xl" />
      <div className="h-12 w-96 bg-surface rounded-2xl" />
      <div className="h-96 bg-surface rounded-3xl" />
    </div>
  )
}
