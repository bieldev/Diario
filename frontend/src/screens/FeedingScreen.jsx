import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { feedingsApi } from '../api/feedings.js'
import { useElapsedTimer } from '../hooks/useElapsedTimer.js'
import { PageHeader } from '../components/PageHeader.jsx'
import { Card } from '../components/Card.jsx'
import { formatTime, formatDuration, formatTimerDisplay } from '../utils/format.js'
import { haptics } from '../utils/haptics.js'

const BREASTS = [
  { id: 'E', label: '← Esquerdo' },
  { id: 'D', label: 'Direito →' },
  { id: 'A', label: '↔ Ambos' },
]

const BREAST_LABEL = { E: '← Esquerdo', D: 'Direito →', A: '↔ Ambos' }

function BreastSegments({ breastLog }) {
  const segments = typeof breastLog === 'string' ? JSON.parse(breastLog) : breastLog
  if (!segments || segments.length <= 1) return null
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {segments.map((s, i) => (
        <span key={i} className="text-[10px] font-bold bg-pink-50 dark:bg-pink-950/40 text-pink-500 px-1.5 py-0.5 rounded-md">
          {s.breast === 'E' ? '← E' : s.breast === 'D' ? 'D →' : '↔'} {formatDuration(s.duration)}
        </span>
      ))}
    </div>
  )
}

function NotesBadges({ feeding }) {
  const tags = []
  if (feeding.burp)   tags.push('💨')
  if (feeding.hiccup) tags.push('😮')
  if (feeding.spit_up && feeding.spit_up !== 'nao') tags.push('🤢')
  if (feeding.behavior === 'dormiu')  tags.push('😴')
  if (feeding.behavior === 'calmo')   tags.push('😌')
  if (feeding.behavior === 'agitado') tags.push('😣')
  if (feeding.behavior === 'chorou')  tags.push('😭')
  if (tags.length === 0) return null
  return <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{tags.join(' ')}</p>
}

function RecentItem({ feeding }) {
  return (
    <div className="bg-white dark:bg-[#1e1640] rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 transition-colors duration-400">
      <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center text-lg shrink-0">🤱</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm dark:text-white">
          {BREAST_LABEL[feeding.breast] || 'Ambos'}
        </p>
        <BreastSegments breastLog={feeding.breast_log} />
        <NotesBadges feeding={feeding} />
        <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">{formatTime(feeding.startTime)}</p>
      </div>
      <span className="text-sm font-bold text-pink-500 shrink-0">{formatDuration(feeding.duration)}</span>
    </div>
  )
}

// ─── Feedback pós-mamada ──────────────────────────────────────────────────────
const BEHAVIORS = [
  { id: 'dormiu',  label: '😴 Dormiu' },
  { id: 'calmo',   label: '😌 Calmo' },
  { id: 'agitado', label: '😣 Agitado' },
  { id: 'chorou',  label: '😭 Chorou' },
]

const SPIT_UPS = [
  { id: 'nao',       label: 'Não' },
  { id: 'pouquinho', label: 'Pouquinho' },
  { id: 'bastante',  label: 'Bastante' },
]

function FeedingFeedbackSheet({ feedingId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ burp: false, hiccup: false, spit_up: 'nao', behavior: null, note: '' })
  const toggle = (k) => setForm(f => ({ ...f, [k]: !f[k] }))
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: () => feedingsApi.saveNotes(feedingId, form),
    onSuccess: () => { haptics.success(); qc.invalidateQueries({ queryKey: ['feedings'] }); onClose() },
  })

  const btnCls = (active) => `flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
    active ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 dark:bg-[#130f2a] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-violet-900/40'
  }`

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-[#1e1640] rounded-t-3xl px-5 pt-4 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 dark:bg-violet-800 rounded-full mx-auto mb-4" />
        <h2 className="text-base font-extrabold dark:text-white mb-1">🍼 Como foi após a mamada?</h2>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Registre o que aconteceu depois</p>

        <div className="flex flex-col gap-4">
          {/* Arroto e soluço */}
          <div className="flex gap-3">
            <button
              onClick={() => toggle('burp')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors ${
                form.burp ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-50 dark:bg-[#130f2a] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-violet-900/40'
              }`}
            >
              💨 Arrotou
            </button>
            <button
              onClick={() => toggle('hiccup')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors ${
                form.hiccup ? 'bg-orange-400 text-white border-orange-400' : 'bg-gray-50 dark:bg-[#130f2a] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-violet-900/40'
              }`}
            >
              😮 Soluçou
            </button>
          </div>

          {/* Regurgitou */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Regurgitou?</p>
            <div className="flex gap-2">
              {SPIT_UPS.map(s => (
                <button key={s.id} onClick={() => set('spit_up', s.id)} className={btnCls(form.spit_up === s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Comportamento */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Comportamento</p>
            <div className="grid grid-cols-2 gap-2">
              {BEHAVIORS.map(b => (
                <button key={b.id} onClick={() => set('behavior', form.behavior === b.id ? null : b.id)} className={btnCls(form.behavior === b.id)}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nota */}
          <textarea
            placeholder="Observação adicional... (opcional)"
            value={form.note}
            onChange={e => set('note', e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-gray-200 dark:border-violet-900/40 bg-gray-50 dark:bg-[#130f2a] px-3 py-2 text-sm dark:text-white resize-none"
          />

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-violet-950/40 text-gray-500 dark:text-slate-400">
              Pular
            </button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1 py-3 rounded-xl text-sm font-bold bg-violet-600 text-white disabled:opacity-50">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function FeedingScreen() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [breast, setBreast] = useState(null)
  const [savedMsg, setSavedMsg] = useState(false)
  const [feedbackId, setFeedbackId] = useState(() => {
    const id = searchParams.get('feedback')
    return id ? Number(id) : null
  })

  // Limpa o ?feedback= da URL sem recarregar
  useEffect(() => {
    if (searchParams.get('feedback')) {
      setSearchParams({}, { replace: true })
    }
  }, [])

  const { data: active, isLoading: loadingActive } = useQuery({
    queryKey: ['feedings', 'active'],
    queryFn: feedingsApi.getActive,
    refetchInterval: 5_000,
  })

  const { data: recent = [] } = useQuery({
    queryKey: ['feedings', 'today'],
    queryFn: feedingsApi.getToday,
  })

  const elapsed = useElapsedTimer(active?.startTime, !!active)

  const startMutation = useMutation({
    mutationFn: () => feedingsApi.start(breast),
    onSuccess: () => {
      haptics.medium()
      qc.invalidateQueries({ queryKey: ['feedings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const switchBreastMutation = useMutation({
    mutationFn: (b) => feedingsApi.switchBreast(b),
    onSuccess: () => {
      haptics.light()
      qc.invalidateQueries({ queryKey: ['feedings', 'active'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const stopMutation = useMutation({
    mutationFn: feedingsApi.stop,
    onSuccess: () => {
      haptics.success()
      qc.invalidateQueries({ queryKey: ['feedings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2500)
    },
  })

  const isRunning = !!active && active.type === 'feeding'
  const canStart = !isRunning && breast && !startMutation.isPending

  return (
    <div className="px-4 pb-4 overflow-y-auto h-full">
      <PageHeader emoji="🤱" title="Amamentação" subtitle="Registre cada mamada" />

      <Card className="p-6 mb-5 shadow-md">
        {/* Timer */}
        <div className="flex flex-col items-center mb-6">
          <div className={`
            w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300
            ${isRunning
              ? 'bg-gradient-to-br from-pink-500 to-pink-300 shadow-[0_0_0_10px_#FCE7F3] dark:shadow-[0_0_0_10px_rgba(236,72,153,0.15)]'
              : 'bg-pink-50 dark:bg-pink-950/40'}
          `}>
            {isRunning
              ? <span className="text-2xl font-extrabold tabular-nums text-white">{formatTimerDisplay(elapsed)}</span>
              : <span className="text-5xl">🤱</span>
            }
          </div>
          {isRunning && active?.startTime && (
            <p className="text-xs text-gray-400 mt-3">Começou às {formatTime(active.startTime)}</p>
          )}
          {!isRunning && (
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-3">Selecione o peito e inicie</p>
          )}
        </div>

        {/* Log de segmentos durante a sessão */}
        {isRunning && active?.breastLog?.length > 1 && (
          <div className="flex flex-wrap gap-1.5 justify-center mb-4">
            {active.breastLog.map((entry, i) => {
              const isLast = i === active.breastLog.length - 1
              const segEndMs = isLast
                ? active.startTime + elapsed * 1000
                : active.breastLog[i + 1].startTime
              const segDur = Math.max(0, Math.floor((segEndMs - entry.startTime) / 1000))
              return (
                <span key={i} className={`text-xs px-2.5 py-1 rounded-xl font-bold ${
                  isLast
                    ? 'bg-pink-500 text-white'
                    : 'bg-pink-50 dark:bg-pink-950/40 text-pink-500'
                }`}>
                  {entry.breast === 'E' ? '← E' : entry.breast === 'D' ? 'D →' : '↔'} {formatDuration(segDur)}
                </span>
              )
            })}
          </div>
        )}

        {/* Seleção / troca de peito */}
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider text-center mb-3">
          {isRunning ? 'Trocar peito' : 'Qual peito?'}
        </p>
        <div className="flex gap-2 mb-5">
          {BREASTS.map(b => {
            const activeBreast = isRunning ? active?.breast : breast
            const isSelected = activeBreast === b.id
            return (
              <button
                key={b.id}
                onClick={() => {
                  if (isRunning) {
                    if (!isSelected) switchBreastMutation.mutate(b.id)
                  } else {
                    setBreast(b.id)
                  }
                }}
                disabled={isRunning && isSelected}
                className={`
                  flex-1 py-2.5 rounded-xl text-xs font-bold transition-all
                  ${isSelected
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'bg-pink-50 dark:bg-pink-950/40 text-pink-500 active:scale-95'}
                  ${isRunning && isSelected ? 'cursor-default' : ''}
                `}
              >
                {b.label}
              </button>
            )
          })}
        </div>

        {/* Botão principal */}
        {savedMsg ? (
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <span className="text-base font-bold text-emerald-600">✓ Mamada registrada!</span>
          </div>
        ) : !isRunning ? (
          <button
            onClick={() => startMutation.mutate()}
            disabled={!canStart}
            className={`
              w-full py-4 rounded-2xl text-base font-extrabold transition-all
              ${canStart
                ? 'bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-[0_4px_12px_rgba(236,72,153,0.4)]'
                : 'bg-gray-100 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500'}
            `}
          >
            ▶ Iniciar mamada
          </button>
        ) : (
          <button
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending}
            className="w-full py-4 rounded-2xl text-base font-extrabold bg-gray-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
          >
            ■ Finalizar mamada
          </button>
        )}
      </Card>

      {/* Recentes */}
      {recent.length > 0 && (
        <>
          <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">Hoje</h2>
          <div className="flex flex-col gap-2">
            {recent.slice(0, 8).map(f => <RecentItem key={f.id} feeding={f} />)}
          </div>
        </>
      )}

      {feedbackId && (
        <FeedingFeedbackSheet feedingId={feedbackId} onClose={() => setFeedbackId(null)} />
      )}
    </div>
  )
}
