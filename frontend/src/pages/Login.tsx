import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Hospital, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = { onLogin: (token: string) => void }

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  const API_BASE = (import.meta.env.VITE_API_BASE as string) ?? 'http://127.0.0.1:8005'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => null)
        throw new Error(data?.detail || 'Kullanıcı adı veya şifre hatalı')
      }
      const data = await r.json()
      toast.success('Giriş başarılı, yönlendiriliyorsunuz...')
      onLogin(data.access_token)
    } catch (err: any) {
      toast.error(err.message || 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-medical-blue/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-medical-teal/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-10 relative">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-medical-blue to-medical-teal flex items-center justify-center shadow-xl shadow-medical-blue/20 mb-6">
              <Hospital size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-100 tracking-tight">HIMS PRO</h1>
            <p className="text-gray-500 text-sm mt-1">Hastane Bilgi Yönetim Sistemi</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Kullanıcı Adı</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-secondary border border-transparent rounded-xl focus:border-medical-blue/30 focus:ring-4 focus:ring-medical-blue/5 outline-none transition-all text-sm text-slate-900"
                  placeholder="Kullanıcı adınız"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-secondary border border-transparent rounded-xl focus:border-medical-blue/30 focus:ring-4 focus:ring-medical-blue/5 outline-none transition-all text-sm text-slate-900"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 btn-primary flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-2">Test Giriş Bilgileri</p>
            <div className="flex justify-center gap-4 text-xs">
              <span className="text-gray-400">demo</span>
              <span className="text-gray-700">/</span>
              <span className="text-gray-400">Demo@123456</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
