import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

// Injeta token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('helena_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redireciona para login se 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('helena_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
