import { formatTimerDisplay } from '../utils/format.js'

export function TimerCircle({ elapsed, running, color, idleEmoji, size = 140 }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{ width: size, height: size }}
        className={`
          rounded-full flex items-center justify-content-center transition-all duration-300
          ${running
            ? `${color.activeBg} shadow-[0_0_0_10px_${color.ringColor}]`
            : color.idleBg}
          flex items-center justify-center
        `}
      >
        {running ? (
          <span className={`text-2xl font-extrabold tabular-nums ${color.activeText}`}>
            {formatTimerDisplay(elapsed)}
          </span>
        ) : (
          <span className="text-5xl">{idleEmoji}</span>
        )}
      </div>
    </div>
  )
}
