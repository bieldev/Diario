import { useState, useEffect } from 'react'
import { pushApi } from '../api/push.js'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(Notification.permission)   // 'default'|'granted'|'denied'
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  // Verifica se já está inscrito e sincroniza com o backend
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription()
    ).then(async sub => {
      if (!sub) { setSubscribed(false); return }
      setSubscribed(true)
      // Re-envia ao backend caso o registro tenha sido perdido (ex: limpeza do banco)
      try { await pushApi.subscribe(sub.toJSON()) } catch {}
    })
  }, [])

  // Ouve mensagens do SW (ex: navegar ao clicar notificação)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handler = (event) => {
      if (event.data?.type === 'NAVIGATE') {
        window.location.href = event.data.url
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  const subscribe = async () => {
    setLoading(true)
    setError(null)
    try {
      // Pede permissão
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') throw new Error('Permissão negada')

      // Busca a chave pública VAPID do servidor
      const publicKey = await pushApi.getVapidKey()

      // Cria a subscrição push no browser
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Envia subscrição ao backend
      await pushApi.subscribe(sub.toJSON())
      setSubscribed(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await pushApi.unsubscribe({ endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

  return { isSupported, permission, subscribed, loading, error, subscribe, unsubscribe }
}
