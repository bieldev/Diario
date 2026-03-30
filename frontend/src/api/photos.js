import { api } from './client.js'

export const photosApi = {
  getAll:  () => api.get('/photos').then(r => r.data),
  upload:  (data) => api.post('/photos', data).then(r => r.data),
  update:  (id, note) => api.patch(`/photos/${id}`, { note }).then(r => r.data),
  delete:  (id) => api.delete(`/photos/${id}`).then(r => r.data),
}
