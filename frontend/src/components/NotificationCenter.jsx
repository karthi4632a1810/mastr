import { useState, useEffect, useRef, useMemo } from 'react'
import { Bell, X, CheckCircle, AlertCircle, Info, Calendar, User, FileText, Clock } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Get read notifications from localStorage
  const getReadNotifications = () => {
    try {
      const read = localStorage.getItem('readNotifications')
      return read ? JSON.parse(read) : []
    } catch {
      return []
    }
  }

  // Save read notifications to localStorage
  const saveReadNotifications = (readIds) => {
    try {
      localStorage.setItem('readNotifications', JSON.stringify(readIds))
    } catch (error) {
      console.error('Error saving read notifications:', error)
    }
  }

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await api.get('/ess/notifications')
        return response.data.data || []
      } catch (error) {
        console.error('Error fetching notifications:', error)
        return []
      }
    },
    refetchInterval: 60000, // Refetch every minute
    enabled: !!user,
  })

  // Add read status to notifications
  const notificationsWithReadStatus = useMemo(() => {
    const readIds = getReadNotifications()
    return notifications.map(notification => ({
      ...notification,
      read: readIds.includes(notification.id)
    }))
  }, [notifications])

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const readIds = getReadNotifications()
      if (!readIds.includes(notificationId)) {
        readIds.push(notificationId)
        saveReadNotifications(readIds)
      }
      // Also call the API (for future server-side tracking)
      try {
        await api.put(`/ess/notifications/${notificationId}/read`)
      } catch (error) {
        // Ignore API errors since we're using localStorage
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
    },
  })

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const allIds = notifications.map(n => n.id)
      saveReadNotifications(allIds)
      // Also call the API (for future server-side tracking)
      try {
        await api.put('/ess/notifications/read-all')
      } catch (error) {
        // Ignore API errors since we're using localStorage
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = notificationsWithReadStatus.filter(n => !n.read).length

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return CheckCircle
      case 'warning':
        return AlertCircle
      case 'error':
        return AlertCircle
      case 'celebration':
        return Calendar
      case 'info':
        return Info
      default:
        return Bell
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-600 bg-green-50'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'celebration':
        return 'text-purple-600 bg-purple-50'
      case 'info':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id)
    }
    
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
      setIsOpen(false)
    }
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  disabled={markAllAsReadMutation.isLoading}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                Loading notifications...
              </div>
            ) : notificationsWithReadStatus.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notificationsWithReadStatus.map((notification) => {
                  const Icon = getNotificationIcon(notification.type)
                  const colorClass = getNotificationColor(notification.type)
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 p-2 rounded-lg ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5"></span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.createdAt && (
                            <p className="mt-1 text-xs text-gray-400">
                              {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notificationsWithReadStatus.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  // Navigate based on user role
                  if (user?.role === 'admin' || user?.role === 'hr') {
                    navigate('/leave-approvals')
                  } else {
                    navigate('/my-requests')
                  }
                  setIsOpen(false)
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {user?.role === 'admin' || user?.role === 'hr' 
                  ? 'View all approvals' 
                  : 'View all requests'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationCenter

