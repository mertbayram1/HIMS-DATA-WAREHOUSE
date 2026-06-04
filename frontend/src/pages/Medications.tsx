import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Pill, AlertTriangle, Package, TrendingDown } from 'lucide-react'

type Med = {
  medication_key: number; medication_code: string; medication_name: string
  current_stock: number; critical_stock_level: number
  unit_price: number; is_active: number; is_critical: number
}
type Props = { apiBase: string; token: string }

export default function Medications({ apiBase, token }: Props) {
  const [meds, setMeds] = useState<Med[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL'>('ALL')
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch(`${apiBase}/api/reports/medication-usage?limit=100`, { headers })
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setMeds(d.results || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'CRITICAL' ? meds.filter(m => m.is_critical) : meds
  const criticalCount = meds.filter(m => m.is_critical).length

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">İlaç & Stok Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">{meds.length} ilaç kaydı</p>
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-400/10 border border-red-400/20 rounded-2xl">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-xs font-bold text-red-400">{criticalCount} kritik stok uyarısı</span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-surface border border-white/5 rounded-2xl p-1">
            {(['ALL', 'CRITICAL'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-medical-blue text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                {f === 'ALL' ? 'Tümü' : '⚠ Kritik'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['İlaç Adı', 'Kod', 'Birim Fiyat', 'Mevcut Stok', 'Kritik Seviye', 'Stok Durumu'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : filtered.map(med => {
                const ratio = med.current_stock / Math.max(med.critical_stock_level, 1)
                const barColor = med.is_critical ? 'bg-red-400' : ratio > 5 ? 'bg-emerald-400' : 'bg-amber-400'
                const barWidth = Math.min(100, (med.current_stock / Math.max(med.critical_stock_level * 3, 1)) * 100)
                return (
                  <motion.tr key={med.medication_key} whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Pill size={14} className={med.is_critical ? 'text-red-400' : 'text-medical-teal'} />
                        <span className="font-semibold text-gray-200">{med.medication_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{med.medication_code}</td>
                    <td className="px-6 py-4 text-gray-300">{med.unit_price.toFixed(2)} ₺</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${med.is_critical ? 'text-red-400' : 'text-gray-200'}`}>{med.current_stock}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{med.critical_stock_level}</td>
                    <td className="px-6 py-4 w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${barWidth}%` }} />
                        </div>
                        {med.is_critical === 1 && <AlertTriangle size={12} className="text-red-400 shrink-0" />}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
