import { api } from './client.js'

export const dashboardApi = {
  get: () => api.get('/dashboard').then(r => r.data),
}
