import webpush from 'web-push'
import { configQueries, pushQueries, notifLogQueries } from '../db.js'

// ─── VAPID: auto-gera no primeiro start, persiste no DB ──────────────────────
function getOrCreateVapidKeys() {
  const pub  = configQueries.get.get({ key: 'vapid_public_key' })
  const priv = configQueries.get.get({ key: 'vapid_private_key' })

  if (pub && priv) {
    return { publicKey: pub.value, privateKey: priv.value }
  }

  console.log('🔑 Gerando VAPID keys pela primeira vez...')
  const keys = webpush.generateVAPIDKeys()
  configQueries.set.run({ key: 'vapid_public_key',  value: keys.publicKey })
  configQueries.set.run({ key: 'vapid_private_key', value: keys.privateKey })
  return keys
}

export const vapidKeys = getOrCreateVapidKeys()

webpush.setVapidDetails(
  'mailto:contato@helenadiario.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey,
)

// ─── Envia push para todas as subscrições salvas ──────────────────────────────
export async function sendPushToAll(type, payload) {
  const subscriptions = pushQueries.all.all()
  if (subscriptions.length === 0) return

  const data = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    url:   payload.url || '/',
    tag:   type,
    icon:  '/pwa-192.png',
    badge: '/pwa-192.png',
  })

  const now = Date.now()
  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        data,
      ).then(res => {
        pushQueries.markSuccess.run({ endpoint: sub.endpoint, now })
        return res
      }).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          pushQueries.delete.run({ endpoint: sub.endpoint })
        } else {
          pushQueries.incrementFail.run({ endpoint: sub.endpoint })
        }
        throw err
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  if (sent > 0) {
    notifLogQueries.insert.run({ type, sent_at: now })
    console.log(`🔔 Push [${type}] enviado para ${sent} dispositivo(s)`)
  }
}

// ─── Consulta último envio de um tipo ────────────────────────────────────────
export function lastNotifOf(type) {
  return notifLogQueries.lastByType.get({ type })
}
