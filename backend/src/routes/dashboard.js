import { feedingQueries, diaperQueries, sleepQueries, activeTimerQueries, measurementQueries, startOfDay, db } from '../db.js'

const BR_TZ = 'America/Sao_Paulo'
function dateStrBR(ts) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: BR_TZ }).format(new Date(ts))
}

export async function dashboardRoutes(fastify) {
  // ─── Histórico diário ────────────────────────────────────────────────────────
  fastify.get('/daily', async (req) => {
    const days  = Math.min(parseInt(req.query.days || '60', 10), 180)
    const now   = Date.now()
    const rangeStart = startOfDay(new Date(now - (days - 1) * 86_400_000))

    // Monta mapa de dias (hoje → rangeStart)
    const dayMap = {}
    for (let i = 0; i < days; i++) {
      const dayStart = startOfDay(new Date(now - i * 86_400_000))
      dayMap[dayStart] = { date: dayStart, dateStr: dateStrBR(dayStart), feedingsCount: 0, diapersCount: 0, sleepsCount: 0, totalSleepSec: 0 }
    }

    // Mamadas — conta pelo dia em que começaram
    const feedings = db.prepare(`SELECT startTime FROM feedings WHERE startTime >= ?`).all(rangeStart)
    for (const f of feedings) {
      const d = startOfDay(new Date(f.startTime))
      if (dayMap[d]) dayMap[d].feedingsCount++
    }

    // Fraldas
    const diapers = db.prepare(`SELECT time FROM diapers WHERE time >= ?`).all(rangeStart)
    for (const d of diapers) {
      const k = startOfDay(new Date(d.time))
      if (dayMap[k]) dayMap[k].diapersCount++
    }

    // Sonos — conta no dia em que terminaram; duração dividida por dia
    const sleeps = db.prepare(
      `SELECT startTime, endTime FROM sleeps WHERE endTime >= ? OR (endTime IS NULL AND startTime >= ?)`
    ).all(rangeStart, rangeStart)
    for (const s of sleeps) {
      const endTs = s.endTime || now
      const countDay = startOfDay(new Date(endTs))
      if (dayMap[countDay]) dayMap[countDay].sleepsCount++
      if (!s.endTime) continue
      let cur = s.startTime
      while (cur < endTs) {
        const dayStart = startOfDay(new Date(cur))
        const dayEnd   = dayStart + 86_400_000
        const segEnd   = Math.min(endTs, dayEnd)
        if (dayMap[dayStart]) dayMap[dayStart].totalSleepSec += Math.floor((segEnd - cur) / 1000)
        cur = dayEnd
      }
    }

    return Object.values(dayMap)
      .filter(d => d.date <= now)
      .sort((a, b) => b.date - a.date)
  })

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
    const lastMeasurement = measurementQueries.all.get()

    // ─── Previsão próxima mamada (média dos últimos 5 intervalos) ───────────────
    let nextFeedingEst = null
    let avgFeedingIntervalMin = null
    if (!active || active.type !== 'feeding') {
      const lastFive = feedingQueries.lastFive.all()
      if (lastFive.length >= 2) {
        const intervals = []
        for (let i = 0; i < lastFive.length - 1; i++) {
          intervals.push(lastFive[i].startTime - lastFive[i + 1].startTime)
        }
        const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length
        nextFeedingEst = Math.round(lastFive[0].startTime + avgMs)
        avgFeedingIntervalMin = Math.round(avgMs / 60000)
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
      lastMeasurement: lastMeasurement || null,
      active,
      nextFeedingEst,
      avgFeedingIntervalMin,
    }
  })
}
