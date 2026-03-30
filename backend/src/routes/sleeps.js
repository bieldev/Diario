import { sleepQueries, activeTimerQueries, notifSettingsQueries, startOfDay, daysAgo } from '../db.js'
import { sendPushToAll } from '../services/notifier.js'

function isQuietNow(s) {
  if (!s.quiet_hours) return false
  const h = new Date().getHours()
  return s.quiet_start > s.quiet_end
    ? (h >= s.quiet_start || h < s.quiet_end)
    : (h >= s.quiet_start && h < s.quiet_end)
}

function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
}

export async function sleepRoutes(fastify) {
  fastify.get('/', async () => sleepQueries.all.all())

  fastify.get('/today', async () => sleepQueries.today.all({ start: startOfDay() }))

  fastify.get('/week', async () => sleepQueries.last7days.all({ start: daysAgo(7) }))

  fastify.get('/active', async () => {
    const active = activeTimerQueries.get.get()
    if (!active || active.type !== 'sleep') return null
    return active
  })

  fastify.post('/start', async (request, reply) => {
    const existing = activeTimerQueries.get.get()
    if (existing) {
      return reply.status(409).send({ error: 'Já existe um timer ativo' })
    }
    const startTime = Date.now()
    activeTimerQueries.set.run({ type: 'sleep', breast: null, startTime })

    const settings = notifSettingsQueries.get.get()
    if (settings?.enabled) {
      sendPushToAll('sleep-start', {
        title: '😴 Helena começou a dormir',
        body: `${fmtTime(startTime)}`,
        url: '/sono',
      }).catch(() => {})
    }

    return { type: 'sleep', startTime }
  })

  fastify.post('/stop', async (request, reply) => {
    const active = activeTimerQueries.get.get()
    if (!active || active.type !== 'sleep') {
      return reply.status(400).send({ error: 'Nenhum sono em andamento' })
    }
    const endTime = Date.now()
    const duration = Math.floor((endTime - active.startTime) / 1000)
    const result = sleepQueries.insert.run({ startTime: active.startTime, endTime, duration })
    activeTimerQueries.clear.run()

    const settings = notifSettingsQueries.get.get()
    if (settings?.enabled) {
      sendPushToAll('sleep-end', {
        title: '☀️ Helena acordou',
        body: `${fmtTime(endTime)} · dormiu por ${fmtDuration(duration)}`,
        url: '/sono',
      }).catch(() => {})
    }

    return { id: result.lastInsertRowid, startTime: active.startTime, endTime, duration }
  })

  fastify.delete('/cancel', async () => {
    activeTimerQueries.clear.run()
    return { ok: true }
  })

  fastify.patch('/:id', async (request, reply) => {
    const id = Number(request.params.id)
    const row = sleepQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })

    const { startTime, endTime } = request.body
    const newStartTime = startTime ?? row.startTime
    const newEndTime   = endTime   ?? row.endTime
    const newDuration  = (newStartTime && newEndTime) ? Math.floor((newEndTime - newStartTime) / 1000) : row.duration
    sleepQueries.update.run({ id, startTime: newStartTime, endTime: newEndTime, duration: newDuration })
    return sleepQueries.byId.get({ id })
  })

  fastify.delete('/:id', async (request, reply) => {
    const id = Number(request.params.id)
    const row = sleepQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })
    sleepQueries.delete.run({ id })
    return { ok: true }
  })
}
