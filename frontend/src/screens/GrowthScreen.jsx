import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { measurementsApi } from '../api/measurements.js'

const BIRTH_QUERY_KEY = ['config', 'birth_date']
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts'

// ─── WHO growth reference data — Girls, 0–24 months ──────────────────────────
// [month, P3, P50, P97]
const WHO_WEIGHT = [
  [0,2.4,3.2,4.2],[1,3.2,4.2,5.5],[2,4.0,5.1,6.6],[3,4.6,5.8,7.5],
  [4,5.1,6.4,8.2],[5,5.5,6.9,8.8],[6,5.7,7.3,9.3],[7,6.0,7.6,9.8],
  [8,6.3,7.9,10.2],[9,6.5,8.2,10.5],[10,6.7,8.5,10.9],[11,6.9,8.7,11.2],
  [12,7.0,8.9,11.5],[15,7.6,9.6,12.5],[18,8.1,10.2,13.3],
  [21,8.6,10.9,14.3],[24,9.0,11.5,15.1],
]
const WHO_HEIGHT = [
  [0,45.6,49.1,52.7],[1,49.8,53.7,57.4],[2,53.0,57.1,61.1],[3,55.6,59.8,63.9],
  [4,57.8,62.1,66.3],[5,59.6,64.0,68.3],[6,61.2,65.7,70.2],[7,62.7,67.3,71.8],
  [8,64.0,68.7,73.4],[9,65.3,70.1,74.9],[10,66.5,71.5,76.4],[11,67.7,72.8,77.8],
  [12,68.9,74.0,79.2],[15,72.0,77.5,83.2],[18,74.9,80.7,86.8],
  [21,77.5,83.7,90.1],[24,80.0,86.4,93.1],
]

function ageInMonths(birthDateStr, measureDateMs) {
  if (!birthDateStr) return null
  const birth = new Date(birthDateStr + 'T12:00:00')
  const diffMs = measureDateMs - birth.getTime()
  const months = diffMs / (1000 * 60 * 60 * 24 * 30.4375)
  return Math.max(0, Math.round(months * 10) / 10)
}

// ─── Interpreta o crescimento em linguagem simples ────────────────────────────
function interpretGrowth(whoTable, measurements, birthDateStr, field, unit) {
  if (!birthDateStr || !measurements.length) return null
  const latest = measurements.filter(m => m[field] != null).sort((a, b) => b.date - a.date)[0]
  if (!latest) return null
  const age = ageInMonths(birthDateStr, latest.date)
  if (age === null) return null
  const rounded = Math.round(age)
  const ref = whoTable.reduce((best, curr) =>
    Math.abs(curr[0] - rounded) < Math.abs(best[0] - rounded) ? curr : best
  )
  const [, p3, p50, p97] = ref
  const val = latest[field]

  if (val < p3)  return { emoji: '⚠️', title: 'Abaixo do esperado para a idade', detail: 'Converse com o pediatra na próxima consulta.', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', sub: 'text-amber-600 dark:text-amber-500' }
  if (val <= p50) return { emoji: '✅', title: 'Crescimento dentro do esperado', detail: `${val}${unit} — está bem! Um pouco abaixo da média das meninas da mesma idade, mas totalmente normal.`, bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', sub: 'text-emerald-600 dark:text-emerald-500' }
  if (val <= p97) return { emoji: '✅', title: 'Crescimento dentro do esperado', detail: `${val}${unit} — está bem! Um pouco acima da média das meninas da mesma idade, mas totalmente normal.`, bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', sub: 'text-emerald-600 dark:text-emerald-500' }
  return { emoji: '📊', title: 'Acima do máximo esperado', detail: 'Converse com o pediatra na próxima consulta.', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200 dark:border-sky-800', text: 'text-sky-700 dark:text-sky-400', sub: 'text-sky-600 dark:text-sky-500' }
}

// ─── Build chart data: merge WHO reference + Helena's real points ─────────────
function buildChartData(whoTable, measurements, birthDateStr, field) {
  const whoMap = Object.fromEntries(whoTable.map(([m, p3, p50, p97]) => [m, { p3, p50, p97 }]))

  // Helena's data by age in months
  const helenaDots = measurements
    .filter(m => m[field] != null)
    .map(m => {
      const age = ageInMonths(birthDateStr, m.date)
      return { age, value: m[field] }
    })
    .filter(d => d.age !== null)
    .sort((a, b) => a.age - b.age)

  // Merge months from WHO + Helena
  const allMonths = new Set([...whoTable.map(r => r[0]), ...helenaDots.map(d => Math.round(d.age))])
  const sortedMonths = [...allMonths].sort((a, b) => a - b)

  return sortedMonths.map(month => {
    const who = whoMap[month]
    const helena = helenaDots.find(d => Math.round(d.age) === month)
    return {
      mes: month,
      p3:  who?.p3,
      p50: who?.p50,
      p97: who?.p97,
      helena: helena?.value,
    }
  })
}

// ─── Form ─────────────────────────────────────────────────────────────────────
function AddForm({ onSave, isSaving }) {
  const [date, setDate]     = useState(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()))
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')

  const inputCls = 'w-full rounded-xl border border-gray-200 dark:border-violet-900/40 bg-gray-50 dark:bg-[#130f2a] px-3 py-2.5 text-sm dark:text-white'
  const labelCls = 'text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block'

  const canSave = date && (weight || height)

  return (
    <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm mb-4">
      <p className="font-bold text-sm dark:text-white mb-3">Nova medição</p>
      <div className="flex flex-col gap-3">
        <div>
          <label className={labelCls}>Data</label>
          <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelCls}>Peso (kg)</label>
            <input type="number" step="0.01" min="0" placeholder="ex: 5.4" className={inputCls}
              value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className={labelCls}>Altura (cm)</label>
            <input type="number" step="0.1" min="0" placeholder="ex: 62.5" className={inputCls}
              value={height} onChange={e => setHeight(e.target.value)} />
          </div>
        </div>
        <button
          disabled={!canSave || isSaving}
          onClick={() => onSave({
            date: new Date(date + 'T12:00:00').getTime(),
            weight: weight ? Number(weight) : null,
            height: height ? Number(height) : null,
          })}
          className="w-full py-3 rounded-xl text-sm font-bold bg-violet-600 text-white disabled:opacity-40"
        >
          {isSaving ? 'Salvando...' : '+ Adicionar medição'}
        </button>
      </div>
    </div>
  )
}

// ─── Growth chart ─────────────────────────────────────────────────────────────
function GrowthChart({ data, yLabel, color }) {
  if (!data || data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={`band-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis dataKey="mes" tickLine={false} axisLine={false}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickFormatter={v => `${v}m`} />
        <YAxis tickLine={false} axisLine={false}
          tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Tooltip
          contentStyle={{ background: '#1e1640', border: 'none', borderRadius: 12, fontSize: 12 }}
          labelFormatter={v => `${v} meses de idade`}
          formatter={(val, name) => {
            if (name === 'p3')  return [val, 'Mínimo normal']
            if (name === 'p50') return [val, 'Média das meninas']
            if (name === 'p97') return [val, 'Máximo normal']
            return [val, '⭐ Helena']
          }}
        />
        {/* P3–P97 band */}
        <Area dataKey="p97" stroke="none" fill={`url(#band-${color})`} connectNulls />
        <Area dataKey="p3"  stroke="none" fill="white" connectNulls />
        {/* Reference lines */}
        <Line dataKey="p97" stroke={color} strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
        <Line dataKey="p50" stroke={color} strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls />
        <Line dataKey="p3"  stroke={color} strokeWidth={1} strokeDasharray="4 2" dot={false} connectNulls />
        {/* Helena's data */}
        <Line dataKey="helena" stroke="#7c3aed" strokeWidth={2.5}
          dot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }}
          activeDot={{ r: 6 }} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function GrowthScreen() {
  const queryClient = useQueryClient()
  const [editingBirth, setEditingBirth] = useState(false)
  const [tempBirth, setTempBirth] = useState('')

  const { data: birthDate = '' } = useQuery({
    queryKey: BIRTH_QUERY_KEY,
    queryFn: measurementsApi.getBirthDate,
    select: (v) => v || '',
  })

  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ['measurements'],
    queryFn: measurementsApi.getAll,
  })

  const birthMutation = useMutation({
    mutationFn: (value) => measurementsApi.setBirthDate(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BIRTH_QUERY_KEY })
      setEditingBirth(false)
    },
    onError: () => alert('Erro ao salvar a data de nascimento. Tente novamente.'),
  })

  const addMutation = useMutation({
    mutationFn: measurementsApi.add,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['measurements'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: measurementsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['measurements'] }),
  })

  const saveBirth = () => {
    birthMutation.mutate(tempBirth)
  }

  const weightData = buildChartData(WHO_WEIGHT, measurements, birthDate, 'weight')
  const heightData = buildChartData(WHO_HEIGHT, measurements, birthDate, 'height')

  const hasHelenaWeight = measurements.some(m => m.weight != null)
  const hasHelenaHeight = measurements.some(m => m.height != null)

  return (
    <div className="px-4 pb-4 overflow-y-auto overscroll-y-none h-full">
      <div className="pt-5 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">📏 Crescimento</h1>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Como a Helena está crescendo</p>
      </div>

      {/* Birth date */}
      <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm mb-4">
        {(editingBirth || !birthDate) ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400">Data de nascimento da Helena</p>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 rounded-xl border border-gray-200 dark:border-violet-900/40 bg-gray-50 dark:bg-[#130f2a] px-3 py-2 text-sm dark:text-white"
                value={tempBirth}
                onChange={e => setTempBirth(e.target.value)}
              />
              <button
                onClick={saveBirth}
                disabled={!tempBirth || birthMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-violet-600 text-white disabled:opacity-40"
              >
                {birthMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500">Nascimento</p>
              <p className="font-bold text-sm dark:text-white">
                {new Date(birthDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => { setTempBirth(birthDate); setEditingBirth(true) }}
              className="text-xs text-violet-600 dark:text-violet-400 font-bold"
            >
              Alterar
            </button>
          </div>
        )}
      </div>

      {/* Add measurement */}
      <AddForm onSave={(data) => addMutation.mutate(data)} isSaving={addMutation.isPending} />

      {/* Weight chart */}
      {hasHelenaWeight && birthDate && (() => {
        const status = interpretGrowth(WHO_WEIGHT, measurements, birthDate, 'weight', ' kg')
        return (
          <>
            {status && (
              <div className={`${status.bg} border ${status.border} rounded-2xl p-4 mb-3 flex items-start gap-3`}>
                <span className="text-2xl shrink-0">{status.emoji}</span>
                <div>
                  <p className={`text-sm font-bold ${status.text}`}>{status.title}</p>
                  <p className={`text-xs mt-0.5 leading-relaxed ${status.sub}`}>{status.detail}</p>
                </div>
              </div>
            )}
            <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm mb-4">
              <p className="font-bold text-sm dark:text-white mb-1">Peso (kg)</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">A linha roxa é a Helena. A faixa sombreada é a faixa normal para meninas da mesma idade.</p>
              <GrowthChart data={weightData} yLabel="kg" color="#ec4899" />
              <div className="flex gap-3 mt-2 justify-end">
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span className="w-5 h-px bg-pink-300 inline-block border-dashed border-t border-pink-300" /> Faixa normal
                </span>
                <span className="flex items-center gap-1 text-[10px] text-violet-500">
                  <span className="w-3 h-3 rounded-full bg-violet-600 inline-block" /> Helena
                </span>
              </div>
            </div>
          </>
        )
      })()}

      {/* Height chart */}
      {hasHelenaHeight && birthDate && (() => {
        const status = interpretGrowth(WHO_HEIGHT, measurements, birthDate, 'height', ' cm')
        return (
          <>
            {status && (
              <div className={`${status.bg} border ${status.border} rounded-2xl p-4 mb-3 flex items-start gap-3`}>
                <span className="text-2xl shrink-0">{status.emoji}</span>
                <div>
                  <p className={`text-sm font-bold ${status.text}`}>{status.title}</p>
                  <p className={`text-xs mt-0.5 leading-relaxed ${status.sub}`}>{status.detail}</p>
                </div>
              </div>
            )}
            <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm mb-4">
              <p className="font-bold text-sm dark:text-white mb-1">Comprimento (cm)</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">A linha roxa é a Helena. A faixa sombreada é a faixa normal para meninas da mesma idade.</p>
              <GrowthChart data={heightData} yLabel="cm" color="#38bdf8" />
              <div className="flex gap-3 mt-2 justify-end">
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span className="w-5 h-px bg-sky-300 inline-block border-dashed border-t border-sky-300" /> Faixa normal
                </span>
                <span className="flex items-center gap-1 text-[10px] text-violet-500">
                  <span className="w-3 h-3 rounded-full bg-violet-600 inline-block" /> Helena
                </span>
              </div>
            </div>
          </>
        )
      })()}

      {/* Measurements table */}
      {!isLoading && measurements.length > 0 && (
        <div className="bg-white dark:bg-[#1e1640] rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="px-4 pt-4 pb-2">
            <p className="font-bold text-sm dark:text-white">Histórico de medições</p>
          </div>
          {measurements.map((m, i) => {
            const age = birthDate ? ageInMonths(birthDate, m.date) : null
            return (
              <div
                key={m.id}
                className={`flex items-center px-4 py-3 ${i < measurements.length - 1 ? 'border-b border-gray-50 dark:border-violet-900/20' : ''}`}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold dark:text-white">
                    {new Date(m.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {age !== null && <span className="text-xs text-gray-400 dark:text-slate-500 font-normal ml-2">{age}m</span>}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                    {m.weight != null && `${m.weight} kg`}
                    {m.weight != null && m.height != null && ' · '}
                    {m.height != null && `${m.height} cm`}
                  </p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(m.id)}
                  disabled={deleteMutation.isPending}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  🗑️
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && measurements.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 opacity-40">
          <span className="text-4xl mb-2">📏</span>
          <p className="text-sm font-semibold text-gray-500">Nenhuma medição ainda</p>
        </div>
      )}
    </div>
  )
}
