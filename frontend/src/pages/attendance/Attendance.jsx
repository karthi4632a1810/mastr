import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { Clock, Calendar, TrendingUp, AlertCircle, MapPin, Navigation, AlertTriangle, Shield, Check, X } from 'lucide-react'
import Button from '../../components/Button'
import Table from '../../components/Table'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Circle, Marker, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { useRole } from '../../hooks/useRole'

const Attendance = () => {
  const { user } = useAuth()
  const { isAdmin, isHR } = useRole()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [userLocation, setUserLocation] = useState(null)
  const [gpsError, setGpsError] = useState('')
  const [distanceFromCenter, setDistanceFromCenter] = useState(null)
  const [insideZone, setInsideZone] = useState(false)
  const [overrideAllowed, setOverrideAllowed] = useState(false)
  const [overrideRequiresApproval, setOverrideRequiresApproval] = useState(false)
  const [regDate, setRegDate] = useState(new Date().toISOString().slice(0, 10))
  const [regPunchIn, setRegPunchIn] = useState('')
  const [regPunchOut, setRegPunchOut] = useState('')
  const [regReason, setRegReason] = useState('')

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-')
      const response = await api.get('/attendance/calendar', { 
        params: { month: parseInt(month), year: parseInt(year) } 
      })
      return response.data
    },
  })

  const { data: summary } = useQuery({
    queryKey: ['attendance-summary', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const endDate = `${year}-${month}-${new Date(year, month, 0).getDate()}`
      const response = await api.get('/attendance/summary', { 
        params: { startDate, endDate } 
      })
      return response.data.data
    },
  })

  // Fetch applicable geo-fence for employee (fallback to first active)
  const { data: geoFenceData } = useQuery({
    queryKey: ['employee-geofence'],
    queryFn: async () => {
      const res = await api.get('/geofences/my-fences', { params: { isActive: true } })
      return res.data?.data || []
    },
    retry: 1,
  })

  // Fetch attendance mode configuration for current employee
  const { data: attendanceModeConfig } = useQuery({
    queryKey: ['my-attendance-mode-config'],
    queryFn: async () => {
      const response = await api.get('/attendance-modes/my-config')
      return response.data.data
    },
  })

  // Check if employee has auto punch-in enabled (via camera assignments)
  // Backend automatically filters to current employee's assignments
  const { data: autoPunchInEnabled } = useQuery({
    queryKey: ['my-auto-punch-in-status'],
    queryFn: async () => {
      try {
        const response = await api.get('/camera-assignments', { 
          params: { autoPunchInEnabled: true, isActive: true } 
        })
        const assignments = response.data?.data || []
        // Check if there's at least one active assignment with auto punch-in enabled
        return assignments.some(a => a.isActive && a.autoPunchInEnabled)
      } catch (error) {
        // If 403 or other error, assume auto punch-in is not enabled
        return false
      }
    },
    enabled: !!user
  })

  const activeGeoFence = useMemo(() => {
    if (!geoFenceData?.length) return null
    // pick the first active fence for now
    return geoFenceData.find(f => f.isActive && f.enforcement?.isEnabled) || geoFenceData[0]
  }, [geoFenceData])

  useEffect(() => {
    if (!activeGeoFence) return
    setOverrideAllowed(activeGeoFence.overrideRules?.allowPunchOutside || false)
    setOverrideRequiresApproval(activeGeoFence.overrideRules?.requireApprovalForExternalPunch || false)
  }, [activeGeoFence])

  // Haversine distance in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3
    const toRad = (deg) => (deg * Math.PI) / 180
    const φ1 = toRad(lat1)
    const φ2 = toRad(lat2)
    const Δφ = toRad(lat2 - lat1)
    const Δλ = toRad(lon2 - lon1)
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Track live location
  useEffect(() => {
    if (!activeGeoFence || !navigator.geolocation) {
      if (!navigator.geolocation) {
        setGpsError('GPS not supported on this device. Trying IP-based location...')
        fetchIpLocation()
      }
      return
    }

    const fetchIpLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        if (data?.latitude && data?.longitude) {
          const loc = { latitude: data.latitude, longitude: data.longitude }
          setUserLocation(loc)
          setGpsError('Using coarse IP-based location.')

          if (activeGeoFence?.location?.latitude && activeGeoFence?.location?.longitude) {
            const dist = calculateDistance(
              loc.latitude,
              loc.longitude,
              activeGeoFence.location.latitude,
              activeGeoFence.location.longitude
            )
            setDistanceFromCenter(dist)
            setInsideZone(dist <= (activeGeoFence.radius || 0))
          }
        }
      } catch (err) {
        console.error('IP-based location failed', err)
      }
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const loc = { latitude, longitude }
        setUserLocation(loc)
        setGpsError('')

        if (activeGeoFence?.location?.latitude && activeGeoFence?.location?.longitude) {
          const dist = calculateDistance(
            latitude,
            longitude,
            activeGeoFence.location.latitude,
            activeGeoFence.location.longitude
          )
          setDistanceFromCenter(dist)
          setInsideZone(dist <= (activeGeoFence.radius || 0))
        }
      },
      (err) => {
        const messages = {
          1: 'Location blocked. Please allow access in your browser settings.',
          2: 'Position unavailable. Turn on GPS/Wi‑Fi and try again.',
          3: 'Location request timed out. Please retry; high precision not required.',
        }
        const message =
          messages[err?.code] ||
          'Unable to fetch location. Ensure HTTPS/localhost and device location are enabled.'
        setGpsError(message)
        console.error('GPS error', err)
        fetchIpLocation()
      },
      {
        enableHighAccuracy: false, // allow faster, coarse fixes
        timeout: 20000,            // give more time before timing out
        maximumAge: 60000          // allow cached location up to 1 minute old
      }
    )

    return () => {
      if (id && navigator.geolocation) {
        navigator.geolocation.clearWatch(id)
      }
    }
  }, [activeGeoFence])

  const punchMutation = useMutation({
    mutationFn: async ({ type, method, location }) => {
      return api.post('/attendance/punch', { type, method, location })
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['attendance'])
      queryClient.invalidateQueries(['attendance-summary'])
      showToast(response.data.message || 'Punch recorded successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to record punch', 'error')
    },
  })

  const { data: regularizations, isLoading: isRegLoading } = useQuery({
    queryKey: ['attendance-regularizations'],
    queryFn: async () => {
      const res = await api.get('/attendance/regularizations')
      return res.data?.data || []
    },
  })

  const regularizationCreateMutation = useMutation({
    mutationFn: async (payload) => api.post('/attendance/regularizations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-regularizations'])
      queryClient.invalidateQueries(['attendance'])
      showToast('Regularization submitted', 'success')
      setRegPunchIn('')
      setRegPunchOut('')
      setRegReason('')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to submit regularization', 'error')
    },
  })

  const regularizationReviewMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }) =>
      api.put(`/attendance/regularizations/${id}/status`, { status, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-regularizations'])
      queryClient.invalidateQueries(['attendance'])
      showToast('Regularization updated', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update regularization', 'error')
    },
  })

  const handlePunch = (type, method = 'manual') => {
    // For punch-out, method can be: face_manual, geo, otp, hr_override, manual, kiosk
    if (type === 'punch_out') {
      // Default to manual for now, can be extended with method selection UI
      method = 'manual';
    }

    // Manual mode doesn't require GPS/location
    // Only require location for geo-fence enabled modes or when geo-fence is required
    const requiresLocation = method !== 'manual' && method !== 'hr_override' && 
                             (attendanceModeConfig?.config?.geoFence?.enabled || 
                              attendanceModeConfig?.config?.hybrid?.enabled);
    
    if (!userLocation && requiresLocation) {
      showToast('Please enable GPS/location to punch.', 'error')
      return
    }

    // Only validate geo-fence if location is required and provided
    if (userLocation && activeGeoFence && !insideZone && !overrideAllowed && method !== 'hr_override' && method !== 'manual') {
      showToast('You are outside the allowed punch area.', 'error')
      return
    }

    punchMutation.mutate({
      type,
      method,
      location: userLocation ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      } : null
    })
  }

  const calendarData = useMemo(() => {
    if (!attendance?.data) return []
    return [...attendance.data].sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [attendance])

  const todayRecord = useMemo(() => {
    const today = new Date().toDateString()
    return calendarData.find(record => new Date(record.date).toDateString() === today)
  }, [calendarData])

  const statusLabels = {
    present: 'Present',
    absent: 'Absent',
    leave: 'Leave',
    holiday: 'Holiday',
    weekoff: 'Weekoff',
    weekend: 'Weekoff',
    half_day: 'Half Day'
  }

  const statusStyles = {
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    leave: 'bg-blue-100 text-blue-800',
    holiday: 'bg-purple-100 text-purple-800',
    weekoff: 'bg-gray-100 text-gray-800',
    weekend: 'bg-gray-100 text-gray-800',
    half_day: 'bg-yellow-100 text-yellow-800'
  }

  const regularizationStyles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  }

  const formatStatusLabel = (status) => {
    if (!status) return 'Unknown'
    return statusLabels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
  }

  const regStatusStyles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  }

  const handleRegularizationSubmit = (e) => {
    e.preventDefault()
    if (!regDate || (!regPunchIn && !regPunchOut) || !regReason) {
      showToast('Date, reason, and a corrected punch time are required', 'error')
      return
    }
    const payload = {
      date: regDate,
      requestedPunchIn: regPunchIn ? `${regDate}T${regPunchIn}:00` : null,
      requestedPunchOut: regPunchOut ? `${regDate}T${regPunchOut}:00` : null,
      reason: regReason
    }
    regularizationCreateMutation.mutate(payload)
  }

  const handleReview = (id, status) => {
    let rejectionReason = ''
    if (status === 'rejected') {
      rejectionReason = window.prompt('Reason for rejection?') || ''
    }
    regularizationReviewMutation.mutate({ id, status, rejectionReason })
  }

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (value, row) => {
        const date = row?.date || value
        if (!date) return '-'
        try {
          return new Date(date).toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })
        } catch (error) {
          return '-'
        }
      }
    },
    {
      key: 'punchIn',
      header: 'Punch In',
      render: (value, row) => {
        if (!row) return '-'
        const punches = row.punches || []
        const punchIn = punches.find(p => p.type === 'punch_in')
        if (!punchIn) return '-'
        try {
          const time = new Date(punchIn.time).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
          const method = punchIn.method || 'manual'
          const methodLabel = method === 'face_auto' ? ' (Auto)' : method === 'face_manual' ? ' (Face)' : ''
          return (
            <div>
              <div>{time}{methodLabel}</div>
              {punchIn.faceMatch?.matched && (
                <div className="text-xs text-green-600">
                  Face: {(punchIn.faceMatch.matchScore * 100).toFixed(0)}%
                </div>
              )}
            </div>
          )
        } catch (error) {
          return '-'
        }
      }
    },
    {
      key: 'punchOut',
      header: 'Punch Out',
      render: (value, row) => {
        if (!row) return '-'
        const punches = row.punches || []
        const punchOut = punches.find(p => p.type === 'punch_out')
        if (!punchOut) return '-'
        try {
          const time = new Date(punchOut.time).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
          const method = punchOut.method || 'manual'
          const methodLabels = {
            'face_manual': ' (Face)',
            'geo': ' (Geo)',
            'otp': ' (OTP)',
            'hr_override': ' (HR Override)',
            'kiosk': ' (Kiosk)',
            'manual': ''
          }
          return (
            <div>
              <div>{time}{methodLabels[method] || ''}</div>
              {punchOut.approvalMetadata && (
                <div className="text-xs text-blue-600">
                  HR Override
                </div>
              )}
            </div>
          )
        } catch (error) {
          return '-'
        }
      }
    },
    {
      key: 'hours',
      header: 'Working Hours',
      render: (value, row) => {
        const hours = row?.workingHours || value || 0
        return `${Number(hours).toFixed(2)} hrs`
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, row) => {
        if (!row) return '-'
        const status = row.status || value
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}
            >
              {formatStatusLabel(status)}
              {row.leaveType?.name ? ` · ${row.leaveType.name}` : ''}
            </span>
            {row.isLate && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                Late
              </span>
            )}
            {(row.regularizationStatus || row.regularizationRequest?.status) && (
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${regularizationStyles[row.regularizationStatus || row.regularizationRequest?.status] || 'bg-gray-100 text-gray-800'}`}
              >
                {formatStatusLabel(row.regularizationStatus || row.regularizationRequest?.status)}
              </span>
            )}
          </div>
        )
      }
    },
  ]

  const statusChip = () => {
    if (!activeGeoFence) return null
    let label = 'Outside Zone'
    let color = 'bg-red-100 text-red-800'
    if (insideZone) {
      label = 'Inside Zone'
      color = 'bg-green-100 text-green-800'
    } else if (overrideAllowed) {
      label = 'Override Allowed'
      color = 'bg-orange-100 text-orange-800'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
        {label}
      </span>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600 mt-1">Track your daily attendance</p>
        </div>
      </div>

      {/* Attendance Mode Configuration Info */}
      {attendanceModeConfig && (
        <div className="card mb-6 bg-blue-50 border border-blue-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Your Attendance Mode</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Based on your department ({attendanceModeConfig.employee?.department || 'N/A'}) and location ({attendanceModeConfig.employee?.branch || 'N/A'})
              </p>
              <div className="flex flex-wrap gap-2">
                {attendanceModeConfig.config?.faceRecognition?.enabled && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center">
                    <Shield className="h-3 w-3 mr-1" />
                    Face Recognition {attendanceModeConfig.config.faceRecognition.required && '(Required)'}
                  </span>
                )}
                {attendanceModeConfig.config?.geoFence?.enabled && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    Geo-Fence {attendanceModeConfig.config.geoFence.required && '(Required)'}
                  </span>
                )}
                {attendanceModeConfig.config?.hybrid?.enabled && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Hybrid Mode ({attendanceModeConfig.config.hybrid.mode === 'or' ? 'OR' : 'AND'})
                  </span>
                )}
                {attendanceModeConfig.config?.manualOverride?.enabled && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 flex items-center">
                    <Check className="h-3 w-3 mr-1" />
                    Manual Override Allowed
                  </span>
                )}
                {!attendanceModeConfig.config?.faceRecognition?.enabled && 
                 !attendanceModeConfig.config?.geoFence?.enabled && 
                 !attendanceModeConfig.config?.hybrid?.enabled && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Standard Mode (No special requirements)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Punch panel - Show different UI based on attendance mode */}
      {attendanceModeConfig?.config?.geoFence?.enabled || attendanceModeConfig?.config?.hybrid?.enabled ? (
        /* Geo-fence awareness & punch panel - Only show if geo-fence is enabled */
        <div className="card mb-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="lg:w-2/3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary-600" />
                  <span className="font-semibold text-gray-800">Geo-Fence Awareness</span>
                </div>
                {statusChip()}
              </div>

            <div className="border rounded-lg overflow-hidden h-[320px]">
              {activeGeoFence ? (
                <MapContainer
                  key={`emp-map-${activeGeoFence._id}`}
                  center={[
                    activeGeoFence.location?.latitude || 28.6139,
                    activeGeoFence.location?.longitude || 77.2090
                  ]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {/* Geo-fence center - Red marker */}
                  {activeGeoFence.location && (
                    <>
                      <Marker
                        position={[activeGeoFence.location.latitude, activeGeoFence.location.longitude]}
                        icon={L.divIcon({
                          className: 'custom-marker',
                          html: `<div style="
                            background-color: #ef4444;
                            width: 28px;
                            height: 28px;
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            border: 3px solid white;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                          "></div>`,
                          iconSize: [28, 28],
                          iconAnchor: [14, 28],
                          popupAnchor: [0, -28]
                        })}
                      />
                      <Circle
                        center={[activeGeoFence.location.latitude, activeGeoFence.location.longitude]}
                        radius={activeGeoFence.radius || 0}
                        pathOptions={{
                          color: '#22c55e',
                          fillColor: '#22c55e',
                          fillOpacity: 0.15,
                          weight: 2
                        }}
                      />
                    </>
                  )}

                  {/* Employee live location - Blue marker */}
                  {userLocation && (
                    <CircleMarker
                      center={[userLocation.latitude, userLocation.longitude]}
                      radius={9}
                      pathOptions={{
                        color: '#2563eb',
                        fillColor: '#2563eb',
                        fillOpacity: 0.9
                      }}
                      className="pulse-dot"
                    />
                  )}
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50 text-sm text-gray-600">
                  Geo-fence info not available
                </div>
              )}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Company Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                <span>Your Live Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Geo-Fence Boundary</span>
              </div>
            </div>
          </div>

          <div className="lg:w-1/3 space-y-3">
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Punch Eligibility</span>
                {statusChip()}
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                {distanceFromCenter !== null && activeGeoFence && (insideZone ? (
                  <p className="text-green-700 font-medium">You are inside the allowed zone.</p>
                ) : (
                  <p className="text-red-700 font-medium">
                    You are {Math.max(0, Math.round(distanceFromCenter - (activeGeoFence.radius || 0)))}m outside the zone.
                  </p>
                ))}
                {gpsError && (
                  <p className="text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> {gpsError}
                  </p>
                )}
                {!gpsError && !userLocation && (
                  <p className="text-gray-600 flex items-center gap-1">
                    <Navigation className="h-4 w-4" /> Fetching your location...
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {autoPunchInEnabled ? (
                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Automatic Punch-In Enabled</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Your punch-in is automatic via face recognition. You don't need to manually punch in.
                  </p>
                  {todayRecord?.punches?.some(p => p.type === 'punch_in') && (
                    <p className="text-sm text-green-700 mt-2 font-medium">
                      ✓ Already punched in today
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => handlePunch('punch_in', 'manual')}
                  disabled={
                    punchMutation.isLoading ||
                    todayRecord?.punches?.some(p => p.type === 'punch_in') ||
                    ((attendanceModeConfig?.config?.geoFence?.enabled || attendanceModeConfig?.config?.hybrid?.enabled) && 
                     activeGeoFence && !insideZone && !overrideAllowed && userLocation)
                  }
                  isLoading={punchMutation.isLoading}
                  className="w-full"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {attendanceModeConfig?.config?.faceRecognition?.enabled ? 'Punch In' : 'Punch In (Manual)'}
                </Button>
              )}
              {todayRecord?.punches?.some(p => p.type === 'punch_out') ? (
                <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-900">Already Punched Out</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    You have already punched out for today.
                  </p>
                </div>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => handlePunch('punch_out', 'manual')}
                  disabled={
                    punchMutation.isLoading ||
                    !todayRecord?.punches?.some(p => p.type === 'punch_in') ||
                    ((attendanceModeConfig?.config?.geoFence?.enabled || attendanceModeConfig?.config?.hybrid?.enabled) && 
                     activeGeoFence && !insideZone && !overrideAllowed && userLocation)
                  }
                  isLoading={punchMutation.isLoading}
                  className="w-full"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {attendanceModeConfig?.config?.faceRecognition?.enabled ? 'Punch Out' : 'Punch Out (Manual)'}
                </Button>
              )}
              {!insideZone && overrideAllowed && (
                <Button
                  variant="secondary"
                  onClick={() => showToast('External punch approval requested', 'success')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Request External Punch Approval
                  {overrideRequiresApproval && <span className="text-orange-600 text-xs">(Pending approval)</span>}
                </Button>
              )}
            </div>
          </div>
          </div>
        </div>
      ) : (
        /* Simple punch panel for face-only or standard mode */
        <div className="card mb-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {attendanceModeConfig?.config?.faceRecognition?.enabled 
                  ? 'Face Recognition Mode' 
                  : 'Standard Attendance Mode'}
              </h3>
              <p className="text-sm text-gray-600">
                {attendanceModeConfig?.config?.faceRecognition?.enabled
                  ? 'Use face recognition or manual punch to record your attendance. Manual mode does not require GPS/location.'
                  : 'Use the buttons below to record your attendance. Manual mode does not require GPS/location.'}
              </p>
            </div>
            <div className="flex gap-4 w-full max-w-md">
              {autoPunchInEnabled ? (
                <div className="flex-1 p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Automatic Punch-In</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Your punch-in is automatic via face recognition.
                  </p>
                  {todayRecord?.punches?.some(p => p.type === 'punch_in') && (
                    <p className="text-sm text-green-700 mt-2 font-medium">
                      ✓ Already punched in today
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => handlePunch('punch_in', 'manual')}
                  disabled={
                    punchMutation.isLoading ||
                    todayRecord?.punches?.some(p => p.type === 'punch_in')
                  }
                  isLoading={punchMutation.isLoading}
                  className="flex-1"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {attendanceModeConfig?.config?.faceRecognition?.enabled ? 'Punch In' : 'Punch In (Manual)'}
                </Button>
              )}
              {todayRecord?.punches?.some(p => p.type === 'punch_out') ? (
                <div className="flex-1 p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-900">Already Punched Out</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    You have already punched out for today.
                  </p>
                </div>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => handlePunch('punch_out', 'manual')}
                  disabled={
                    punchMutation.isLoading ||
                    !todayRecord?.punches?.some(p => p.type === 'punch_in')
                  }
                  isLoading={punchMutation.isLoading}
                  className="flex-1"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {attendanceModeConfig?.config?.faceRecognition?.enabled ? 'Punch Out' : 'Punch Out (Manual)'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 mb-6">
          <div className="card">
            <div className="flex items-center">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Days</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.totalDays || 0}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="bg-green-500 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Present</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.present || 0}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="bg-red-500 p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.absent || 0}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="bg-purple-500 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.totalWorkingHours?.toFixed(1) || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Month Selector */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Attendance Calendar</h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input w-auto"
          />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card">
        <Table
          columns={columns}
          data={calendarData}
          isLoading={isLoading}
          emptyMessage="No attendance records found for this month"
        />
      </div>

      {/* Regularization Request */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Attendance Regularization</h2>
            <p className="text-sm text-gray-600">Request corrections to your attendance</p>
          </div>
        </div>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" onSubmit={handleRegularizationSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date<span className="text-red-500 ml-1">*</span></label>
              <input
                type="date"
                className="input"
                value={regDate}
                onChange={(e) => setRegDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corrected Punch In</label>
              <input
                type="time"
                className="input"
                value={regPunchIn}
                onChange={(e) => setRegPunchIn(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corrected Punch Out</label>
              <input
                type="time"
                className="input"
                value={regPunchOut}
                onChange={(e) => setRegPunchOut(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason<span className="text-red-500 ml-1">*</span></label>
            <textarea
              className="input min-h-[120px]"
              value={regReason}
              onChange={(e) => setRegReason(e.target.value)}
              required
            />
            <div className="mt-3">
              <Button
                type="submit"
                isLoading={regularizationCreateMutation.isLoading}
              >
                Submit Regularization
              </Button>
            </div>
          </div>
        </form>

        <Table
          columns={[
            {
              key: 'date',
              header: 'Date',
              render: (value, row) => {
                const date = row?.date || value
                if (!date) return '-'
                try {
                  return new Date(date).toLocaleDateString()
                } catch (error) {
                  return '-'
                }
              }
            },
            {
              key: 'requestedPunchIn',
              header: 'Corrected In',
              render: (value, row) => {
                if (!row) return '-'
                const punchIn = row.requestedPunchIn || value
                if (!punchIn) return '-'
                try {
                  return new Date(punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                } catch (error) {
                  return '-'
                }
              }
            },
            {
              key: 'requestedPunchOut',
              header: 'Corrected Out',
              render: (value, row) => {
                if (!row) return '-'
                const punchOut = row.requestedPunchOut || value
                if (!punchOut) return '-'
                try {
                  return new Date(punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                } catch (error) {
                  return '-'
                }
              }
            },
            {
              key: 'reason',
              header: 'Reason',
              render: (value, row) => {
                if (!row) return '-'
                return <span className="text-sm text-gray-700">{row.reason || value || '-'}</span>
              }
            },
            {
              key: 'status',
              header: 'Status',
              render: (value, row) => {
                if (!row) return '-'
                const status = row.status || value
                return (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${regStatusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
                    {status || '-'}
                  </span>
                )
              }
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (value, row) => {
                if (!row) return '-'
                if (!(isAdmin || isHR) || row.status !== 'pending') return '-'
                return (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
                      onClick={() => handleReview(row._id, 'approved')}
                      disabled={regularizationReviewMutation.isLoading}
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                      onClick={() => handleReview(row._id, 'rejected')}
                      disabled={regularizationReviewMutation.isLoading}
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                )
              }
            },
          ]}
          data={regularizations || []}
          isLoading={isRegLoading}
          emptyMessage="No regularization requests found"
        />
      </div>
    </div>
  )
}

export default Attendance
