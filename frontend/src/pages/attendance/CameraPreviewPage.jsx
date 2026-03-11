import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { 
  Camera, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader,
  FileText,
  MapPin,
  Settings,
  Users,
  Eye,
  EyeOff
} from 'lucide-react'
import Button from '../../components/Button'

const CameraPreviewPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [isPaused, setIsPaused] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(1000) // 1 second default for real-time
  const [liveData, setLiveData] = useState(null)
  const [streamError, setStreamError] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const eventSourceRef = useRef(null)
  const imageRef = useRef(null)

  // Fetch camera details
  const { data: camera, isLoading: cameraLoading } = useQuery({
    queryKey: ['camera', id],
    queryFn: async () => {
      const response = await api.get(`/cameras/${id}`)
      return response.data.data
    },
    enabled: !!id
  })

  // Check monitoring status before connecting
  const { data: monitoringStatus } = useQuery({
    queryKey: ['monitoring-status', id],
    queryFn: async () => {
      try {
        const response = await api.get('/camera-monitoring/status')
        return response.data
      } catch (error) {
        console.error('Error fetching monitoring status:', error)
        return { data: [] }
      }
    },
    enabled: !!id && !isPaused,
    refetchInterval: 5000 // Check every 5 seconds
  })

  const isMonitoringActive = monitoringStatus?.data?.some(m => m.cameraId === id)

  // Real-time streaming using Server-Sent Events (SSE)
  useEffect(() => {
    if (!id || isPaused || !camera) return

    // Check if monitoring is active before connecting
    if (!isMonitoringActive) {
      setStreamError('Camera monitoring is not active. Please start monitoring first from the Real-Time Attendance page.')
      setIsStreaming(false)
      return
    }

    // Get auth token for SSE request
    const token = localStorage.getItem('token')
    if (!token) {
      setStreamError('Authentication required')
      return
    }

    // Create EventSource for SSE stream (token passed as query param since EventSource doesn't support headers)
    // Use the same base URL as the API service
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://vaalboss.onrender.com' : window.location.origin)
    const streamUrl = `${apiBase}/api/cameras/${id}/live-stream?interval=${refreshInterval}&token=${encodeURIComponent(token)}`
    
    const eventSource = new EventSource(streamUrl)

    eventSourceRef.current = eventSource
    setIsStreaming(true)
    setStreamError(null)

    eventSource.onopen = () => {
      console.log('SSE connection opened')
      setIsStreaming(true)
      setStreamError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          console.log('Stream connected:', data.message)
          // Initialize with model info from connection message
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
        } else if (data.type === 'error') {
          setStreamError(data.message)
          setIsStreaming(false)
          // Close connection on error to prevent infinite reconnection
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
          }
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      
      // Check if connection is closed (readyState 2 = CLOSED)
      if (eventSource.readyState === EventSource.CLOSED) {
        setStreamError('Stream connection closed. Please ensure monitoring is active and try reconnecting.')
        setIsStreaming(false)
        // Don't let EventSource auto-reconnect if we know it's closed
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        // Still connecting, don't show error yet
        setStreamError('Connecting to stream...')
      } else {
        // Connection error
        setStreamError('Stream connection error. Please ensure monitoring is active.')
        setIsStreaming(false)
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsStreaming(false)
    }
  }, [id, isPaused, refreshInterval, camera, isMonitoringActive])

  const handleRefresh = () => {
    // Close and reopen stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    setLiveData(null)
    setStreamError(null)
    showToast('Reconnecting stream...', 'info')
  }

  if (cameraLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading camera...</p>
        </div>
      </div>
    )
  }

  if (!camera) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-gray-600 mb-4">Camera not found</p>
          <Button onClick={() => navigate('/cameras')}>Back to Cameras</Button>
        </div>
      </div>
    )
  }

  const detections = liveData?.detections || []
  const imageData = liveData?.imageData
  const modelInfo = liveData?.modelInfo || {}
  const hasError = !!streamError
  const isLocalWebcam = camera?.type === 'usb_webcam' || camera?.type === 'laptop_webcam'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/cameras')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Face Detection</h1>
            <p className="text-gray-600">{camera.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={isStreaming && !hasError}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isStreaming && !hasError ? 'animate-spin' : ''}`} />
            {isStreaming && !hasError ? 'Reconnecting...' : 'Reconnect'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Preview Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Camera Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-gray-600" />
                <h2 className="font-semibold text-gray-900">Live Detection</h2>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {!isStreaming && !hasError && (
                  <span className="flex items-center">
                    <Loader className="w-4 h-4 animate-spin mr-1" />
                    Connecting...
                  </span>
                )}
                {isStreaming && !hasError && (
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                    Live Streaming
                  </span>
                )}
                {hasError && (
                  <span className="flex items-center text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Stream Error
                  </span>
                )}
              </div>
            </div>
            <div className="relative bg-black min-h-[500px] flex items-center justify-center">
              {isLocalWebcam ? (
                <div className="text-center text-white p-8">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                  <p className="text-lg mb-2">Local Webcam Detected</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Local webcams (USB/Laptop) cannot be previewed from the server.
                    <br />
                    Please use the browser's camera API directly in the attendance page.
                  </p>
                  <Button 
                    variant="secondary" 
                    onClick={() => navigate('/attendance')}
                  >
                    Go to Attendance Page
                  </Button>
                </div>
              ) : hasError ? (
                <div className="text-center text-white p-8">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                  <p className="text-lg mb-2">Stream Connection Error</p>
                  <p className="text-sm text-gray-400 mb-4 max-w-md mx-auto">
                    {streamError || 'Camera may be disconnected or the stream was interrupted'}
                  </p>
                  {streamError?.includes('monitoring is not active') ? (
                    <div className="flex flex-col items-center gap-2">
                      <Button 
                        variant="secondary" 
                        onClick={() => navigate('/attendance?tab=realtime')}
                      >
                        Go to Real-Time Attendance
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        Start monitoring from the Real-Time Attendance page to view the live preview.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Button variant="secondary" onClick={handleRefresh} disabled={isStreaming}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isStreaming ? 'animate-spin' : ''}`} />
                        {isStreaming ? 'Reconnecting...' : 'Reconnect'}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        {!isMonitoringActive 
                          ? 'Please ensure monitoring is active. If the issue persists, check the camera connection.'
                          : 'The stream will automatically reconnect. If the issue persists, check the camera connection.'}
                      </p>
                    </div>
                  )}
                </div>
              ) : imageData ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    ref={imageRef}
                    src={imageData}
                    alt="Live Camera Feed"
                    className="max-w-full max-h-[600px] object-contain"
                  />
                  {/* Detection Overlays */}
                  {detections.length > 0 && (
                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 min-w-[200px]">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${detections.some(d => d.matched) ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
                        <span className="text-white text-sm font-semibold">
                          {detections.length} {detections.length === 1 ? 'Face' : 'Faces'} Detected
                        </span>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {detections.map((detection, idx) => (
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
                            {/* Show diagnostic info if match is below threshold */}
                            {detection.bestMatchInfo && !detection.matched && (
                              <div className="mt-2 pt-2 border-t border-gray-400">
                                <p className="text-xs text-yellow-300">
                                  Best match: {detection.bestMatchInfo.name} ({detection.bestMatchInfo.similarity ? (detection.bestMatchInfo.similarity * 100).toFixed(1) : 'N/A'}%)
                                </p>
                                <p className="text-xs text-gray-400">
                                  Threshold: {(detection.bestMatchInfo.threshold * 100).toFixed(0)}% | 
                                  Need: {((detection.bestMatchInfo.threshold - (detection.bestMatchInfo.similarity || 0)) * 100).toFixed(1)}% more
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-white">
                  <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading live feed...</p>
                </div>
              )}
            </div>
          </div>

          {/* Detection Stats */}
          {detections.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Face Detections
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {detections.filter(d => d.matched).length}
                  </div>
                  <div className="text-sm text-green-700">Matched Employees</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">
                    {detections.filter(d => !d.matched).length}
                  </div>
                  <div className="text-sm text-red-700">Unknown Faces</div>
                </div>
              </div>
              {detections.length > 0 && (
                <div className="mt-4 space-y-2">
                  {detections.map((detection, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        detection.matched ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {detection.employeeName || 'Unknown Person'}
                          </div>
                          {detection.employeeId && (
                            <div className="text-sm text-gray-600">ID: {detection.employeeId}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {(detection.confidence * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-600">Confidence</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Model Info & Camera Details */}
        <div className="space-y-4">
          {/* Model Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Model Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`flex items-center text-sm font-medium ${
                  modelInfo.loaded ? 'text-green-600' : 'text-red-600'
                }`}>
                  {modelInfo.loaded ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Loaded
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-1" />
                      Not Loaded
                    </>
                  )}
                </span>
              </div>
              {modelInfo.detector && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Detector:</span>
                  <span className="text-sm font-medium text-gray-900">{modelInfo.detector}</span>
                </div>
              )}
              {modelInfo.localPath && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Local Model Path:</div>
                  <div className="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded break-all">
                    {modelInfo.localPath}
                  </div>
                </div>
              )}
              {modelInfo.faceApiModelsPath && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Face-API Models Path:</div>
                  <div className="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded break-all">
                    {modelInfo.faceApiModelsPath}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-600">Models Exist:</span>
                <span className={`text-sm font-medium ${
                  modelInfo.modelsExist ? 'text-green-600' : 'text-red-600'
                }`}>
                  {modelInfo.modelsExist ? 'Yes' : 'No'}
                </span>
              </div>
              {modelInfo.hasTinyDetector !== undefined && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Model Availability:</div>
                  <div className="text-xs space-y-1">
                    <div className={`${modelInfo.hasTinyDetector ? 'text-green-600' : 'text-gray-400'}`}>
                      • tiny_face_detector: {modelInfo.hasTinyDetector ? '✓' : '✗'}
                    </div>
                    <div className={`${modelInfo.hasSsdDetector ? 'text-green-600' : 'text-gray-400'}`}>
                      • ssd_mobilenetv1: {modelInfo.hasSsdDetector ? '✓' : '✗'}
                    </div>
                    <div className={`${modelInfo.hasLandmark ? 'text-green-600' : 'text-gray-400'}`}>
                      • face_landmark_68: {modelInfo.hasLandmark ? '✓' : '✗'}
                    </div>
                    <div className={`${modelInfo.hasRecognition ? 'text-green-600' : 'text-gray-400'}`}>
                      • face_recognition: {modelInfo.hasRecognition ? '✓' : '✗'}
                    </div>
                  </div>
                </div>
              )}
              {modelInfo.error && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    Error: {modelInfo.error}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Camera Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Camera Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{camera.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{camera.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  camera.isActive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {camera.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {camera.location && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    Location:
                  </span>
                  <span className="font-medium">{camera.location?.name || 'N/A'}</span>
                </div>
              )}
              {camera?.endpointUrl && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Endpoint URL:</div>
                  <div className="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded break-all">
                    {camera.endpointUrl}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Refresh Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Refresh Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Frame Rate (ms)
                </label>
                <input
                  type="number"
                  min="500"
                  max="5000"
                  step="100"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="text-xs text-gray-500">
                {refreshInterval >= 1000 
                  ? `${(1000 / refreshInterval).toFixed(1)} fps` 
                  : `${(1000 / refreshInterval).toFixed(1)} fps`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CameraPreviewPage

