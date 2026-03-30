import { useState, useEffect, useRef } from 'react'

/**
 * Retorna o tempo decorrido em segundos desde `startTime` (timestamp ms).
 * Atualiza a cada segundo enquanto `running` for true.
 */
export function useElapsedTimer(startTime, running) {
  const [elapsed, setElapsed] = useState(
    startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
  )
  const ref = useRef(null)

  useEffect(() => {
    if (running && startTime) {
      // Sincroniza imediatamente
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
      ref.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } else {
      clearInterval(ref.current)
    }
    return () => clearInterval(ref.current)
  }, [running, startTime])

  return elapsed
}
