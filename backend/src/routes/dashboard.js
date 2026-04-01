import { feedingQueries, diaperQueries, sleepQueries, activeTimerQueries, startOfDay } from '../db.js'

export async function dashboardRoutes(fastify) {
  fastify.get('/', async () => {
    const start = startOfDay()
    const feedingsToday = feedingQueries.today.all({ start })
    const diapersToday = diaperQueries.today.all({ start })
    const sleepsToday = sleepQueries.today.all({ start })
    const active = activeTimerQueries.get.get() || null

    // Sono que cruza meia-noite: conta apenas a porção dentro de "hoje"
    const now = Date.now()
    const totalSleepSec = sleepsToday.reduce((acc, s) => {
      const effectiveStart = Math.max(s.startTime, start)
      const effectiveEnd = s.endTime || now
      return acc + Math.max(0, Math.floor((effectiveEnd - effectiveStart) / 1000))
    }, 0)
    const lastFeeding = feedingQueries.all.get()
    const lastDiaper = diaperQueries.all.get()

    // ─── Previsão próxima mamada (média dos últimos 5 intervalos) ───────────────
    let nextFeedingEst = null
    if (!active || active.type !== 'feeding') {
      const lastFive = feedingQueries.lastFive.all()
      if (lastFive.length >= 2) {
        const intervals = []
        for (let i = 0; i < lastFive.length - 1; i++) {
          intervals.push(lastFive[i].startTime - lastFive[i + 1].startTime)
        }
        const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length
        nextFeedingEst = Math.round(lastFive[0].startTime + avgMs)
      }
    }

    return {
      today: {
        feedingsCount: feedingsToday.length,
        diapersCount: diapersToday.length,
        sleepsCount: sleepsToday.filter(s => !s.endTime || s.endTime >= start).length,
        totalSleepSec,
      },
      lastFeeding: lastFeeding || null,
      lastDiaper: lastDiaper || null,
      active,
      nextFeedingEst,
    }
  })
}
