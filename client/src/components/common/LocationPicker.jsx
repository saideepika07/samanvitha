import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapPin, Navigation, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from './Input.jsx';

// Fix the Vite / Leaflet marker icon asset bundling issue
let iconsConfigured = false;
export function setupLeafletIcons() {
  if (iconsConfigured) return;
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
  });
  iconsConfigured = true;
}

export function LocationPicker({
  latitude,
  longitude,
  onChange,
  address,
  onAddressChange,
  label = 'Physical Location & Address',
  addressLabel = 'Street Address / Area',
  addressPlaceholder = 'e.g. Plot 12, Road No 4, Madhapur, Hyderabad',
  addressName = 'address',
  addressError,
  addressHelperText,
  required = false,
  className = '',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Initialize Leaflet map
  useEffect(() => {
    setupLeafletIcons();

    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center: Hyderabad center if no coordinates provided
    const hasCoords = latitude != null && longitude != null && !isNaN(Number(latitude)) && !isNaN(Number(longitude));
    const initialLat = hasCoords ? Number(latitude) : 17.3850;
    const initialLng = hasCoords ? Number(longitude) : 78.4867;
    const initialZoom = hasCoords ? 14 : 11;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    // OpenStreetMap tile layer with required attribution
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    if (hasCoords) {
      markerRef.current = L.marker([initialLat, initialLng]).addTo(map);
    }

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      // 4 decimal places for clean precision display
      const roundedLat = Math.round(lat * 10000) / 10000;
      const roundedLng = Math.round(lng * 10000) / 10000;
      setLocationError(null);
      if (onChange) {
        onChange({ latitude: roundedLat, longitude: roundedLng });
      }
    });

    // Invalidate size once rendered
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Synchronize marker when latitude or longitude props change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const hasCoords = latitude != null && longitude != null && !isNaN(Number(latitude)) && !isNaN(Number(longitude));

    if (hasCoords) {
      const latNum = Number(latitude);
      const lngNum = Number(longitude);

      if (markerRef.current) {
        markerRef.current.setLatLng([latNum, lngNum]);
      } else {
        markerRef.current = L.marker([latNum, lngNum]).addTo(map);
      }
      map.setView([latNum, lngNum], Math.max(map.getZoom(), 13));
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [latitude, longitude]);

  const handleUseCurrentLocation = () => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude: lat, longitude: lng } = position.coords;
        const roundedLat = Math.round(lat * 10000) / 10000;
        const roundedLng = Math.round(lng * 10000) / 10000;
        if (onChange) {
          onChange({ latitude: roundedLat, longitude: roundedLng });
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          // GeolocationPositionError.PERMISSION_DENIED
          setLocationError('Location access was denied. Please allow location permissions in your browser or click on the map to drop a pin.');
        } else if (err.code === 2) {
          // GeolocationPositionError.POSITION_UNAVAILABLE
          setLocationError('Location position unavailable. Please click on the map to set your location pin.');
        } else if (err.code === 3) {
          // GeolocationPositionError.TIMEOUT
          setLocationError('Location request timed out. Please click on the map to set your location pin.');
        } else {
          setLocationError('Unable to retrieve your current location. Please click on the map to set your location pin.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleClearPin = (e) => {
    e.preventDefault();
    setLocationError(null);
    if (onChange) {
      onChange({ latitude: null, longitude: null });
    }
  };

  const hasCoords = latitude != null && longitude != null && !isNaN(Number(latitude)) && !isNaN(Number(longitude));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Text Address Field (Kept intact) */}
      {onAddressChange && (
        <Input
          label={addressLabel}
          name={addressName}
          value={address || ''}
          onChange={onAddressChange}
          placeholder={addressPlaceholder}
          error={addressError}
          helperText={addressHelperText}
          required={required}
        />
      )}

      {/* Map Header & Actions */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sage-600" />
            <span>Map Location Pin</span>
            <span className="text-[11px] font-normal lowercase text-charcoal-500 font-sans">
              (optional but recommended)
            </span>
          </label>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] sm:min-h-[36px] text-xs font-medium rounded-lg border border-sand-300 bg-white text-charcoal-700 hover:bg-sand-50 transition-colors shadow-soft-sm cursor-pointer disabled:opacity-60"
          >
            <Navigation className={`w-3.5 h-3.5 text-sage-600 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Use my current location'}</span>
          </button>
        </div>

        {/* Permission Denied or Other Location Error Alert */}
        {locationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1">
              <p className="font-medium">{locationError}</p>
            </div>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              className="text-red-400 hover:text-red-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Map Container */}
        <div className="relative rounded-2xl border border-sand-300 overflow-hidden bg-sand-100 shadow-soft-sm">
          <div
            ref={mapContainerRef}
            className="w-full h-56 sm:h-64 z-0"
            style={{ minHeight: '220px' }}
          />

          {/* Coordinate Status Pill Overlay */}
          <div className="absolute bottom-2 left-2 z-[400] flex flex-wrap items-center gap-2 pointer-events-auto">
            {hasCoords ? (
              <div className="flex items-center gap-2 bg-white/95 backdrop-blur px-2.5 py-1 rounded-lg border border-sand-200 shadow-soft-sm text-xs text-charcoal-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
                <span className="font-mono text-[11px]">
                  {Number(latitude).toFixed(4)}°, {Number(longitude).toFixed(4)}°
                </span>
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="text-xs text-charcoal-400 hover:text-red-600 font-medium ml-1 transition-colors"
                  title="Remove pin"
                >
                  Clear pin
                </button>
              </div>
            ) : (
              <div className="bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg border border-sand-200 text-[11px] text-charcoal-500">
                Click map to drop a pin
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-charcoal-500 leading-relaxed">
          Click on the map to pin your exact location. This enables algorithmic delivery feasibility scoring without exposing your exact coordinates.
        </p>
      </div>
    </div>
  );
}

export default LocationPicker;
