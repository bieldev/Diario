import { api } from './client.js'

export const feedingsApi = {
  getAll:  () => api.get('/feedings').then(r => r.data),
  getToday:() => api.get('/feedings/today').then(r => r.data),
  getWeek: () => api.get('/feedings/week').then(r => r.data),
  getActive: () => api.get('/feedings/active').then(r => r.data),
  start:   (breast) => api.post('/feedings/start', { breast }).then(r => r.data),
  stop:    () => api.post('/feedings/stop').then(r => r.data),
  cancel:  () => api.delete('/feedings/cancel').then(r => r.data),
  switchBreast: (breast) => api.patch('/feedings/active/breast', { breast }).then(r => r.data),
  update:  (id, data) => api.patch(`/feedings/${id}`, data).then(r => r.data),
  delete:  (id) => api.delete(`/feedings/${id}`).then(r => r.data),
  getNotes:   (id) => api.get(`/feedings/${id}/notes`).then(r => r.data),
  saveNotes:  (id, data) => api.post(`/feedings/${id}/notes`, data).then(r => r.data),
}
