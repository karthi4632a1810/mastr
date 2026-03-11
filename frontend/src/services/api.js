import axios from 'axios'

// Use environment variable or fallback to Render production URL
// For local development, set VITE_API_URL=http://localhost:5000/api in .env file
// Production default: https://vaalboss.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL || 'https://vaalboss.onrender.com/api'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized - Token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // If error is "No token provided", redirect to login immediately
      if (error.response?.data?.message === 'No token provided') {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${baseURL}/auth/refresh-token`, {
            refreshToken,
          })

          const { token, refreshToken: newRefreshToken } = response.data.data
          localStorage.setItem('token', token)
          localStorage.setItem('refreshToken', newRefreshToken)

          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        } else {
          // No refresh token, redirect to login
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          return Promise.reject(error)
        }
      } catch (refreshError) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }

    // Handle network errors (ERR_FAILED, ERR_NETWORK, etc.)
    if (!error.response) {
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_FAILED') {
        error.message = 'Unable to connect to server. The server may be down or unreachable. Please check your internet connection or try again later.'
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        error.message = 'Request timed out. The server is taking too long to respond. Please try again.'
      } else {
        error.message = 'Network error. Please check your connection and try again.'
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      error.message = 'You do not have permission to perform this action.'
    } else if (error.response?.status === 404) {
      error.message = 'Resource not found.'
    } else if (error.response?.status >= 500) {
      error.message = 'Server error. Please try again later.'
    }

    return Promise.reject(error)
  }
)

export default api
