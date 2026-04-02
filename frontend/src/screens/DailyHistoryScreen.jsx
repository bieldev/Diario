import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client.js'
import { PageHeader } from '../components/PageHeader.jsx'
import { formatDuration } from '../utils/format.js'

function fetchDaily(days) {
  return api.get(`/dashboard/daily?days=${days}`).then(r => r.data)
}

function DayCard({ day }) {
  const date = new Date(day.date)
  const isToday     = day.dateStr === new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const isYesterday = day.dateStr === new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date(Date.now() - 86_400_000))
  const hasData = day.feedingsCount > 0 || day.diapersCount > 0 || day.sleepsCount > 0

  const dayLabel = isToday ? 'Hoje' : isYesterday ? 'Ontem' : date.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' })
  const dateLabel = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })

  return (
    <div className={`bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm transition-colors duration-400 ${!hasData ? 'opacity-40' : ''}`}>
      {/* Header do dia */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isToday && <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />}
          <p className="text-sm font-extrabold dark:text-white capitalize">{dayLabel}</p>
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500">{dateLabel}</p>
      </div>

      {!hasData ? (
        <p className="text-xs text-gray-300 dark:text-slate-600">Sem registros</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {/* Mamadas */}
          <div className="flex flex-col items-center bg-pink-50 dark:bg-pink-950/30 rounded-xl py-2.5 px-1">
            <span className="text-base leading-none mb-1">🤱</span>
            <p className="text-lg font-extrabold text-pink-500 leading-none">{day.feedingsCount}</p>
            <p className="text-[10px] text-pink-400 dark:text-pink-600 mt-0.5">mamadas</p>
          </div>

          {/* Fraldas */}
          <div className="flex flex-col items-center bg-amber-50 dark:bg-amber-950/30 rounded-xl py-2.5 px-1">
            <span className="text-base leading-none mb-1">👶</span>
            <p className="text-lg font-extrabold text-amber-500 leading-none">{day.diapersCount}</p>
            <p className="text-[10px] text-amber-400 dark:text-amber-600 mt-0.5">fraldas</p>
          </div>

          {/* Sono */}
          <div className="flex flex-col items-center bg-sky-50 dark:bg-sky-950/30 rounded-xl py-2.5 px-1">
            <span className="text-base leading-none mb-1">😴</span>
            <p className="text-sm font-extrabold text-sky-500 leading-none">{day.totalSleepSec > 0 ? formatDuration(day.totalSleepSec) : '—'}</p>
            <p className="text-[10px] text-sky-400 dark:text-sky-600 mt-0.5">{day.sleepsCount} {day.sleepsCount === 1 ? 'soneca' : 'sonecas'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function DailyHistoryScreen() {
  const [days, setDays] = useState(7)

  const { data = [], isLoading } = useQuery({
    queryKey: ['daily-history', days],
    queryFn:  () => fetchDaily(days),
  })

  const options = [
    { label: '7 dias',  value: 7  },
    { label: '30 dias', value: 30 },
    { label: '60 dias', value: 60 },
  ]

  return (
    <div className="px-4 pb-4 overflow-y-auto overscroll-y-none h-full">
      <PageHeader emoji="📅" title="Histórico Diário" subtitle="Resumo por dia" />

      {/* Filtro de período */}
      <div className="flex gap-2 mb-4">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => setDays(o.value)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
              days === o.value
                ? 'bg-violet-600 text-white'
                : 'bg-white dark:bg-[#1e1640] text-gray-400 dark:text-slate-500'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1e1640] rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map(day => (
            <DayCard key={day.date} day={day} />
          ))}
        </div>
      )}
    </div>
  )
}
