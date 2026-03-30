import { useEffect, useState } from 'react'

const NIGHT_START = 19 // 19h
const NIGHT_END = 7   // 7h

function isNight() {
  const h = new Date().getHours()
  return h >= NIGHT_START || h < NIGHT_END
}

export function useNightMode() {
  const [dark, setDark] = useState(isNight)

  useEffect(() => {
    // Recalcula no início de cada hora
    function tick() {
      setDark(isNight())
    }

    // Agenda próxima virada de hora
    const now = new Date()
    const msUntilNextHour =
      (60 - now.getMinutes()) * 60_000 - now.getSeconds() * 1000

    const timeout = setTimeout(() => {
      tick()
      const interval = setInterval(tick, 3_600_000) // a cada hora
      return () => clearInterval(interval)
    }, msUntilNextHour)

    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    const html = document.documentElement
    if (dark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }, [dark])

  return dark
}
