import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sleepsApi } from '../api/sleeps.js'
import { useElapsedTimer } from '../hooks/useElapsedTimer.js'
import { PageHeader } from '../components/PageHeader.jsx'
import { Card } from '../components/Card.jsx'
import { formatTime, formatDuration, formatTimerDisplay } from '../utils/format.js'
import { haptics } from '../utils/haptics.js'
import { useState } from 'react'

function SleepItem({ sleep }) {
  return (
    <div className="bg-white dark:bg-[#1e1640] rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 transition-colors duration-400">
      <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-lg shrink-0">😴</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm dark:text-white">
          {formatTime(sleep.startTime)} → {sleep.endTime ? formatTime(sleep.endTime) : '...'}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-400">Duração: {formatDuration(sleep.duration)}</p>
      </div>
      <span className="text-sm font-bold text-sky-500 shrink-0">{formatDuration(sleep.duration)}</span>
    </div>
  )
}

export function SleepScreen() {
  const qc = useQueryClient()
  const [savedMsg, setSavedMsg] = useState(false)

  const { data: active } = useQuery({
    queryKey: ['sleeps', 'active'],
    queryFn: sleepsApi.getActive,
    refetchInterval: 5_000,
  })

  const { data: today = [] } = useQuery({
    queryKey: ['sleeps', 'today'],
    queryFn: sleepsApi.getToday,
  })

  const elapsed = useElapsedTimer(active?.startTime, !!active)

  const startMutation = useMutation({
    mutationFn: sleepsApi.start,
    onSuccess: () => {
      haptics.medium()
      qc.invalidateQueries({ queryKey: ['sleeps'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const stopMutation = useMutation({
    mutationFn: sleepsApi.stop,
    onSuccess: () => {
      haptics.success()
      qc.invalidateQueries({ queryKey: ['sleeps'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2500)
    },
  })

  const isRunning = !!active && active.type === 'sleep'

  const totalSleepToday = today.reduce((acc, s) => acc + (s.duration || 0), 0)

  return (
    <div className="px-4 pb-4 overflow-y-auto h-full">
      <PageHeader emoji="😴" title="Sono" subtitle="Acompanhe o sono da Helena" />

      <Card className="p-6 mb-5 shadow-md">
        <div className="flex flex-col items-center mb-6">
          <div className={`
            w-44 h-44 rounded-full flex items-center justify-center transition-all duration-300
            ${isRunning
              ? 'bg-gradient-to-br from-sky-500 to-sky-300 shadow-[0_0_0_12px_#DBEAFE] dark:shadow-[0_0_0_12px_rgba(59,130,246,0.15)]'
              : 'bg-sky-50 dark:bg-sky-950/40'}
          `}>
            {isRunning
              ? <span className="text-2xl font-extrabold tabular-nums text-white tracking-wide">{formatTimerDisplay(elapsed)}</span>
              : <span className="text-6xl">😴</span>
            }
          </div>

          {isRunning && active?.startTime && (
            <p className="text-xs text-gray-400 mt-3">Dormiu às {formatTime(active.startTime)}</p>
          )}
          {!isRunning && (
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-3 text-center">
              {today.length > 0
                ? `${today.length} período${today.length > 1 ? 's' : ''} hoje · ${formatDuration(totalSleepToday)} total`
                : 'Toque para iniciar o sono'}
            </p>
          )}
        </div>

        {savedMsg ? (
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <span className="text-base font-bold text-emerald-600">✓ Sono registrado!</span>
          </div>
        ) : !isRunning ? (
          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="w-full py-4 rounded-2xl text-base font-extrabold bg-gradient-to-r from-sky-500 to-sky-400 text-white shadow-[0_4px_12px_rgba(59,130,246,0.4)]"
          >
            🌙 Helena dormiu
          </button>
        ) : (
          <button
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending}
            className="w-full py-4 rounded-2xl text-base font-extrabold bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-[0_4px_12px_rgba(245,158,11,0.35)]"
          >
            ☀️ Helena acordou
          </button>
        )}
      </Card>

      {today.length > 0 && (
        <>
          <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
            Hoje · {formatDuration(totalSleepToday)} total
          </h2>
          <div className="flex flex-col gap-2">
            {today.map(s => <SleepItem key={s.id} sleep={s} />)}
          </div>
        </>
      )}
    </div>
  )
}
