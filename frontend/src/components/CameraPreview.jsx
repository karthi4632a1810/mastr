import { useState, useEffect, useRef } from 'react'
import { Camera, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react'
import Button from './Button'
import api from '../services/api'

const CameraPreview = ({ camera, showDetection = true, onFaceDetected }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detections, setDetections] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const intervalRef = useRef(null)
  const tokenRef = useRef(null)
  const videoRef = useRef(null)
  const localStreamRef = useRef(null)

  const isLocalWebcam = ['usb_webcam', 'laptop_webcam'].includes(camera?.type)

  // Always use live streaming; snapshot mode is disabled per requirement
  const isLiveStream = true

  // Extract a human-readable error message even when the API responds with a blob
  const parseErrorMessage = async (err) => {
    try {
      const data = err?.response?.data
      if (!data) return err?.message || 'Failed to load camera feed'

      if (typeof data === 'string') return data
      if (data?.message) return data.message
      if (data?.error) return data.error

      if (data instanceof Blob) {
        const text = await data.text()
        try {
          const parsed = JSON.parse(text)
          return parsed.message || parsed.error || text
        } catch {
          return text || err?.message || 'Failed to load camera feed'
        }
      }

      return err?.message || 'Failed to load camera feed'
    } catch {
      return err?.message || 'Failed to load camera feed'
    }
  }

  const startLiveStream = () => {
    if (isPaused || !camera?._id) return
    const token = localStorage.getItem('token')
    tokenRef.current = token
    if (imageRef.current) {
      const apiBase = import.meta.env.PROD ? 'https://vaalboss.onrender.com' : ''
      const liveUrl = `${apiBase}/api/cameras/${camera._id}/live${token ? `?token=${encodeURIComponent(token)}` : ''}`
      imageRef.current.src = liveUrl
    }
  }

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const startLocalStream = async () => {
    if (!isLocalWebcam || isPaused) return
    try {
      setIsLoading(true)
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      localStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsLoading(false)
    } catch (err) {
      setIsLoading(false)
      setError(err?.message || 'Unable to access local webcam. Please allow camera permissions.')
    }
  }

  // Fetch detections (used for both snapshot and live stream)
  const fetchDetections = async () => {
    if (!camera?._id) return
    try {
      const detectionResponse = await api.get(`/cameras/${camera._id}/live-detections`)
      if (detectionResponse.data?.success) {
        const detectionData = detectionResponse.data.data?.detections || []
        setDetections(detectionData)

        if (onFaceDetected && detectionData.length > 0) {
          onFaceDetected(detectionData)
        }
      }
    } catch (detectionError) {
      const message = await parseErrorMessage(detectionError)
      console.warn('Failed to fetch detections:', message)
      setDetections([])
    }
  }

  // Draw face detection boxes on canvas
  const drawDetections = () => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || !image.complete || !image.naturalWidth) return

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

    // Draw detection boxes
    detections.forEach((detection) => {
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

  // Set up interval for fetching snapshots
  useEffect(() => {
    if (!camera || !camera.isActive) return

    // Local webcam: use browser media API
    if (isLocalWebcam) {
      startLocalStream()
      return () => {
        stopLocalStream()
      }
    }

    // Remote/live stream cameras
    startLiveStream()
    setIsLoading(false)
    // Poll detections periodically while streaming
    if (showDetection) {
      intervalRef.current = setInterval(() => {
        fetchDetections()
      }, 2000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      // Clean up image URLs
      if (imageRef.current?.dataset?.oldUrl) {
        URL.revokeObjectURL(imageRef.current.dataset.oldUrl)
      }
    }
  }, [camera?._id, camera?.isActive, isPaused, isLocalWebcam])

  // Redraw detections when image loads or detections change (only for remote streams)
  useEffect(() => {
    if (isLocalWebcam) return
    const image = imageRef.current
    if (!image) return

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

    return () => {
      image.removeEventListener('load', redraw)
      resizeObserver.disconnect()
    }
  }, [detections, isLocalWebcam])

  const handleImageLoad = () => {
    drawDetections()
  }

  const handleImageError = () => {
    setError('Failed to load live stream')
    // Attempt a lightweight retry
    setTimeout(() => {
      startLiveStream()
    }, 2000)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (!camera) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <Camera className="w-12 h-12 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-500">No camera selected</p>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden"
      style={{ minHeight: '400px' }}
    >
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center space-x-2">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-2 bg-black/50 rounded text-white hover:bg-black/70 transition-colors"
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 bg-black/50 rounded text-white hover:bg-black/70 transition-colors"
          title="Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Camera Info */}
      <div className="absolute top-2 left-2 z-10 bg-black/50 rounded px-3 py-1 text-white text-sm">
        <div className="font-medium">{camera.name}</div>
        {showDetection && (
          <div className="text-xs text-gray-300">
            {detections.length} face{detections.length !== 1 ? 's' : ''} detected
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Loading camera feed...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center text-white">
            <Camera className="w-12 h-12 mx-auto mb-2 text-red-400" />
            <p className="text-sm">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setError(null)
                startLiveStream()
              }}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Paused Overlay */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
          <div className="text-center text-white">
            <EyeOff className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">Paused</p>
          </div>
        </div>
      )}

      {/* Image/Video and Canvas */}
      <div className="relative w-full h-full">
        {isLocalWebcam ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-auto max-h-full object-contain"
            style={{ display: isLoading ? 'none' : 'block' }}
          />
        ) : (
          <>
            <img
              ref={imageRef}
              src=""
              alt={camera.name}
              className="w-full h-auto max-h-full object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
            {showDetection && (
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-auto pointer-events-none"
                style={{ maxHeight: '100%' }}
              />
            )}
          </>
        )}
      </div>

      {/* Detection Legend */}
      {!isLocalWebcam && showDetection && detections.length > 0 && (
        <div className="absolute bottom-2 left-2 z-10 bg-black/70 rounded px-3 py-2 text-white text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 border-2 border-green-500"></div>
              <span>Matched</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 border-2 border-red-500"></div>
              <span>Unknown</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CameraPreview

