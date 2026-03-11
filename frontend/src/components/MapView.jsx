import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon in react-leaflet - only run on client
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

// Custom marker icon
const createCustomIcon = (color = '#3b82f6') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      onLocationSelect(lat, lng)
    },
  })
  return null
}

// Component to move the map when position changes
function FlyToPosition({ position }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !position) return
    map.flyTo(position, map.getZoom(), { duration: 0.6 })
  }, [map, position])

  return null
}

const MapView = ({ 
  position, 
  radius, 
  onLocationSelect,
  onMarkerDrag
}) => {
  const [isReady, setIsReady] = useState(false)
  const mapKeyRef = useRef(`map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    // Ensure map only renders after component is fully mounted
    if (typeof window !== 'undefined' && !hasInitializedRef.current) {
      hasInitializedRef.current = true
      // Small delay to ensure DOM is ready and avoid double initialization
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 300)
      return () => {
        clearTimeout(timer)
        setIsReady(false)
        hasInitializedRef.current = false
      }
    }
  }, [])

  const handleDragEnd = (e) => {
    if (onMarkerDrag) {
      onMarkerDrag(e)
    }
  }

  if (!isReady || typeof window === 'undefined') {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      id={mapKeyRef.current}
      key={mapKeyRef.current}
      style={{ height: '100%', width: '100%', position: 'relative' }}
    >
      <MapContainer
        key={`container-${mapKeyRef.current}`}
        center={position}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToPosition position={position} />
        {onLocationSelect ? <MapClickHandler onLocationSelect={onLocationSelect} /> : null}
        <Marker
          position={position}
          icon={createCustomIcon('#3b82f6')}
          draggable={true}
          eventHandlers={{
            dragend: handleDragEnd
          }}
        />
        {radius > 0 ? (
          <Circle
            center={position}
            radius={radius}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
              weight: 2
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  )
}

export default MapView

