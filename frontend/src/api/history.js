import { api } from './client.js'

export const historyApi = {
  get: (params) => api.get('/history', { params }).then(r => r.data),
  exportCsv: () => api.get('/history/export', { responseType: 'blob' }).then(r => r.data),
}
