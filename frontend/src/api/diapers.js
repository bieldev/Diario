import { api } from './client.js'

export const diapersApi = {
  getAll:  () => api.get('/diapers').then(r => r.data),
  getToday:() => api.get('/diapers/today').then(r => r.data),
  log:     (contents) => api.post('/diapers', { contents }).then(r => r.data),
  update:      (id, data) => api.patch(`/diapers/${id}`, data).then(r => r.data),
  saveNote:    (id, note, imageData) => api.patch(`/diapers/${id}`, { note, imageData }).then(r => r.data),
  delete:      (id) => api.delete(`/diapers/${id}`).then(r => r.data),
  photoUrl:    (id) => `/api/diapers/${id}/photo`,
}
