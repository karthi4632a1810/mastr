import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState, useEffect, useRef } from 'react'
import { Monitor, Camera, Users, Play, Square, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Loader, FileText, Settings, MapPin } from 'lucide-react'
import Button from '../../components/Button'
import Table from '../../components/Table'
import Select from '../../components/Select'
import Input from '../../components/Input'

const RealTimeAttendance = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5) // seconds
  const [selectedCamera, setSelectedCamera] = useState(null)
  
  // SSE streaming state (with face detection like CameraPreviewPage)
  const [isPaused, setIsPaused] = useState(false)
  const [streamRefreshInterval, setStreamRefreshInterval] = useState(1000) // 1 second default for real-time
  const [liveData, setLiveData] = useState(null)
  const [streamError, setStreamError] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const eventSourceRef = useRef(null)
  const imageRef = useRef(null)
  const canvasRef = useRef(null)

  // Get all cameras for preview selection
  const { data: cameras } = useQuery({
    queryKey: ['cameras'],
    queryFn: async () => {
      const response = await api.get('/cameras', { params: { isActive: true } })
      return response.data.data || []
    }
  })

  // Get monitoring status
  const { data: monitoringStatus } = useQuery({
    queryKey: ['camera-monitoring-status'],
    queryFn: async () => {
      const response = await api.get('/camera-monitoring/status')
      return response.data.data || []
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false
  })

  // Get real-time attendance data
  const { data: attendanceData, refetch } = useQuery({
    queryKey: ['real-time-attendance'],
    queryFn: async () => {
      const response = await api.get('/camera-monitoring/attendance')
      return response.data.data || {}
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false
  })

  // Real-time streaming using Server-Sent Events (SSE) with face detection - like CameraPreviewPage
  useEffect(() => {
    if (!selectedCamera?._id || isPaused || !selectedCamera) {
      // Clean up when camera is deselected or paused
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setLiveData(null)
      setIsStreaming(false)
      return
    }

    // Validate camera
    if (!selectedCamera.isActive) {
      setStreamError('Camera is not active. Please activate it first.')
      setIsStreaming(false)
      return
    }

    if (selectedCamera.isUnderMaintenance) {
      setStreamError('Camera is under maintenance.')
      setIsStreaming(false)
      return
    }

    // Check for local webcam types
    if (['usb_webcam', 'laptop_webcam'].includes(selectedCamera.type)) {
      setStreamError('Local webcams cannot be streamed from the server.')
      setIsStreaming(false)
      return
    }

    // Get auth token for SSE request
    const token = localStorage.getItem('token')
    if (!token) {
      setStreamError('Authentication required')
      setIsStreaming(false)
      return
    }

    // Create EventSource for SSE stream (token passed as query param since EventSource doesn't support headers)
    // Use the same base URL as the API service
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://vaalboss.onrender.com' : window.location.origin)
    const streamUrl = `${apiBase}/api/cameras/${selectedCamera._id}/live-stream?interval=${streamRefreshInterval}&token=${encodeURIComponent(token)}`
    
    console.log('Connecting to SSE stream:', streamUrl.replace(token, '***'))
    const eventSource = new EventSource(streamUrl)

    eventSourceRef.current = eventSource
    setIsStreaming(false) // Start as not streaming until connection opens
    setStreamError(null)
    setLiveData(null) // Clear previous data

    eventSource.onopen = () => {
      console.log('SSE connection opened for camera:', selectedCamera._id)
      setIsStreaming(true)
      setStreamError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          console.log('Stream connected:', data.message)
          if (data.modelInfo) {
            setLiveData(prev => ({
              ...prev,
              modelInfo: data.modelInfo
            }))
          }
        } else if (data.type === 'frame') {
          setLiveData({
            imageData: data.imageData,
            detections: data.detections || [],
            modelInfo: data.modelInfo || {},
            timestamp: data.timestamp,
            frameInfo: data.frameInfo
          })
          setStreamError(null)
          setIsStreaming(true)
        } else if (data.type === 'error') {
          console.error('Stream error from server:', data.message)
          setStreamError(data.message || 'Unknown stream error')
          setIsStreaming(false)
        } else if (data.type === 'info') {
          // Handle info messages (like reconnection status)
          console.log('Stream info:', data.message)
          // Don't set as error, just log - connection is still active
          if (data.message && data.message.includes('reconnecting')) {
            // Show a temporary message but don't block the stream
            setStreamError(null) // Clear any previous errors
            setIsStreaming(false) // Show loading state during reconnection
          }
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      const readyState = eventSource.readyState
      console.error('SSE error:', error, 'ReadyState:', readyState)
      
      // Check if connection is closed
      if (readyState === EventSource.CLOSED) {
        setStreamError('Stream connection closed. The camera stream may have ended. Please check camera accessibility.')
        setIsStreaming(false)
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }
      } else if (readyState === EventSource.CONNECTING) {
        // Still connecting - don't show error, just keep loading state
        setIsStreaming(false)
        // Don't set error message when connecting - let the loading state show
      } else {
        // Connection error but still trying to reconnect
        // Only show error if we haven't received any frames yet
        if (!liveData?.imageData) {
          setStreamError('Connecting to camera stream...')
        }
        setIsStreaming(false)
        // EventSource will automatically try to reconnect
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsStreaming(false)
    }
  }, [selectedCamera?._id, isPaused, streamRefreshInterval])

  // Draw face detection boxes on canvas (like CameraPreviewPage)
  useEffect(() => {
    if (!selectedCamera || ['usb_webcam', 'laptop_webcam'].includes(selectedCamera.type)) return
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!image || !canvas) return

    const drawDetections = () => {
      if (!image.complete || !image.naturalWidth || !liveData?.detections) return

      // Get displayed image dimensions
      const displayWidth = image.offsetWidth || image.width
      const displayHeight = image.offsetHeight || image.height
      const naturalWidth = image.naturalWidth
      const naturalHeight = image.naturalHeight

      // Calculate scale factors
      const scaleX = displayWidth / naturalWidth
      const scaleY = displayHeight / naturalHeight

      // Set canvas size to match displayed image
      canvas.width = displayWidth
      canvas.height = displayHeight

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw detection boxes
      liveData.detections.forEach((detection) => {
        const { box, confidence, matched, employeeName } = detection

        // Scale box coordinates to match displayed image
        const scaledBox = {
          x: box.x * scaleX,
          y: box.y * scaleY,
          width: box.width * scaleX,
          height: box.height * scaleY
        }

        // Draw box
        ctx.strokeStyle = matched ? '#10b981' : '#ef4444' // Green if matched, red if not
        ctx.lineWidth = 3
        ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height)

        // Draw label background
        const labelHeight = 30
        const labelY = scaledBox.y - labelHeight < 0 ? scaledBox.y + scaledBox.height : scaledBox.y - labelHeight
        ctx.fillStyle = matched ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ctx.fillRect(scaledBox.x, labelY, scaledBox.width, labelHeight)

        // Draw label text
        ctx.fillStyle = 'white'
        ctx.font = 'bold 14px Arial'
        const labelText = employeeName 
          ? `${employeeName} (${(confidence * 100).toFixed(1)}%)`
          : `Unknown (${(confidence * 100).toFixed(1)}%)`
        ctx.fillText(labelText, scaledBox.x + 5, labelY + 20)
      })
    }

    const redraw = () => {
      if (image.complete && image.naturalWidth > 0) {
        drawDetections()
      }
    }

    // Redraw on load
    image.addEventListener('load', redraw)
    
    // Redraw on resize
    const resizeObserver = new ResizeObserver(redraw)
    resizeObserver.observe(image)

    // Initial draw
    redraw()

    return () => {
      image.removeEventListener('load', redraw)
      resizeObserver.disconnect()
    }
  }, [liveData?.detections, selectedCamera?.type])

  const handleStreamRefresh = () => {
    // Close and reopen stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    setLiveData(null)
    setStreamError(null)
    showToast('Reconnecting stream...', 'info')
  }

  const startAllMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/camera-monitoring/start-all')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['camera-monitoring-status'])
      showToast('Started monitoring all cameras', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to start monitoring', 'error')
    }
  })

  const stopAllMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/camera-monitoring/stop-all')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['camera-monitoring-status'])
      showToast('Stopped monitoring all cameras', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to stop monitoring', 'error')
    }
  })

  const startCameraMutation = useMutation({
    mutationFn: async (cameraId) => {
      const response = await api.post('/camera-monitoring/start', { cameraId })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['camera-monitoring-status'])
      showToast('Started monitoring camera', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to start monitoring', 'error')
    }
  })

  const stopCameraMutation = useMutation({
    mutationFn: async (cameraId) => {
      const response = await api.post(`/camera-monitoring/stop/${cameraId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['camera-monitoring-status'])
      showToast('Stopped monitoring camera', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to stop monitoring', 'error')
    }
  })

  const recentColumns = [
    {
      header: 'Time',
      accessor: 'punchTime',
      cell: (row) => (
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-sm">
            {new Date(row.punchTime).toLocaleTimeString()}
          </span>
        </div>
      )
    },
    {
      header: 'Employee',
      accessor: 'employee',
      cell: (row) => (
        <div>
          <div className="font-medium">{row.employee.name}</div>
          <div className="text-xs text-gray-500">{row.employee.employeeId}</div>
        </div>
      )
    },
    {
      header: 'Camera',
      accessor: 'camera',
      cell: (row) => (
        <div className="flex items-center">
          <Camera className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-sm">{row.camera?.cameraName || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Match Score',
      accessor: 'faceMatch',
      cell: (row) => (
        <div className="flex items-center">
          {row.faceMatch?.matched ? (
            <span className="flex items-center text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">
                {((row.faceMatch?.matchScore || 0) * 100).toFixed(1)}%
              </span>
            </span>
          ) : (
            <span className="flex items-center text-red-600">
              <XCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">Failed</span>
            </span>
          )}
        </div>
      )
    }
  ]

  const cameraStatsColumns = [
    {
      header: 'Camera',
      accessor: 'camera',
      cell: (row) => (
        <div className="flex items-center">
          <Camera className="w-4 h-4 mr-2 text-gray-400" />
          <div>
            <div className="font-medium">{row.camera?.name || 'N/A'}</div>
            <div className="text-xs text-gray-500">{row.camera?.type || ''}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Active Assignments',
      accessor: 'activeAssignments',
      cell: (row) => (
        <span className="text-sm">{row.activeAssignments || 0}</span>
      )
    },
    {
      header: 'Today\'s Punches',
      accessor: 'todayPunches',
      cell: (row) => (
        <span className="text-sm font-medium">{row.todayPunches || 0}</span>
      )
    },
    {
      header: 'Monitoring',
      accessor: 'monitoring',
      cell: (row) => {
        const isMonitoring = monitoringStatus?.some(m => m.cameraId === row.camera?._id?.toString())
        return (
          <div className="flex items-center space-x-2">
            {isMonitoring ? (
              <>
                <span className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm">Active</span>
                </span>
                <button
                  onClick={() => stopCameraMutation.mutate(row.camera?._id)}
                  disabled={stopCameraMutation.isLoading}
                  className="text-xs text-red-600 hover:text-red-800"
                  title="Stop Monitoring"
                >
                  Stop
                </button>
              </>
            ) : (
              <>
                <span className="flex items-center text-gray-400">
                  <XCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm">Inactive</span>
                </span>
                <button
                  onClick={() => startCameraMutation.mutate(row.camera?._id)}
                  disabled={startCameraMutation.isLoading}
                  className="text-xs text-blue-600 hover:text-blue-800"
                  title="Start Monitoring"
                >
                  Start
                </button>
              </>
            )}
          </div>
        )
      }
    },
    {
      header: 'Preview',
      accessor: 'preview',
      cell: (row) => {
        const isMonitoring = monitoringStatus?.some(m => m.cameraId === row.camera?._id?.toString())
        const camera = row.camera
        if (!camera || !camera.isActive) {
          return <span className="text-xs text-gray-400">N/A</span>
        }
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCamera(camera)
              setLiveData(null)
              setStreamError(null)
              // Scroll to preview section
              setTimeout(() => {
                const previewSection = document.getElementById('camera-preview-section')
                if (previewSection) {
                  previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }, 100)
            }}
            className="flex items-center"
            title={isMonitoring ? 'View monitoring preview (live feed with detections)' : 'View camera preview'}
          >
            <Eye className="w-4 h-4 mr-1" />
            {isMonitoring ? 'View Monitoring' : 'View Preview'}
          </Button>
        )
      }
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real-Time Attendance Monitoring</h1>
          <p className="text-gray-600 mt-1">Monitor live attendance and camera status</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoRefresh" className="text-sm text-gray-700">
              Auto Refresh
            </label>
          </div>
          <Button
            variant="secondary"
            onClick={() => refetch()}
            disabled={!autoRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {monitoringStatus && monitoringStatus.length > 0 ? (
            <Button
              variant="danger"
              onClick={() => stopAllMutation.mutate()}
              disabled={stopAllMutation.isLoading}
            >
              <Square className="w-4 h-4 mr-2" />
              Stop All
            </Button>
          ) : (
            <Button
              onClick={() => startAllMutation.mutate()}
              disabled={startAllMutation.isLoading}
            >
              <Play className="w-4 h-4 mr-2" />
              Start All
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {attendanceData?.summary && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
          <div className="card">
            <div className="flex items-center">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Punches</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {attendanceData.summary.totalToday || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="bg-green-500 p-3 rounded-lg">
                <Monitor className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Cameras</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {attendanceData.summary.totalCameras || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="bg-purple-500 p-3 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {attendanceData.summary.totalAssignments || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="bg-orange-500 p-3 rounded-lg">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent (1hr)</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {attendanceData.summary.totalRecent || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Preview Section with SSE Streaming */}
      <div id="camera-preview-section" className="card">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold">Monitoring Preview</h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedCamera && monitoringStatus?.some(m => m.cameraId === selectedCamera._id) ? (
                <>
                  <span className="text-green-600 font-medium">Monitoring Active</span> - Viewing exactly what the monitoring system is processing.
                </>
              ) : (
                'Shows the camera stream that monitoring uses. Start monitoring to enable face recognition processing in the background.'
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Select
              value={selectedCamera?._id || ''}
              onChange={(e) => {
                const camera = cameras?.find(c => c._id === e.target.value)
                if (camera) {
                  // Validate camera before setting
                  if (!camera.isActive) {
                    showToast('Selected camera is not active. Please activate it first.', 'warning')
                    return
                  }
                  if (camera.isUnderMaintenance) {
                    showToast('Selected camera is under maintenance.', 'warning')
                    return
                  }
                  // Check for local webcam types
                  if (['usb_webcam', 'laptop_webcam'].includes(camera.type)) {
                    showToast('Local webcams cannot be previewed from the server. Use the attendance page instead.', 'info')
                    return
                  }
                  
                  // Check if camera is being monitored
                  const isMonitoring = monitoringStatus?.some(m => m.cameraId === camera._id)
                  if (isMonitoring) {
                    showToast('Camera is being monitored in the background. Preview will show live feed.', 'info')
                  }
                }
                setSelectedCamera(camera || null)
                setLiveData(null)
                setStreamError(null)
              }}
              options={[
                { value: '', label: 'Select Camera...' },
                ...(cameras || []).map(camera => {
                  const isMonitoring = monitoringStatus?.some(m => m.cameraId === camera._id)
                  return {
                    value: camera._id,
                    label: `${camera.name}${isMonitoring ? ' (Monitoring)' : ''}`
                  }
                })
              ]}
              className="min-w-[200px]"
            />
            {selectedCamera && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStreamRefresh}
                  disabled={isStreaming && !streamError}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isStreaming && !streamError ? 'animate-spin' : ''}`} />
                  {isStreaming && !streamError ? 'Reconnecting...' : 'Reconnect'}
                </Button>
                <button
                  onClick={() => {
                    setSelectedCamera(null)
                    setLiveData(null)
                    setStreamError(null)
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Close Preview
                </button>
              </>
            )}
          </div>
        </div>
        {selectedCamera ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            {/* Main Preview Area */}
            <div className="lg:col-span-2 space-y-4">
              {/* Camera Preview */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Monitoring View</h3>
                    {selectedCamera && monitoringStatus?.some(m => m.cameraId === selectedCamera._id) && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Monitoring Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    {!liveData?.imageData && !streamError && (
                      <span className="flex items-center">
                        <Loader className="w-4 h-4 animate-spin mr-1" />
                        Connecting...
                      </span>
                    )}
                    {(isStreaming || liveData?.imageData) && !streamError && (
                      <span className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                        Live Streaming
                      </span>
                    )}
                    {streamError && (
                      <span className="flex items-center text-red-600">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Stream Error
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative bg-black min-h-[500px] flex items-center justify-center">
                  {streamError ? (
                    <div className="text-center text-white p-8">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                      <p className="text-lg mb-2">Stream Connection Error</p>
                      <p className="text-sm text-gray-400 mb-4 max-w-md mx-auto">
                        {streamError || 'Camera may be disconnected or the stream was interrupted'}
                      </p>
                      <div className="space-y-2">
                        <Button variant="secondary" onClick={handleStreamRefresh} disabled={isStreaming}>
                          <RefreshCw className={`w-4 h-4 mr-2 ${isStreaming ? 'animate-spin' : ''}`} />
                          {isStreaming ? 'Reconnecting...' : 'Reconnect'}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                          {selectedCamera && monitoringStatus?.some(m => m.cameraId === selectedCamera._id) 
                            ? 'Tip: Monitoring is active. The camera stream may be unstable. Check camera endpoint URL and network connectivity.'
                            : 'Tip: Start monitoring first to ensure the camera stream is active, then view the preview.'}
                        </p>
                        {selectedCamera && !monitoringStatus?.some(m => m.cameraId === selectedCamera._id) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              startCameraMutation.mutate(selectedCamera._id)
                            }}
                            disabled={startCameraMutation.isLoading}
                            className="mt-2"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start Monitoring First
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : liveData?.imageData ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        ref={imageRef}
                        src={liveData.imageData}
                        alt="Live Camera Feed (Monitoring View)"
                        className="max-w-full max-h-[600px] object-contain"
                      />
                      {/* Detection Overlays */}
                      {liveData.detections && liveData.detections.length > 0 && (
                        <>
                          <canvas
                            ref={canvasRef}
                            className="absolute top-0 left-0 w-full h-auto pointer-events-none"
                            style={{ maxHeight: '600px' }}
                          />
                          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 min-w-[200px]">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-2 h-2 rounded-full ${liveData.detections.some(d => d.matched) ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
                              <span className="text-white text-sm font-semibold">
                                {liveData.detections.length} {liveData.detections.length === 1 ? 'Face' : 'Faces'} Detected
                              </span>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                              {liveData.detections.map((detection, idx) => (
                                <div
                                  key={idx}
                                  className={`p-2 rounded border ${
                                    detection.matched 
                                      ? 'bg-green-500/20 border-green-500' 
                                      : 'bg-red-500/20 border-red-500'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1">
                                      {detection.matched ? (
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-red-400" />
                                      )}
                                      <span className="text-white text-xs font-medium">
                                        {detection.employeeName || 'Unknown'}
                                      </span>
                                    </div>
                                    <span className={`text-xs font-medium ${
                                      detection.matched ? 'text-green-300' : 'text-red-300'
                                    }`}>
                                      {(detection.confidence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  {detection.employeeId && (
                                    <p className="text-xs text-gray-300 mt-1">ID: {detection.employeeId}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-white p-8">
                      <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                      <p className="mb-2">
                        {streamError 
                          ? streamError 
                          : isStreaming 
                            ? 'Waiting for frames from camera...' 
                            : 'Connecting to monitoring stream...'}
                      </p>
                      {!streamError && (
                        <div className="text-xs text-gray-400 space-y-1 mt-4">
                          <p>• Ensure monitoring is started for this camera</p>
                          <p>• Verify camera endpoint URL is correct and accessible</p>
                          <p>• Check camera is active and not under maintenance</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Sidebar - Camera Details */}
            <div className="space-y-4">
              {/* Camera Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Camera Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{selectedCamera.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{selectedCamera.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      selectedCamera.isActive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedCamera.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {(() => {
                    const isMonitoring = monitoringStatus?.some(m => m.cameraId === selectedCamera._id)
                    return (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-gray-600">Monitoring:</span>
                        <span className={`font-medium flex items-center ${
                          isMonitoring ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {isMonitoring ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Running in Background
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Not Monitoring
                            </>
                          )}
                        </span>
                      </div>
                    )
                  })()}
                  {selectedCamera.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        Location:
                      </span>
                      <span className="font-medium">{selectedCamera.location?.name || 'N/A'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Detection Stats */}
              {liveData?.detections && liveData.detections.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Face Detections
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">
                        {liveData.detections.filter(d => d.matched).length}
                      </div>
                      <div className="text-sm text-green-700">Matched Employees</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-red-600">
                        {liveData.detections.filter(d => !d.matched).length}
                      </div>
                      <div className="text-sm text-red-700">Unknown Faces</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stream Settings */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Stream Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Frame Rate (ms)
                    </label>
                    <Input
                      type="number"
                      min="500"
                      max="5000"
                      step="100"
                      value={streamRefreshInterval}
                      onChange={(e) => setStreamRefreshInterval(Number(e.target.value))}
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    {streamRefreshInterval >= 1000 
                      ? `${(1000 / streamRefreshInterval).toFixed(1)} fps` 
                      : `${(1000 / streamRefreshInterval).toFixed(1)} fps`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <Eye className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 mb-2">Select a camera from the dropdown to view live preview with face detection</p>
            <p className="text-sm text-gray-400 mb-4">
              {monitoringStatus && monitoringStatus.length > 0 ? (
                <>
                  {monitoringStatus.length} camera{monitoringStatus.length !== 1 ? 's' : ''} currently monitoring in background.
                  <br />
                  Click "View Monitoring" in the table below to see the live feed with face detection overlays.
                </>
              ) : (
                'Monitoring runs in the background on the server. Start monitoring to enable auto punch-in.'
              )}
            </p>
            {monitoringStatus && monitoringStatus.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {monitoringStatus.map((status) => {
                  const camera = cameras?.find(c => c._id === status.cameraId)
                  if (!camera) return null
                  return (
                    <Button
                      key={status.cameraId}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCamera(camera)
                        setLiveData(null)
                        setStreamError(null)
                        setTimeout(() => {
                          const previewSection = document.getElementById('camera-preview-section')
                          if (previewSection) {
                            previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }
                        }, 100)
                      }}
                      className="flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View {camera.name}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Punches */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Punches (Last 1 Hour)</h2>
          <span className="text-sm text-gray-500">
            Auto-refresh: {autoRefresh ? `${refreshInterval}s` : 'Off'}
          </span>
        </div>
        <Table
          data={attendanceData?.recentPunches || []}
          columns={recentColumns}
          isLoading={false}
          emptyMessage="No recent punches in the last hour"
        />
      </div>

      {/* Camera Statistics */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Camera Statistics & Monitoring</h2>
        </div>
        <Table
          data={attendanceData?.cameraStats || []}
          columns={cameraStatsColumns}
          isLoading={false}
          emptyMessage="No cameras configured"
        />
      </div>

      {/* Today's Punches */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Today's Auto Punch-Ins</h2>
        </div>
        <Table
          data={attendanceData?.todayPunches || []}
          columns={recentColumns}
          isLoading={false}
          emptyMessage="No auto punch-ins recorded today"
        />
      </div>
    </div>
  )
}

export default RealTimeAttendance

