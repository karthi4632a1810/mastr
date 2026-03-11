import { useEffect, useState, Suspense, lazy } from 'react'
import { Navigation, MapPin } from 'lucide-react'
import Button from './Button'

// Lazy load MapView to avoid SSR issues
const MapView = lazy(() => import('./MapView'))

const MapSelector = ({ 
  latitude, 
  longitude, 
  radius = 100,
  onLocationChange,
  onRadiusChange,
  height = '400px'
}) => {
  const [position, setPosition] = useState([latitude || 28.6139, longitude || 77.2090]) // Default to Delhi
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [address, setAddress] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  // Coarse IP-based fallback for when GPS is unavailable/blocked
  const fetchIpLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/')
      const data = await res.json()
      if (data?.latitude && data?.longitude) {
        const { latitude, longitude } = data
        setPosition([latitude, longitude])
        onLocationChange(latitude, longitude)
        reverseGeocode(latitude, longitude)
        return true
      }
    } catch (err) {
      console.error('IP-based location failed:', err)
    }
    return false
  }

  // Ensure component is mounted before rendering map
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude])
      reverseGeocode(latitude, longitude)
    }
  }, [latitude, longitude])

  // Get current GPS location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      fetchIpLocation().then((ok) => {
        if (!ok) alert('Geolocation not supported and IP lookup failed. Please pick on the map.')
      })
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setPosition([latitude, longitude])
        onLocationChange(latitude, longitude)
        reverseGeocode(latitude, longitude)
        setIsGettingLocation(false)
      },
      (error) => {
        const messages = {
          1: 'Location permission denied. Please allow it in your browser settings.',
          2: 'Location unavailable. Check GPS/Wi‑Fi or try again.',
          3: 'Location request timed out. Please retry or select on the map.',
        }
        const message =
          messages[error?.code] ||
          'Unable to get your location. Ensure you are on HTTPS/localhost and allow access, or pick a spot on the map.'
        console.error('Error getting location:', error)
        fetchIpLocation().then((ok) => {
          if (!ok) alert(message)
          setIsGettingLocation(false)
        })
      },
      {
        enableHighAccuracy: false, // avoid slow GPS fetches
        timeout: 20000,            // give more time before timeout
        maximumAge: 60000          // accept cached position up to 1 minute old
      }
    )
  }

  // Reverse geocode to get address
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
      const data = await response.json()
      if (data.display_name) {
        setAddress(data.display_name)
        if (onLocationChange) {
          onLocationChange(lat, lng, data.display_name)
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
    }
  }

  const handleMapClick = (lat, lng) => {
    setPosition([lat, lng])
    onLocationChange(lat, lng)
    reverseGeocode(lat, lng)
  }

  const handleMarkerDrag = (e) => {
    const { lat, lng } = e.target.getLatLng()
    setPosition([lat, lng])
    onLocationChange(lat, lng)
    reverseGeocode(lat, lng)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-primary-600" />
          <span className="font-medium">Select Location</span>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={getCurrentLocation}
          isLoading={isGettingLocation}
          className="text-sm"
        >
          <Navigation className="h-4 w-4 mr-2" />
          Use GPS Location
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ height }}>
        {isMounted ? (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading map...</p>
              </div>
            </div>
          }>
            <MapView
              key={`mapview-${isMounted}`}
              position={position}
              radius={radius}
              onLocationSelect={handleMapClick}
              onMarkerDrag={handleMarkerDrag}
            />
          </Suspense>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Initializing map...</p>
            </div>
          </div>
        )}
      </div>

      {address && (
        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
          <strong>Address:</strong> {address}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="any"
            value={position[0].toFixed(6)}
            onChange={(e) => {
              const lat = parseFloat(e.target.value)
              if (!isNaN(lat)) {
                setPosition([lat, position[1]])
                onLocationChange(lat, position[1])
                reverseGeocode(lat, position[1])
              }
            }}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="any"
            value={position[1].toFixed(6)}
            onChange={(e) => {
              const lng = parseFloat(e.target.value)
              if (!isNaN(lng)) {
                setPosition([position[0], lng])
                onLocationChange(position[0], lng)
                reverseGeocode(position[0], lng)
              }
            }}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Radius: {radius}m
        </label>
        <input
          type="range"
          min="10"
          max="5000"
          step="10"
          value={radius}
          onChange={(e) => {
            const newRadius = parseInt(e.target.value)
            if (onRadiusChange) {
              onRadiusChange(newRadius)
            }
          }}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>10m</span>
          <span>2500m</span>
          <span>5000m</span>
        </div>
      </div>
    </div>
  )
}

export default MapSelector

