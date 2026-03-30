import { api } from './client.js'

export const pushApi = {
  getVapidKey:   ()       => api.get('/push/vapid-key').then(r => r.data.publicKey),
  subscribe:     (sub)    => api.post('/push/subscribe', sub).then(r => r.data),
  unsubscribe:   (sub)    => api.post('/push/unsubscribe', sub).then(r => r.data),
  getSettings:   ()       => api.get('/push/settings').then(r => r.data),
  updateSettings:(data)   => api.patch('/push/settings', data).then(r => r.data),
  sendTest:      ()       => api.post('/push/test').then(r => r.data),
}
