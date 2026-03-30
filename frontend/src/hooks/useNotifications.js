import { useEffect, useRef } from 'react'

/**
 * Agenda uma notificação browser X minutos após o fim de uma mamada.
 * Funciona enquanto o app estiver aberto no navegador.
 */
export function useFeedingReminder(lastFeedingEndTime, intervalMinutes = 180) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (!lastFeedingEndTime) return
    if (!('Notification' in window)) return

    const schedule = () => {
      clearTimeout(timerRef.current)

      const fireAt = lastFeedingEndTime + intervalMinutes * 60 * 1000
      const delay = Math.max(0, fireAt - Date.now())

      timerRef.current = setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('🤱 Hora de mamar!', {
            body: `Já faz ${intervalMinutes / 60}h desde a última mamada da Helena.`,
            icon: '/pwa-192.png',
            tag: 'feeding-reminder',
            renotify: true,
          })
        }
      }, delay)
    }

    if (Notification.permission === 'granted') {
      schedule()
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') schedule()
      })
    }

    return () => clearTimeout(timerRef.current)
  }, [lastFeedingEndTime, intervalMinutes])
}
