import { api } from './client.js'

export const measurementsApi = {
  getAll:       () => api.get('/measurements').then(r => r.data),
  add:          (data) => api.post('/measurements', data).then(r => r.data),
  update:       (id, data) => api.patch(`/measurements/${id}`, data).then(r => r.data),
  delete:       (id) => api.delete(`/measurements/${id}`).then(r => r.data),
  getBirthDate: () => api.get('/measurements/birth-date').then(r => r.data.value),
  setBirthDate: (value) => api.post('/measurements/birth-date', { value }).then(r => r.data),
}
