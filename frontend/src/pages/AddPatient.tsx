import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UserPlus, Shield, User, Calendar, 
  MapPin, Droplet, Phone, CheckCircle2, 
  AlertCircle, Loader2, CreditCard
} from 'lucide-react'

type Props = { apiBase: string; token: string; onSuccess?: () => void }

export default function AddPatient({ apiBase, token, onSuccess }: Props) {
  const [form, setForm] = useState({
    patient_national_id: '', patient_full_name: '', gender: 'E',
    birth_date: '', insurance_type: 'SGK', city: '', blood_type: '', phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setMessage(null)
    try {
      const r = await fetch(`${apiBase}/api/patients`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Hasta eklenemedi')
      const result = await r.json()
      setMessage({ type: 'success', text: `${result.patient.patient_full_name} başarıyla eklendi!` })
      setForm({ patient_national_id: '', patient_full_name: '', gender: 'E', birth_date: '', insurance_type: 'SGK', city: '', blood_type: '', phone: '' })
      if (onSuccess) setTimeout(onSuccess, 1500)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Bir hata oluştu' })
    } finally { setLoading(false) }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl"
    >
      <div className="glass-card p-10">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-medical-blue/10 flex items-center justify-center text-medical-blue border border-medical-blue/20">
            <UserPlus size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-100 tracking-tight">Yeni Hasta Kayıt</h3>
            <p className="text-gray-500 text-sm">Hasta bilgilerini sisteme entegre edin</p>
          </div>
        </div>

        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`p-4 rounded-xl mb-8 flex items-center gap-3 text-sm font-medium border ${
                message.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : 'bg-medical-red/10 text-medical-red border-medical-red/20'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <Field 
              label="TC Kimlik No" 
              name="patient_national_id" 
              value={form.patient_national_id} 
              onChange={handleChange} 
              placeholder="11 haneli TC no" 
              icon={<Shield size={16} />} 
              required 
            />
            <Field 
              label="Ad Soyad" 
              name="patient_full_name" 
              value={form.patient_full_name} 
              onChange={handleChange} 
              placeholder="Tam isim" 
              icon={<User size={16} />} 
              required 
            />
            <Field 
              label="Doğum Tarihi" 
              name="birth_date" 
              value={form.birth_date} 
              onChange={handleChange} 
              type="date" 
              icon={<Calendar size={16} />} 
              required 
            />
            <SelectField 
              label="Cinsiyet" 
              name="gender" 
              value={form.gender} 
              onChange={handleChange} 
              options={[['E','Erkek'],['K','Kadın'],['D','Diğer']]} 
              icon={<User size={16} />} 
            />
            <SelectField 
              label="Sigorta Türü" 
              name="insurance_type" 
              value={form.insurance_type} 
              onChange={handleChange} 
              options={[['SGK','SGK'],['Özel','Özel'],['Private','Private'],['SelfPay','Kendine Ait'],['Other','Diğer']]} 
              icon={<CreditCard size={16} />} 
            />
            <Field 
              label="Şehir" 
              name="city" 
              value={form.city} 
              onChange={handleChange} 
              placeholder="İkamet şehri" 
              icon={<MapPin size={16} />} 
              required 
            />
            <SelectField 
              label="Kan Grubu" 
              name="blood_type" 
              value={form.blood_type} 
              onChange={handleChange} 
              options={[['','Seçiniz'],['A+','A+'],['A-','A-'],['B+','B+'],['B-','B-'],['AB+','AB+'],['AB-','AB-'],['O+','O+'],['O-','O-']]} 
              icon={<Droplet size={16} />} 
            />
            <Field 
              label="Telefon" 
              name="phone" 
              value={form.phone} 
              onChange={handleChange} 
              placeholder="+90" 
              icon={<Phone size={16} />} 
            />
          </div>

          <div className="pt-6 border-t border-white/5 flex justify-end">
            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary flex items-center gap-2 px-10 py-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <UserPlus size={20} />
                  <span>Kaydı Tamamla</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}

function Field({ label, name, value, onChange, placeholder, type, icon, required }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.1em] px-1">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">{icon}</span>
        <input 
          name={name} 
          value={value} 
          onChange={onChange} 
          type={type||'text'} 
          placeholder={placeholder} 
          required={required} 
          className="w-full pl-12 pr-4 py-3 bg-secondary border border-transparent rounded-xl focus:border-medical-blue/30 focus:ring-4 focus:ring-medical-blue/5 outline-none text-sm transition-all text-gray-200" 
        />
      </div>
    </div>
  )
}

function SelectField({ label, name, value, onChange, options, icon }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.1em] px-1">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">{icon}</span>
        <select 
          name={name} 
          value={value} 
          onChange={onChange} 
          className="w-full pl-12 pr-4 py-3 bg-secondary border border-transparent rounded-xl focus:border-medical-blue/30 focus:ring-4 focus:ring-medical-blue/5 outline-none text-sm transition-all text-gray-200 appearance-none cursor-pointer"
        >
          {options.map(([v, l]: [string, string]) => <option key={v} value={v} className="bg-surface">{l}</option>)}
        </select>
      </div>
    </div>
  )
}
