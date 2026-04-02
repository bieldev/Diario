import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api/dashboard.js'
import { ActiveBanner } from '../components/ActiveBanner.jsx'
import { formatTime, formatDuration, timeAgo } from '../utils/format.js'

function StatCard({ emoji, label, value, subLabel, colorClass, bgClass, darkBgClass }) {
  return (
    <div className={`bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm transition-colors duration-400`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-xl ${bgClass} ${darkBgClass} flex items-center justify-center text-base`}>{emoji}</div>
        <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold">{label}</span>
      </div>
      <p className={`text-2xl font-extrabold ${colorClass}`}>{value}</p>
      {subLabel && <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{subLabel}</p>}
    </div>
  )
}

function QuickAction({ emoji, label, to, colorClass, bgClass, borderClass, darkBgClass }) {
  return (
    <Link to={to}
      className={`${bgClass} ${darkBgClass} ${borderClass} border-2 rounded-2xl p-4 flex flex-col items-center gap-1.5 transition-colors duration-400`}>
      <span className="text-3xl">{emoji}</span>
      <span className={`text-xs font-bold ${colorClass}`}>{label}</span>
    </Link>
  )
}

function timeUntil(ts) {
  const diff = Math.floor((ts - Date.now()) / 1000)
  if (diff <= 0) {
    const abs = Math.abs(diff)
    if (abs < 3600) return `há ${Math.floor(abs / 60)}min`
    return `há ${Math.floor(abs / 3600)}h${Math.floor((abs % 3600) / 60) > 0 ? ` ${Math.floor((abs % 3600) / 60)}min` : ''}`
  }
  if (diff < 3600) return `em ${Math.floor(diff / 60)}min`
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  return `em ${h}h${m > 0 ? ` ${m}min` : ''}`
}

export function HomeScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 30_000,
  })

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="px-4 pb-4 overflow-y-auto overscroll-y-none h-full">
      <div className="pt-5 pb-4">
        <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">{greeting} 👋</p>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">Diário da Helena</h1>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 capitalize">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {data?.active && <ActiveBanner active={data.active} />}

      <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">Hoje</h2>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <StatCard emoji="🤱" label="Mamadas"    value={data?.today?.feedingsCount ?? 0}  colorClass="text-pink-500"   bgClass="bg-pink-50"   darkBgClass="dark:bg-pink-950/40" />
          <StatCard emoji="👶" label="Fraldas"    value={data?.today?.diapersCount ?? 0}   colorClass="text-amber-500"  bgClass="bg-amber-50"  darkBgClass="dark:bg-amber-950/40" />
          <StatCard emoji="😴" label="Sono total" value={formatDuration(data?.today?.totalSleepSec)} subLabel={`${data?.today?.sleepsCount ?? 0} ${(data?.today?.sleepsCount ?? 0) === 1 ? 'soneca' : 'sonecas'}`} colorClass="text-sky-500" bgClass="bg-sky-50" darkBgClass="dark:bg-sky-950/40" />
          <StatCard emoji="📅" label="Total"      value={(data?.today?.feedingsCount ?? 0) + (data?.today?.diapersCount ?? 0) + (data?.today?.sleepsCount ?? 0)} colorClass="text-violet-600 dark:text-violet-400" bgClass="bg-violet-50" darkBgClass="dark:bg-violet-950/40" />
        </div>
      )}

      {data?.lastFeeding && (
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Última mamada</h2>
          <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-colors duration-400">
            <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center text-xl shrink-0">🤱</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm dark:text-white">
                Peito {data.lastFeeding.breast === 'E' ? 'Esquerdo' : data.lastFeeding.breast === 'D' ? 'Direito' : 'Ambos'}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-400">
                {formatTime(data.lastFeeding.startTime)} · {formatDuration(data.lastFeeding.duration)} · {timeAgo(data.lastFeeding.startTime)}
              </p>
            </div>
          </div>
        </div>
      )}

      {data?.nextFeedingEst && !data?.active && (
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Próxima mamada</h2>
          <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-colors duration-400">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${data.nextFeedingEst > Date.now() ? 'bg-violet-50 dark:bg-violet-950/40' : 'bg-orange-50 dark:bg-orange-950/40'}`}>
              🍼
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm dark:text-white">
                Prevista para {formatTime(data.nextFeedingEst)}
              </p>
              <p className={`text-xs font-medium ${data.nextFeedingEst > Date.now() ? 'text-violet-500 dark:text-violet-400' : 'text-orange-500 dark:text-orange-400'}`}>
                {timeUntil(data.nextFeedingEst)} · média dos últimos registros
              </p>
            </div>
          </div>
        </div>
      )}

      {data?.lastDiaper && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Última fralda</h2>
          <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-colors duration-400">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-xl shrink-0">
              {data.lastDiaper.contents === 'xixi' ? '💧' : data.lastDiaper.contents === 'coco' ? '💩' : '💧💩'}
            </div>
            <div>
              <p className="font-bold text-sm dark:text-white">
                {data.lastDiaper.contents === 'xixi' ? 'Xixi' : data.lastDiaper.contents === 'coco' ? 'Coco' : 'Xixi + Coco'}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-400">{formatTime(data.lastDiaper.time)} · {timeAgo(data.lastDiaper.time)}</p>
            </div>
          </div>
        </div>
      )}

      {data?.lastMeasurement && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Último peso &amp; altura</h2>
          <Link to="/crescimento" className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-colors duration-400 block">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-xl shrink-0">📏</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm dark:text-white">
                {[
                  data.lastMeasurement.weight != null && `${data.lastMeasurement.weight} kg`,
                  data.lastMeasurement.height != null && `${data.lastMeasurement.height} cm`,
                ].filter(Boolean).join(' · ')}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-400">
                {new Date(data.lastMeasurement.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <span className="text-gray-300 dark:text-slate-600 text-sm">›</span>
          </Link>
        </div>
      )}

      <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">Ação rápida</h2>
      <div className="grid grid-cols-2 gap-2.5 pb-2">
        <QuickAction emoji="🤱" label="Amamentar"   to="/mamar"       colorClass="text-pink-500"   bgClass="bg-pink-50"   darkBgClass="dark:bg-pink-950/40"   borderClass="border-pink-100 dark:border-pink-900/50" />
        <QuickAction emoji="👶" label="Fralda"       to="/fralda"      colorClass="text-amber-500"  bgClass="bg-amber-50"  darkBgClass="dark:bg-amber-950/40"  borderClass="border-amber-100 dark:border-amber-900/50" />
        <QuickAction emoji="😴" label="Sono"         to="/sono"        colorClass="text-sky-500"    bgClass="bg-sky-50"    darkBgClass="dark:bg-sky-950/40"    borderClass="border-sky-100 dark:border-sky-900/50" />
        <QuickAction emoji="📊" label="Estatísticas" to="/stats"       colorClass="text-violet-600 dark:text-violet-400" bgClass="bg-violet-50" darkBgClass="dark:bg-violet-950/40" borderClass="border-violet-100 dark:border-violet-900/50" />
        <Link to="/diario-diario"
          className="col-span-2 bg-violet-50 dark:bg-violet-950/30 border-2 border-violet-100 dark:border-violet-900/50 rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors duration-400">
          <span className="text-2xl">📅</span>
          <div>
            <p className="text-sm font-bold text-violet-700 dark:text-violet-400">Histórico Diário</p>
            <p className="text-xs text-violet-500 dark:text-violet-600">Resumo de cada dia</p>
          </div>
        </Link>
        <Link to="/crescimento"
          className="col-span-2 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-100 dark:border-emerald-900/50 rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors duration-400">
          <span className="text-2xl">📏</span>
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Crescimento</p>
            <p className="text-xs text-emerald-500 dark:text-emerald-600">Peso, altura e curvas OMS</p>
          </div>
        </Link>
        <Link to="/fotos"
          className="col-span-2 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-100 dark:border-rose-900/50 rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors duration-400">
          <span className="text-2xl">📸</span>
          <div>
            <p className="text-sm font-bold text-rose-700 dark:text-rose-400">Diário de Fotos</p>
            <p className="text-xs text-rose-500 dark:text-rose-600">Timeline de memórias da Helena</p>
          </div>
        </Link>
        <Link to="/notificacoes"
          className="col-span-2 bg-sky-50 dark:bg-sky-950/30 border-2 border-sky-100 dark:border-sky-900/50 rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors duration-400">
          <span className="text-2xl">🔔</span>
          <div>
            <p className="text-sm font-bold text-sky-700 dark:text-sky-400">Notificações</p>
            <p className="text-xs text-sky-500 dark:text-sky-600">Lembretes mesmo com o app fechado</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
