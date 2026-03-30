import { feedingQueries, diaperQueries, sleepQueries, activeTimerQueries, startOfDay } from '../db.js'

export async function dashboardRoutes(fastify) {
  fastify.get('/', async () => {
    const start = startOfDay()
    const feedingsToday = feedingQueries.today.all({ start })
    const diapersToday = diaperQueries.today.all({ start })
    const sleepsToday = sleepQueries.today.all({ start })
    const active = activeTimerQueries.get.get() || null
    const totalSleepSec = sleepsToday.reduce((acc, s) => acc + (s.duration || 0), 0)
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
        sleepsCount: sleepsToday.length,
        totalSleepSec,
      },
      lastFeeding: lastFeeding || null,
      lastDiaper: lastDiaper || null,
      active,
      nextFeedingEst,
    }
  })
}
