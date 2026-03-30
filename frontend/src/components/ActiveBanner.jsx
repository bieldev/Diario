import { Link } from 'react-router-dom'
import { useElapsedTimer } from '../hooks/useElapsedTimer.js'
import { formatDuration } from '../utils/format.js'

export function ActiveBanner({ active }) {
  const elapsed = useElapsedTimer(active?.startTime, !!active)

  if (!active) return null

  const isFeeding = active.type === 'feeding'
  const to = isFeeding ? '/mamar' : '/sono'
  const label = isFeeding ? 'Mamando agora...' : 'Dormindo agora...'
  const emoji = isFeeding ? '🤱' : '😴'

  return (
    <Link to={to} className="block mb-4">
      <div className="bg-gradient-to-r from-violet-600 to-violet-400 rounded-2xl px-4 py-3 flex items-center gap-3 text-white shadow-md">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1">
          <p className="font-bold text-sm">{label}</p>
          <p className="text-xs opacity-80 mt-0.5">{formatDuration(elapsed)} em andamento</p>
        </div>
        <span className="text-xs font-bold bg-white/20 rounded-lg px-3 py-1.5">Abrir</span>
      </div>
    </Link>
  )
}
