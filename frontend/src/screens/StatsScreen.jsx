import { useQuery } from '@tanstack/react-query'
import { feedingsApi } from '../api/feedings.js'
import { sleepsApi } from '../api/sleeps.js'
import { diapersApi } from '../api/diapers.js'
import { PageHeader } from '../components/PageHeader.jsx'
import { formatDuration } from '../utils/format.js'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayLabel(ts) {
  return new Date(ts).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })
}

function startOfDay(ts) {
  const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime()
}

// Retorna a porção de [start, end] que cai em horário noturno (< 7h ou >= 19h)
function splitSleepDayNight(startTime, endTime) {
  if (!endTime || endTime <= startTime) return { day: 0, night: 0 }
  const DAY_START = 7   // 7h
  const DAY_END   = 19  // 19h
  let dayMs = 0, nightMs = 0
  let cur = startTime
  while (cur < endTime) {
    const d = new Date(cur)
    const h = d.getHours()
    // próxima fronteira
    let nextBoundary
    if (h < DAY_START) {
      nextBoundary = new Date(d).setHours(DAY_START, 0, 0, 0)
      nightMs += Math.min(endTime, nextBoundary) - cur
    } else if (h < DAY_END) {
      nextBoundary = new Date(d).setHours(DAY_END, 0, 0, 0)
      dayMs += Math.min(endTime, nextBoundary) - cur
    } else {
      const tomorrow = new Date(d); tomorrow.setDate(tomorrow.getDate() + 1)
      nextBoundary = new Date(tomorrow).setHours(DAY_START, 0, 0, 0)
      nightMs += Math.min(endTime, nextBoundary) - cur
    }
    cur = Math.min(endTime, nextBoundary)
  }
  return { day: dayMs / 60000, night: nightMs / 60000 } // em minutos
}

function buildDailyData(feedings, sleeps, diapers) {
  const days = {}
  const addDay = (ts) => {
    const key = startOfDay(ts)
    if (!days[key]) days[key] = { ts: key, label: dayLabel(key), mamadas: 0, fraldas: 0, sonoMin: 0, sonoDia: 0, sonoNoite: 0 }
    return key
  }
  for (const f of feedings) { const k = addDay(f.startTime); days[k].mamadas++ }
  for (const d of diapers)  { const k = addDay(d.time);      days[k].fraldas++ }
  for (const s of sleeps) {
    const k = addDay(s.startTime)
    const dur = Math.round((s.duration || 0) / 60)
    days[k].sonoMin += dur
    const { day, night } = splitSleepDayNight(s.startTime, s.endTime)
    days[k].sonoDia   += Math.round(day)
    days[k].sonoNoite += Math.round(night)
  }
  return Object.values(days).sort((a, b) => a.ts - b.ts).slice(-7)
}

// Intervalo médio em minutos entre mamadas consecutivas
function avgFeedingInterval(feedings) {
  if (feedings.length < 2) return null
  const sorted = [...feedings].sort((a, b) => a.startTime - b.startTime)
  let totalGap = 0, count = 0
  for (let i = 1; i < sorted.length; i++) {
    const gap = (sorted[i].startTime - sorted[i - 1].startTime) / 60000
    if (gap < 600) { totalGap += gap; count++ } // ignora gaps > 10h (provavelmente dia diferente)
  }
  return count > 0 ? Math.round(totalGap / count) : null
}

// Melhor noite: janela 20h → 8h com mais tempo dormido
function bestNight(sleeps) {
  if (!sleeps.length) return null
  const nights = {}
  for (const s of sleeps) {
    if (!s.endTime) continue
    const d = new Date(s.startTime)
    const h = d.getHours()
    // atribuir ao "dia" da noite (se >= 20h, é a noite desse dia; se < 8h, é a noite do dia anterior)
    const nightKey = h >= 20
      ? startOfDay(s.startTime)
      : startOfDay(s.startTime - 24 * 3600 * 1000)
    if (!nights[nightKey]) nights[nightKey] = { ts: nightKey, min: 0 }
    // contar só o trecho noturno (20h–8h)
    const { night } = splitSleepDayNight(s.startTime, s.endTime)
    nights[nightKey].min += night
  }
  const entries = Object.values(nights).filter(n => n.min > 0)
  if (!entries.length) return null
  const best = entries.reduce((a, b) => b.min > a.min ? b : a)
  return { label: dayLabel(best.ts), min: Math.round(best.min) }
}

// Hora de pico de acordar de noite (20h–8h)
function nightWakePeakHour(sleeps) {
  const hist = Array(24).fill(0)
  for (const s of sleeps) {
    if (!s.endTime) continue
    const h = new Date(s.endTime).getHours()
    if (h >= 20 || h < 8) hist[h]++
  }
  const peak = hist.reduce((best, v, i) => v > best.v ? { h: i, v } : best, { h: -1, v: 0 })
  if (peak.v === 0) return null
  return peak.h
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}{unit || (p.name.toLowerCase().includes('sono') ? 'min' : '')}</strong>
        </p>
      ))}
    </div>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function StatsScreen() {
  const { data: feedings = [] } = useQuery({ queryKey: ['feedings', 'week'], queryFn: feedingsApi.getWeek })
  const { data: sleeps = [] }   = useQuery({ queryKey: ['sleeps', 'week'],   queryFn: sleepsApi.getWeek })
  const { data: diapers = [] }  = useQuery({ queryKey: ['diapers', 'today'], queryFn: diapersApi.getToday })
  const { data: allDiapers = [] } = useQuery({ queryKey: ['diapers', 'all'], queryFn: diapersApi.getAll })

  const daily = buildDailyData(feedings, sleeps, allDiapers)

  const avgFeedings = daily.length ? (daily.reduce((a, d) => a + d.mamadas, 0) / daily.length).toFixed(1) : 0
  const avgSleep = daily.length ? Math.round(daily.reduce((a, d) => a + d.sonoMin, 0) / daily.length) : 0
  const totalSleepWeek = sleeps.reduce((acc, s) => acc + (s.duration || 0), 0)

  const intervalMin = avgFeedingInterval(feedings)
  const best = bestNight(sleeps)
  const peakHour = nightWakePeakHour(sleeps)

  const breastCount = { E: 0, D: 0, A: 0 }
  for (const f of feedings) breastCount[f.breast] = (breastCount[f.breast] || 0) + 1
  const breastData = [
    { name: 'Esquerdo', value: breastCount.E, color: '#EC4899' },
    { name: 'Direito',  value: breastCount.D, color: '#F9A8D4' },
    { name: 'Ambos',    value: breastCount.A, color: '#FBCFE8' },
  ].filter(b => b.value > 0)

  return (
    <div className="px-4 pb-4 overflow-y-auto h-full">
      <PageHeader emoji="📊" title="Estatísticas" subtitle="Últimos 7 dias" />

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {[
          { label: 'Média mamadas/dia', value: avgFeedings,               color: 'text-pink-500',   bg: 'bg-pink-50',   emoji: '🤱' },
          { label: 'Sono médio/dia',    value: `${avgSleep}min`,          color: 'text-sky-500',    bg: 'bg-sky-50',    emoji: '😴' },
          { label: 'Sono total 7d',     value: formatDuration(totalSleepWeek), color: 'text-violet-600', bg: 'bg-violet-50', emoji: '🌙' },
          { label: 'Fraldas hoje',      value: diapers.length,            color: 'text-amber-500',  bg: 'bg-amber-50',  emoji: '👶' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center text-base`}>{k.emoji}</div>
              <span className="text-xs text-gray-400 font-medium leading-tight">{k.label}</span>
            </div>
            <p className={`text-xl font-extrabold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Insights automáticos */}
      {(intervalMin || best || peakHour !== null) && (
        <div className="mb-5 flex flex-col gap-2.5">
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Insights da semana</p>

          {intervalMin && (
            <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">⏱️</span>
              <div>
                <p className="text-sm font-bold text-pink-700 dark:text-pink-400">
                  {intervalMin >= 60
                    ? `${Math.floor(intervalMin / 60)}h${intervalMin % 60 > 0 ? ` ${intervalMin % 60}min` : ''}`
                    : `${intervalMin}min`} entre mamadas
                </p>
                <p className="text-xs text-pink-500 dark:text-pink-600">intervalo médio da semana</p>
              </div>
            </div>
          )}

          {best && (
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-sm font-bold text-violet-700 dark:text-violet-400">
                  Melhor noite: {best.label}
                </p>
                <p className="text-xs text-violet-500 dark:text-violet-600">
                  {best.min >= 60
                    ? `${Math.floor(best.min / 60)}h${best.min % 60 > 0 ? ` ${best.min % 60}min` : ''}`
                    : `${best.min}min`} dormindo de noite
                </p>
              </div>
            </div>
          )}

          {peakHour !== null && (
            <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🌙</span>
              <div>
                <p className="text-sm font-bold text-sky-700 dark:text-sky-400">
                  Acorda mais às {peakHour}h
                </p>
                <p className="text-xs text-sky-500 dark:text-sky-600">horário noturno mais frequente</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gráfico mamadas + fraldas */}
      {daily.length > 0 && (
        <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm mb-4 transition-colors">
          <p className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-4">Mamadas e fraldas por dia</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={daily} barCategoryGap="30%">
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="mamadas" name="Mamadas" fill="#EC4899" radius={[6, 6, 0, 0]} />
              <Bar dataKey="fraldas" name="Fraldas" fill="#F59E0B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico sono dia vs. noite */}
      {daily.length > 0 && (
        <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm mb-4 transition-colors">
          <p className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-1">Sono dia vs. noite (min)</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Dia: 7h–19h · Noite: 19h–7h</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={daily} barCategoryGap="25%">
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip unit="min" />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="sonoDia"   name="Dia"   stackId="s" fill="#FCD34D" radius={[0, 0, 0, 0]} />
              <Bar dataKey="sonoNoite" name="Noite" stackId="s" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico sono total */}
      {daily.length > 0 && (
        <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm mb-4 transition-colors">
          <p className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-4">Sono total por dia (min)</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="sonoMin" name="Sono" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Peito preferido */}
      {breastData.length > 0 && (
        <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm mb-4 transition-colors">
          <p className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-3">Peito por semana</p>
          <div className="flex flex-col gap-2">
            {breastData.map(b => {
              const total = breastData.reduce((a, x) => a + x.value, 0)
              const pct = Math.round((b.value / total) * 100)
              return (
                <div key={b.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-600 dark:text-slate-400">{b.name}</span>
                    <span className="font-bold" style={{ color: b.color }}>{b.value}x ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: b.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
