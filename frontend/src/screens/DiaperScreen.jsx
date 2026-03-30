import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { diapersApi } from '../api/diapers.js'
import { PageHeader } from '../components/PageHeader.jsx'
import { Card } from '../components/Card.jsx'
import { formatTime } from '../utils/format.js'
import { haptics } from '../utils/haptics.js'

const OPTIONS = [
  { id: 'xixi',  emoji: '💧',    label: 'Xixi',         color: 'text-sky-500',   bg: 'bg-sky-50',   border: 'border-sky-200',   check: 'bg-sky-500' },
  { id: 'coco',  emoji: '💩',    label: 'Coco',         color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', check: 'bg-amber-500' },
  { id: 'ambos', emoji: '💧💩', label: 'Xixi + Coco',  color: 'text-violet-600',bg: 'bg-violet-50',border: 'border-violet-200',check: 'bg-violet-600' },
]

export function DiaperScreen() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [savedMsg, setSavedMsg] = useState(false)

  const { data: today = [] } = useQuery({
    queryKey: ['diapers', 'today'],
    queryFn: diapersApi.getToday,
  })

  const logMutation = useMutation({
    mutationFn: () => diapersApi.log(selected),
    onSuccess: () => {
      haptics.success()
      qc.invalidateQueries({ queryKey: ['diapers'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setSavedMsg(selected)
      setSelected(null)
      setTimeout(() => setSavedMsg(false), 2500)
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
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
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
            {today.slice(0, 10).map(d => {
              const opt = OPTIONS.find(o => o.id === d.contents)
              return (
                <div key={d.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${opt?.bg} flex items-center justify-center text-lg shrink-0`}>{opt?.emoji}</div>
                  <div>
                    <p className="font-bold text-sm">{opt?.label}</p>
                    <p className="text-xs text-gray-400">{formatTime(d.time)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
