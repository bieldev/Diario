import { api } from './client.js'

export const sleepsApi = {
  getAll:  () => api.get('/sleeps').then(r => r.data),
  getToday:() => api.get('/sleeps/today').then(r => r.data),
  getWeek: () => api.get('/sleeps/week').then(r => r.data),
  getActive: () => api.get('/sleeps/active').then(r => r.data),
  start:   () => api.post('/sleeps/start').then(r => r.data),
  stop:    () => api.post('/sleeps/stop').then(r => r.data),
  cancel:  () => api.delete('/sleeps/cancel').then(r => r.data),
  update:  (id, data) => api.patch(`/sleeps/${id}`, data).then(r => r.data),
  delete:  (id) => api.delete(`/sleeps/${id}`).then(r => r.data),
}
