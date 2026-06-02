import axios from 'axios'
import { tokenStore } from './tokenStore'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

api.interceptors.request.use(config => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config as typeof err.config & { _retry?: boolean }
    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) return Promise.reject(err)
      original._retry = true
      isRefreshing = true
      try {
        const { data } = await api.post<{ data: { accessToken: string } }>('/auth/refresh')
        tokenStore.set(data.data.accessToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch {
        tokenStore.clear()
        localStorage.removeItem('crm_user')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  },
)

export default api
