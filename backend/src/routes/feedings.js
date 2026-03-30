import { feedingQueries, feedingNotesQueries, feedingFeedbackQueries, activeTimerQueries, activeBreastLogQueries, notifSettingsQueries, startOfDay, daysAgo } from '../db.js'
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

function calcDuration(startTime, endTime) {
  return Math.floor((endTime - startTime) / 1000)
}

function fmtDuration(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
}

export async function feedingRoutes(fastify) {
  fastify.get('/', async () => feedingQueries.all.all())

  fastify.get('/today', async () => feedingQueries.today.all({ start: startOfDay() }))

  fastify.get('/week', async () => feedingQueries.last7days.all({ start: daysAgo(7) }))

  fastify.get('/active', async () => {
    const active = activeTimerQueries.get.get()
    if (!active) return null
    if (active.type === 'feeding') {
      const logRow = activeBreastLogQueries.get.get()
      const breastLog = JSON.parse(logRow?.log || '[]')
      return { ...active, breastLog }
    }
    return active
  })

  fastify.post('/start', async (request, reply) => {
    const { breast } = request.body
    if (!['E', 'D', 'A'].includes(breast)) {
      return reply.status(400).send({ error: 'Peito inválido' })
    }
    const existing = activeTimerQueries.get.get()
    if (existing) {
      return reply.status(409).send({ error: 'Já existe um timer ativo' })
    }
    const startTime = Date.now()
    activeTimerQueries.set.run({ type: 'feeding', breast, startTime })
    activeBreastLogQueries.set.run({ log: JSON.stringify([{ breast, startTime }]) })

    const settings = notifSettingsQueries.get.get()
    if (settings?.enabled) {
      const breastLabel = breast === 'E' ? 'peito esquerdo' : breast === 'D' ? 'peito direito' : 'ambos os peitos'
      sendPushToAll('feeding-start', {
        title: '🤱 Helena começou a mamar',
        body: `${fmtTime(startTime)} · ${breastLabel}`,
        url: '/mamar',
      }).catch(() => {})
    }

    return { type: 'feeding', breast, startTime }
  })

  fastify.post('/stop', async (request, reply) => {
    const active = activeTimerQueries.get.get()
    if (!active || active.type !== 'feeding') {
      return reply.status(400).send({ error: 'Nenhuma mamada em andamento' })
    }
    const endTime = Date.now()
    const duration = Math.floor((endTime - active.startTime) / 1000)

    // Finaliza o log de peitos
    const logRow = activeBreastLogQueries.get.get()
    const log = JSON.parse(logRow?.log || '[]')
    let breastLog = null
    let displayBreast = active.breast

    if (log.length > 0) {
      const segments = log.map((entry, i) => ({
        breast:   entry.breast,
        duration: Math.floor(((i < log.length - 1 ? log[i + 1].startTime : endTime) - entry.startTime) / 1000),
      }))
      breastLog = JSON.stringify(segments)
      const unique = [...new Set(segments.map(s => s.breast))]
      displayBreast = unique.length > 1 ? 'A' : unique[0]
    }

    const result = feedingQueries.insert.run({
      breast: displayBreast, startTime: active.startTime, endTime, duration, breast_log: breastLog,
    })
    activeTimerQueries.clear.run()
    activeBreastLogQueries.clear.run()

    const newId = Number(result.lastInsertRowid)

    // Agenda feedback pós-mamada para 5 minutos depois
    feedingFeedbackQueries.setPending.run({ id: newId, at: endTime + 5 * 60 * 1000 })

    const settings = notifSettingsQueries.get.get()
    if (settings?.enabled) {
      const breastLabel = displayBreast === 'E' ? 'peito esquerdo' : displayBreast === 'D' ? 'peito direito' : 'ambos os peitos'
      sendPushToAll('feeding-end', {
        title: '✅ Mamada finalizada',
        body: `${fmtTime(endTime)} · ${breastLabel} · ${fmtDuration(duration)}`,
        url: '/mamar',
      }).catch(() => {})
    }

    return { id: newId, breast: displayBreast, startTime: active.startTime, endTime, duration, breast_log: breastLog }
  })

  fastify.patch('/active/breast', async (request, reply) => {
    const { breast } = request.body
    if (!['E', 'D', 'A'].includes(breast)) {
      return reply.status(400).send({ error: 'Peito inválido' })
    }
    const active = activeTimerQueries.get.get()
    if (!active || active.type !== 'feeding') {
      return reply.status(400).send({ error: 'Nenhuma mamada em andamento' })
    }
    activeTimerQueries.updateBreast.run({ breast })
    const logRow = activeBreastLogQueries.get.get()
    let log = JSON.parse(logRow?.log || '[]')
    // Se o log está vazio (sessão iniciada antes da feature ou após restart),
    // reconstrói a partir do peito original registrado no timer
    if (log.length === 0) {
      log = [{ breast: active.breast, startTime: active.startTime }]
    }
    log.push({ breast, startTime: Date.now() })
    activeBreastLogQueries.set.run({ log: JSON.stringify(log) })
    return { ...active, breast }
  })

  fastify.delete('/cancel', async () => {
    activeTimerQueries.clear.run()
    activeBreastLogQueries.clear.run()
    return { ok: true }
  })

  fastify.patch('/:id', async (request, reply) => {
    const id = Number(request.params.id)
    const row = feedingQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })

    const { breast, startTime, endTime } = request.body
    if (breast && !['E', 'D', 'A'].includes(breast)) {
      return reply.status(400).send({ error: 'Peito inválido' })
    }
    const newBreast     = breast     ?? row.breast
    const newStartTime  = startTime  ?? row.startTime
    const newEndTime    = endTime    ?? row.endTime
    const newDuration   = (newStartTime && newEndTime) ? calcDuration(newStartTime, newEndTime) : row.duration
    feedingQueries.update.run({ id, breast: newBreast, startTime: newStartTime, endTime: newEndTime, duration: newDuration })
    return feedingQueries.byId.get({ id })
  })

  fastify.delete('/:id', async (request, reply) => {
    const id = Number(request.params.id)
    const row = feedingQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })
    feedingQueries.delete.run({ id })
    return { ok: true }
  })

  fastify.get('/:id/notes', async (request, reply) => {
    const id = Number(request.params.id)
    const row = feedingQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })
    return feedingNotesQueries.byFeedingId.get({ feeding_id: id }) ?? null
  })

  fastify.post('/:id/notes', async (request, reply) => {
    const id = Number(request.params.id)
    const row = feedingQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })
    const { burp = 0, hiccup = 0, spit_up = 'nao', behavior = null, note = null } = request.body
    feedingNotesQueries.upsert.run({ feeding_id: id, burp: burp ? 1 : 0, hiccup: hiccup ? 1 : 0, spit_up, behavior, note, created_at: Date.now() })
    return feedingNotesQueries.byFeedingId.get({ feeding_id: id })
  })
}
