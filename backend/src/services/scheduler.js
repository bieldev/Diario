import cron from 'node-cron'
import { db, startOfDay } from '../db.js'
import { notifSettingsQueries, activeTimerQueries, feedingFeedbackQueries } from '../db.js'
import { sendPushToAll, lastNotifOf } from './notifier.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TZ = 'America/Sao_Paulo'

function isQuietNow(settings) {
  if (!settings.quiet_hours) return false
  const h = parseInt(new Date().toLocaleString('pt-BR', { timeZone: TZ, hour: '2-digit', hour12: false }), 10)
  const { quiet_start: s, quiet_end: e } = settings
  return s > e ? (h >= s || h < e) : (h >= s && h < e)
}

function minutesSince(ts) {
  return (Date.now() - ts) / 60_000
}

function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
}

// ─── Lembrete de mamada ───────────────────────────────────────────────────────
async function checkFeedingReminder(settings) {
  if (isQuietNow(settings)) return

  // Não lembrar se há timer ativo de qualquer tipo
  const active = activeTimerQueries.get.get()
  if (active) return

  const lastFeeding = db.prepare(`
    SELECT endTime FROM feedings WHERE endTime IS NOT NULL ORDER BY endTime DESC LIMIT 1
  `).get()
  if (!lastFeeding) return

  const mins = minutesSince(lastFeeding.endTime)
  if (mins < settings.feeding_interval_min) return

  // Evita repetir no mesmo intervalo
  const last = lastNotifOf('feeding_reminder')
  if (last && minutesSince(last.sent_at) < settings.feeding_interval_min) return

  await sendPushToAll('feeding_reminder', {
    title: '🤱 Hora de mamar',
    body:  `Helena não mama há ${fmtDuration(mins)} — hora de oferecer`,
    url:   '/mamar',
  })
}

// ─── Alerta sono longo ────────────────────────────────────────────────────────
async function checkLongSleep(settings) {
  const active = activeTimerQueries.get.get()
  if (!active || active.type !== 'sleep') return

  const mins = minutesSince(active.startTime)
  if (mins < settings.long_sleep_min) return

  // Envia apenas uma vez por sessão de sono
  const last = lastNotifOf('long_sleep')
  if (last && last.sent_at > active.startTime) return

  await sendPushToAll('long_sleep', {
    title: '😴 Sono muito longo',
    body:  `Helena está dormindo há ${fmtDuration(mins)} — verifique se está tudo bem`,
    url:   '/sono',
  })
}

// ─── Lembrete de fralda ───────────────────────────────────────────────────────
async function checkDiaperReminder(settings) {
  if (isQuietNow(settings) || !settings.diaper_reminder_min) return

  const lastDiaper = db.prepare(`
    SELECT time FROM diapers ORDER BY time DESC LIMIT 1
  `).get()
  if (!lastDiaper) return

  const mins = minutesSince(lastDiaper.time)
  if (mins < settings.diaper_reminder_min) return

  const last = lastNotifOf('diaper_reminder')
  if (last && minutesSince(last.sent_at) < settings.diaper_reminder_min) return

  await sendPushToAll('diaper_reminder', {
    title: '👶 Verificar fralda',
    body:  `Já faz ${fmtDuration(mins)} desde a última fralda`,
    url:   '/fralda',
  })
}

// ─── Resumo diário (à meia-noite de Brasília) ────────────────────────────────
export async function sendDailySummary() {
  const settings = notifSettingsQueries.get.get()
  if (!settings?.enabled || !settings.daily_summary) return

  // Roda às 00:00 BRT → reporta o dia que acabou de terminar (ontem em BRT)
  const todayStart     = startOfDay(new Date())                        // 00:00 BRT de hoje
  const yesterdayStart = startOfDay(new Date(Date.now() - 86_400_000)) // 00:00 BRT de ontem

  const feedingsCount = db.prepare(
    `SELECT COUNT(*) as n FROM feedings WHERE startTime >= ? AND startTime < ?`
  ).get(yesterdayStart, todayStart).n

  const diapersCount = db.prepare(
    `SELECT COUNT(*) as n FROM diapers WHERE time >= ? AND time < ?`
  ).get(yesterdayStart, todayStart).n

  const totalSleepSec = db.prepare(
    `SELECT COALESCE(SUM(duration),0) as s FROM sleeps WHERE startTime >= ? AND startTime < ?`
  ).get(yesterdayStart, todayStart).s

  const h = Math.floor(totalSleepSec / 3600)
  const m = Math.floor((totalSleepSec % 3600) / 60)
  const sleepStr = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`

  await sendPushToAll('daily_summary', {
    title: '📊 Resumo do dia',
    body:  `${feedingsCount} mamadas · ${diapersCount} fraldas · ${sleepStr} de sono`,
    url:   '/',
  })
}

// ─── Feedback pós-mamada ──────────────────────────────────────────────────────
async function checkFeedingFeedback(settings) {
  if (!settings?.enabled) return
  const pending = feedingFeedbackQueries.pendingDue.all({ now: Date.now() })
  for (const row of pending) {
    feedingFeedbackQueries.markNotified.run({ id: row.id })
    await sendPushToAll('feeding_feedback', {
      title: '🍼 Como foi após a mamada?',
      body: 'Teve arroto? Soluço? Toque para registrar.',
      url: `/mamar?feedback=${row.id}`,
    })
  }
}

// ─── Resumo matinal (às 09:00 BRT) ───────────────────────────────────────────
export async function sendMorningSummary() {
  const settings = notifSettingsQueries.get.get()
  if (!settings?.enabled || !settings.morning_summary) return

  // Janela noturna: ontem às 19:00 BRT → agora (09:00 BRT)
  const now = Date.now()
  const BR_TZ = 'America/Sao_Paulo'
  const yesterdayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: BR_TZ })
    .format(new Date(now - 86_400_000))
  const nightStart = new Date(`${yesterdayStr}T19:00:00-03:00`).getTime()

  const sleeps = db.prepare(
    `SELECT * FROM sleeps WHERE endTime > ? AND startTime < ? ORDER BY startTime ASC`
  ).all(nightStart, now)

  if (sleeps.length === 0) return

  // Soma apenas a porção dentro da janela noturna
  let totalSec = 0
  for (const s of sleeps) {
    const start = Math.max(s.startTime, nightStart)
    const end   = Math.min(s.endTime || now, now)
    totalSec += Math.max(0, Math.floor((end - start) / 1000))
  }

  const wakeUps = sleeps.length - 1
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const sleepStr = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`

  let body = `Dormiu ${sleepStr} na noite`
  if (wakeUps > 0) body += ` · ${wakeUps} acordada${wakeUps > 1 ? 's' : ''}`

  await sendPushToAll('morning_summary', {
    title: '🌅 Bom dia!',
    body,
    url:  '/sono',
  })
}

// ─── Start scheduler ──────────────────────────────────────────────────────────
export function startScheduler() {
  // Verifica a cada minuto (feedback) e a cada 10 minutos (lembretes)
  cron.schedule('* * * * *', async () => {
    const settings = notifSettingsQueries.get.get()
    try { await checkFeedingFeedback(settings) } catch (err) {
      console.error('Scheduler feedback error:', err.message)
    }
  })

  cron.schedule('*/10 * * * *', async () => {
    const settings = notifSettingsQueries.get.get()
    if (!settings?.enabled) return

    try {
      await Promise.all([
        checkFeedingReminder(settings),
        checkLongSleep(settings),
        checkDiaperReminder(settings),
      ])
    } catch (err) {
      console.error('Scheduler error:', err.message)
    }
  })

  // Resumo diário à meia-noite de Brasília (BRT = UTC-3 → 03:00 UTC)
  cron.schedule('0 3 * * *', sendDailySummary)

  // Resumo matinal às 09:00 BRT (BRT = UTC-3 → 12:00 UTC)
  cron.schedule('0 12 * * *', sendMorningSummary)

  console.log('⏰ Scheduler de notificações iniciado')
}
