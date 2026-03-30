import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { diapersApi } from '../api/diapers.js'
import { PageHeader } from '../components/PageHeader.jsx'
import { Card } from '../components/Card.jsx'
import { formatTime } from '../utils/format.js'
import { haptics } from '../utils/haptics.js'

const OPTIONS = [
  { id: 'xixi',  emoji: '💧',    label: 'Xixi',         color: 'text-sky-500',   bg: 'bg-sky-50 dark:bg-sky-950/40',   border: 'border-sky-200 dark:border-sky-700',   check: 'bg-sky-500' },
  { id: 'coco',  emoji: '💩',    label: 'Coco',         color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-700', check: 'bg-amber-500' },
  { id: 'ambos', emoji: '💧💩', label: 'Xixi + Coco',  color: 'text-violet-600',bg: 'bg-violet-50 dark:bg-violet-950/40',border: 'border-violet-200 dark:border-violet-700',check: 'bg-violet-600' },
]

// ─── Sheet de feedback pós-fralda ─────────────────────────────────────────────
function DiaperFeedbackSheet({ diaperId, onClose }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [imageData, setImageData] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)

  const saveMutation = useMutation({
    mutationFn: () => diapersApi.saveNote(diaperId, note || null, imageData || undefined),
    onSuccess: () => {
      haptics.success()
      qc.invalidateQueries({ queryKey: ['diapers'] })
      onClose()
    },
  })

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImageData(ev.target.result)
      setPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white dark:bg-[#1e1640] rounded-t-3xl px-5 pt-4 pb-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-violet-800 rounded-full mx-auto mb-4" />
        <h2 className="text-base font-extrabold dark:text-white mb-1">👶 Observações da fralda</h2>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Opcional — adicione uma nota ou foto</p>

        <div className="flex flex-col gap-3">
          {/* Nota */}
          <textarea
            placeholder="Ex: coco com grânulos, xixi muito escuro, irritação na pele..."
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-200 dark:border-violet-900/40 bg-gray-50 dark:bg-[#130f2a] px-3 py-2 text-sm dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
          />

          {/* Foto */}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />

          {preview ? (
            <div className="relative">
              <img src={preview} alt="foto" className="w-full h-40 object-cover rounded-xl" />
              <button
                onClick={() => { setImageData(null); setPreview(null) }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs"
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-violet-900/40 rounded-xl py-4 text-gray-400 dark:text-slate-500 text-sm font-medium hover:border-violet-300 transition-colors"
            >
              📷 Adicionar foto
            </button>
          )}

          <div className="flex gap-2 mt-1">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-violet-950/40 text-gray-500 dark:text-slate-400">
              Pular
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || (!note && !imageData)}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-violet-600 text-white disabled:opacity-40"
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Item do histórico de hoje ────────────────────────────────────────────────
function DiaperItem({ d }) {
  const opt = OPTIONS.find(o => o.id === d.contents)
  return (
    <div className="bg-white dark:bg-[#1e1640] rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${opt?.bg} flex items-center justify-center text-lg shrink-0`}>{opt?.emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm dark:text-white">{opt?.label}</p>
        {d.note && <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{d.note}</p>}
        <p className="text-xs text-gray-400">{formatTime(d.time)}</p>
      </div>
      {d.photo_url && (
        <img
          src={d.photo_url}
          alt="foto fralda"
          className="w-12 h-12 rounded-lg object-cover shrink-0"
        />
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function DiaperScreen() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [savedMsg, setSavedMsg] = useState(false)
  const [feedbackId, setFeedbackId] = useState(null)

  const { data: today = [] } = useQuery({
    queryKey: ['diapers', 'today'],
    queryFn: diapersApi.getToday,
  })

  const logMutation = useMutation({
    mutationFn: () => diapersApi.log(selected),
    onSuccess: (data) => {
      haptics.success()
      qc.invalidateQueries({ queryKey: ['diapers'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setSavedMsg(selected)
      setSelected(null)
      setTimeout(() => {
        setSavedMsg(false)
        setFeedbackId(data.id)
      }, 800)
    },
  })

  return (
    <div className="px-4 pb-4 overflow-y-auto h-full">
      <PageHeader emoji="👶" title="Fralda" subtitle="O que tinha na fralda?" />

      <Card className="p-6 mb-5 shadow-md">
        <div className="flex flex-col gap-3 mb-5">
          {OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`
                flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all text-left
                ${selected === opt.id
                  ? `${opt.bg} ${opt.border}`
                  : 'bg-gray-50 dark:bg-slate-700/40 border-transparent'}
              `}
            >
              <span className="text-3xl">{opt.emoji}</span>
              <span className={`text-base font-bold ${selected === opt.id ? opt.color : 'text-gray-700 dark:text-slate-200'}`}>
                {opt.label}
              </span>
              {selected === opt.id && (
                <span className={`ml-auto w-6 h-6 rounded-full ${opt.check} flex items-center justify-center`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>

        {savedMsg ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl p-4 text-center">
            <span className="text-base font-bold text-emerald-600">✓ Fralda registrada!</span>
          </div>
        ) : (
          <button
            onClick={() => logMutation.mutate()}
            disabled={!selected || logMutation.isPending}
            className={`
              w-full py-4 rounded-2xl text-base font-extrabold transition-all
              ${selected
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-[0_4px_12px_rgba(245,158,11,0.4)]'
                : 'bg-gray-100 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500'}
            `}
          >
            + Registrar fralda
          </button>
        )}
      </Card>

      {today.length > 0 && (
        <>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Hoje ({today.length})</h2>
          <div className="flex flex-col gap-2">
            {today.slice(0, 10).map(d => <DiaperItem key={d.id} d={d} />)}
          </div>
        </>
      )}

      {feedbackId && (
        <DiaperFeedbackSheet diaperId={feedbackId} onClose={() => setFeedbackId(null)} />
      )}
    </div>
  )
}
