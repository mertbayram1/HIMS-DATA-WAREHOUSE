import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Receipt, CheckCircle2, Clock, XCircle, TrendingUp, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type Invoice = {
  invoice_key: number; invoice_no: string; invoice_date: string
  gross_amount: number; discount_amount: number; net_amount: number
  paid_amount: number; payment_status: string
  patient_key: number; patient_full_name: string
}

type Props = { apiBase: string; token: string }

const STATUS_META: Record<string, { label: string; color: string }> = {
  PAID:      { label: 'Ödendi',     color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  PENDING:   { label: 'Bekliyor',   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  PARTIAL:   { label: 'Kısmi',      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  CANCELLED: { label: 'İptal',      color: 'text-red-400 bg-red-400/10 border-red-400/20' },
}

function fmt(n: number) { return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺' }

export default function Invoices({ apiBase, token }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('ALL')
  const limit = 30
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    setLoading(true)
    fetch(`${apiBase}/api/invoices?skip=${page * limit}&limit=${limit}`, { headers })
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setInvoices(d.results || []))
      .finally(() => setLoading(false))
  }, [page])

  const filtered = filter === 'ALL' ? invoices : invoices.filter(i => i.payment_status === filter)
  const totalGross = filtered.reduce((s, i) => s + i.gross_amount, 0)
  const totalNet   = filtered.reduce((s, i) => s + i.net_amount, 0)
  const totalPaid  = filtered.reduce((s, i) => s + i.paid_amount, 0)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Faturalar</h2>
          <p className="text-sm text-gray-500 mt-0.5">Ödeme durumlarını takip edin</p>
        </div>
        <div className="flex items-center gap-2 bg-surface border border-white/5 rounded-2xl p-1">
          {['ALL', 'PAID', 'PENDING', 'PARTIAL'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === s ? 'bg-medical-blue text-white shadow-lg shadow-medical-blue/20' : 'text-gray-400 hover:text-gray-200'}`}>
              {s === 'ALL' ? 'Tümü' : STATUS_META[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Toplam Brüt', value: fmt(totalGross), icon: <Receipt size={18} />, color: 'text-medical-blue' },
          { label: 'Toplam Net',  value: fmt(totalNet),   icon: <TrendingUp size={18} />, color: 'text-medical-teal' },
          { label: 'Tahsil Edilen', value: fmt(totalPaid), icon: <CheckCircle2 size={18} />, color: 'text-emerald-400' },
        ].map(c => (
          <div key={c.label} className="glass-card p-5 flex items-center gap-4">
            <div className={`${c.color} bg-white/5 w-10 h-10 rounded-xl flex items-center justify-center`}>{c.icon}</div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{c.label}</p>
              <p className="text-lg font-bold text-gray-100 mt-0.5">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Fatura No', 'Hasta', 'Tarih', 'Brüt', 'İndirim', 'Net', 'Ödenen', 'Durum'].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-gray-500">Fatura bulunamadı</td></tr>
              ) : (
                filtered.map(inv => {
                  const meta = STATUS_META[inv.payment_status] || { label: inv.payment_status, color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' }
                  return (
                    <motion.tr key={inv.invoice_key} whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }} className="group">
                      <td className="px-5 py-4 font-mono text-xs text-gray-400">{inv.invoice_no}</td>
                      <td className="px-5 py-4">
                        <Link to={`/patients/${inv.patient_key}`} className="font-semibold text-gray-200 hover:text-medical-blue transition-colors flex items-center gap-1">
                          {inv.patient_full_name} <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">{new Date(inv.invoice_date).toLocaleDateString('tr-TR')}</td>
                      <td className="px-5 py-4 text-gray-200 font-medium">{fmt(inv.gross_amount)}</td>
                      <td className="px-5 py-4 text-red-400">-{fmt(inv.discount_amount)}</td>
                      <td className="px-5 py-4 text-emerald-400 font-bold">{fmt(inv.net_amount)}</td>
                      <td className="px-5 py-4 text-gray-300">{fmt(inv.paid_amount)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.color}`}>{meta.label}</span>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-t border-white/5">
          <span className="text-xs text-gray-500">{filtered.length} fatura gösteriliyor</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">← Önceki</button>
            <button disabled={invoices.length < limit} onClick={() => setPage(p => p + 1)} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-30">Sonraki →</button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
