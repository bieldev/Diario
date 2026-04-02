import webpush from 'web-push'
import { pushQueries, notifSettingsQueries } from '../db.js'
import { vapidKeys, sendPushToAll } from '../services/notifier.js'
import { sendDailySummary } from '../services/scheduler.js'

export async function pushRoutes(fastify) {
  // Chave pública VAPID — o frontend precisa disso para se inscrever
  fastify.get('/vapid-key', async () => ({ publicKey: vapidKeys.publicKey }))

  // Salva subscrição push do browser
  fastify.post('/subscribe', async (request, reply) => {
    const { endpoint, keys } = request.body
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return reply.status(400).send({ error: 'Subscrição inválida' })
    }
    pushQueries.insert.run({
      endpoint,
      p256dh:     keys.p256dh,
      auth:       keys.auth,
      created_at: Date.now(),
      user_agent: request.headers['user-agent'] ?? null,
    })
    return { ok: true }
  })

  // Lista dispositivos inscritos
  fastify.get('/devices', async () => {
    return pushQueries.all.all().map(d => ({
      id:           d.id,
      created_at:   d.created_at,
      last_success: d.last_success,
      fail_count:   d.fail_count,
      user_agent:   d.user_agent,
      endpoint_hint: d.endpoint.slice(0, 50) + '...',
    }))
  })

  // Remove subscrição (ex: usuário desativou notificações)
  fastify.post('/unsubscribe', async (request) => {
    const { endpoint } = request.body
    if (endpoint) pushQueries.delete.run({ endpoint })
    return { ok: true }
  })

  // Retorna configurações de notificação
  fastify.get('/settings', async () => notifSettingsQueries.get.get())

  // Atualiza configurações
  fastify.patch('/settings', async (request) => {
    const current = notifSettingsQueries.get.get()
    const body    = request.body
    notifSettingsQueries.update.run({
      enabled:              body.enabled              ?? current.enabled,
      feeding_interval_min: body.feeding_interval_min ?? current.feeding_interval_min,
      long_sleep_min:       body.long_sleep_min       ?? current.long_sleep_min,
      daily_summary:        body.daily_summary        ?? current.daily_summary,
      quiet_hours:          body.quiet_hours          ?? current.quiet_hours,
      quiet_start:          body.quiet_start          ?? current.quiet_start,
      quiet_end:            body.quiet_end            ?? current.quiet_end,
    })
    return notifSettingsQueries.get.get()
  })

  // Dispara o resumo diário manualmente (para teste)
  fastify.post('/test-daily-summary', async () => {
    await sendDailySummary()
    return { ok: true }
  })

  // Envia notificação de teste imediatamente (retorna detalhes de erro)
  fastify.post('/test', async (_, reply) => {
    const subs = pushQueries.all.all()
    if (subs.length === 0) {
      return reply.status(400).send({ error: 'Nenhum dispositivo inscrito' })
    }

    const data = JSON.stringify({
      title: '🎉 Notificação de teste',
      body:  'O app da Helena está configurado e funcionando!',
      url:   '/',
      tag:   'test',
      icon:  '/pwa-192.png',
    })

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        )
      )
    )

    const details = results.map((r, i) => ({
      endpoint: subs[i].endpoint.slice(0, 60) + '...',
      status:   r.status,
      code:     r.reason?.statusCode,
      message:  r.reason?.message,
      body:     r.reason?.body,
    }))

    const ok = results.some(r => r.status === 'fulfilled')
    console.log('Push test results:', JSON.stringify(details, null, 2))
    return reply.status(ok ? 200 : 502).send({ ok, details })
  })
}
