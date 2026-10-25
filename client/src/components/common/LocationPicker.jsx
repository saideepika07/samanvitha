import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  MapPin,
  Navigation,
  X,
  AlertCircle,
  CheckCircle2,
  Search,
  Maximize2,
  Minimize2,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { Input } from './Input.jsx';
import { roundCoordinates, validateCoordinates, formatCoordinates } from '../../utils/geoUtils.js';

// Leaflet default marker icon asset configuration for Vite
let iconsConfigured = false;
export function setupLeafletIcons() {
  if (iconsConfigured) return;
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
  });
  if (typeof window !== 'undefined') {
    window.L = L;
  }
  iconsConfigured = true;
}

// Tile Layer Definitions
const TILE_LAYERS = {
  map: {
    name: 'Map',
    url:
      import.meta.env.VITE_MAP_TILE_URL ||
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
      detectRetina: true,
    },
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19,
      detectRetina: true,
    },
  },
};

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
  const tileLayerRef = useRef(null);
  const markerRef = useRef(null);
  const lastSearchTimeRef = useRef(0);

  // Component UI States
  const [activeLayer, setActiveLayer] = useState('map'); // 'map' | 'satellite'
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showManualInputs, setShowManualInputs] = useState(false);

  // Search States (Nominatim)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchFeedback, setSearchFeedback] = useState(null);

  // Manual Coordinate Input States
  const [manualLat, setManualLat] = useState(latitude != null ? String(latitude) : '');
  const [manualLng, setManualLng] = useState(longitude != null ? String(longitude) : '');

  // Keep manual inputs synced with props
  useEffect(() => {
    if (latitude != null) setManualLat(String(latitude));
    else setManualLat('');
    if (longitude != null) setManualLng(String(longitude));
    else setManualLng('');
  }, [latitude, longitude]);

  // Invalidate map size cleanly
  const triggerInvalidateSize = useCallback(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 300);
    }
  }, []);

  // Update marker position and drag behavior
  const setOrUpdateMarker = useCallback(
    (lat, lng, panTo = false, zoomLevel = null) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const rounded = roundCoordinates(lat, lng, 5);
      if (rounded.latitude == null || rounded.longitude == null) {
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        return;
      }

      const targetLatLng = [rounded.latitude, rounded.longitude];

      if (markerRef.current) {
        markerRef.current.setLatLng(targetLatLng);
      } else {
        const marker = L.marker(targetLatLng, {
          draggable: true,
          autoPan: true,
        }).addTo(map);

        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          const draggedRounded = roundCoordinates(newPos.lat, newPos.lng, 5);
          setLocationError(null);
          if (onChange) {
            onChange({
              latitude: draggedRounded.latitude,
              longitude: draggedRounded.longitude,
            });
          }
        });

        markerRef.current = marker;
      }

      if (panTo) {
        if (zoomLevel) {
          map.setView(targetLatLng, zoomLevel);
        } else {
          map.panTo(targetLatLng);
        }
      }
    },
    [onChange]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    setupLeafletIcons();

    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default to existing coordinates or Hyderabad center at zoom 12
    const hasCoords =
      latitude != null &&
      longitude != null &&
      !isNaN(Number(latitude)) &&
      !isNaN(Number(longitude));

    const initialLat = hasCoords ? Number(latitude) : 17.385;
    const initialLng = hasCoords ? Number(longitude) : 78.4867;
    const initialZoom = hasCoords ? 15 : 12;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      maxZoom: 19,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    // Initial tile layer (OSM Standard)
    const initialConfig = TILE_LAYERS.map;
    const tileLayer = L.tileLayer(initialConfig.url, initialConfig.options).addTo(map);
    tileLayerRef.current = tileLayer;

    // Initial Marker if coordinates are provided
    if (hasCoords) {
      const rounded = roundCoordinates(initialLat, initialLng, 5);
      const marker = L.marker([rounded.latitude, rounded.longitude], {
        draggable: true,
        autoPan: true,
      }).addTo(map);

      marker.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        const dragged = roundCoordinates(newPos.lat, newPos.lng, 5);
        setLocationError(null);
        if (onChange) {
          onChange({
            latitude: dragged.latitude,
            longitude: dragged.longitude,
          });
        }
      });
      markerRef.current = marker;
    }

    // Click on map to drop or reposition pin
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const rounded = roundCoordinates(lat, lng, 5);
      setLocationError(null);
      setSearchFeedback(null);
      setOrUpdateMarker(rounded.latitude, rounded.longitude, false);
      if (onChange) {
        onChange({
          latitude: rounded.latitude,
          longitude: rounded.longitude,
        });
      }
    });

    // Window resize listener to keep tiles sharp and sized
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    // Initial invalidateSize
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Synchronize marker when external latitude or longitude props change
  useEffect(() => {
    const hasCoords =
      latitude != null &&
      longitude != null &&
      !isNaN(Number(latitude)) &&
      !isNaN(Number(longitude));

    if (hasCoords) {
      setOrUpdateMarker(Number(latitude), Number(longitude));
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [latitude, longitude, setOrUpdateMarker]);

  // Handle Layer Switch (Map vs Satellite)
  const handleLayerSwitch = (layerKey) => {
    if (activeLayer === layerKey) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = TILE_LAYERS[layerKey];
    const newTileLayer = L.tileLayer(config.url, config.options).addTo(map);
    tileLayerRef.current = newTileLayer;
    setActiveLayer(layerKey);
  };

  // Handle Fullscreen Toggle
  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
    triggerInvalidateSize();
  };

  // Re-invalidate size whenever fullscreen state changes
  useEffect(() => {
    triggerInvalidateSize();
  }, [isExpanded, triggerInvalidateSize]);

  // Geolocation handler: "Use my current location"
  const handleUseCurrentLocation = () => {
    setLocationError(null);
    setSearchFeedback(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude: lat, longitude: lng } = position.coords;
        const rounded = roundCoordinates(lat, lng, 5);

        setOrUpdateMarker(rounded.latitude, rounded.longitude, true, 16);
        if (onChange) {
          onChange({
            latitude: rounded.latitude,
            longitude: rounded.longitude,
          });
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setLocationError(
            'Location access was denied. Please allow browser location permissions or click on the map to set a pin.'
          );
        } else if (err.code === 2) {
          setLocationError(
            'Location position is unavailable. Please click on the map to set your location pin.'
          );
        } else if (err.code === 3) {
          setLocationError(
            'Location request timed out. Please click on the map to set your location pin.'
          );
        } else {
          setLocationError(
            'Unable to retrieve current location. Please click on the map to set your location pin.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Clear pin handler
  const handleClearPin = (e) => {
    if (e) e.preventDefault();
    setLocationError(null);
    setSearchFeedback(null);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (onChange) {
      onChange({ latitude: null, longitude: null });
    }
  };

  // Nominatim Place Search Handler (Only triggered on Enter or Search button click)
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Rate-limit: At most 1 request per second per Nominatim Usage Policy
    const now = Date.now();
    if (now - lastSearchTimeRef.current < 1000) {
      setSearchFeedback('Please wait 1 second before searching again.');
      return;
    }
    lastSearchTimeRef.current = now;

    setIsSearching(true);
    setSearchFeedback(null);

    try {
      // Restricted to India (countrycodes=in) with max 5 results
      const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=in&limit=5&addressdetails=1`;

      const res = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setSearchResults([]);
        setSearchFeedback('No matching areas found in India. Try another colony or landmark.');
      } else {
        setSearchResults(data);
        setSearchFeedback(null);
      }
    } catch (err) {
      console.warn('Nominatim search error:', err);
      setSearchFeedback('Search is currently unavailable. Please click directly on the map to drop your pin.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Select place from search list: Moves map to result WITHOUT placing pin automatically
  const handleSelectSearchResult = (result) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    const map = mapInstanceRef.current;

    if (map && !isNaN(lat) && !isNaN(lon)) {
      map.setView([lat, lon], 16);
      setSearchResults([]);
      setSearchFeedback(
        `Map centered on "${result.display_name.split(',')[0]}". Click on the map to place your pin.`
      );
    }
  };

  // Manual Coordinates Apply Handler
  const handleApplyManualCoords = (e) => {
    e.preventDefault();
    const validation = validateCoordinates(manualLat, manualLng);
    if (!validation.isValid) {
      setLocationError(validation.error || 'Invalid coordinates entered.');
      return;
    }

    setLocationError(null);
    if (validation.latitude != null && validation.longitude != null) {
      const rounded = roundCoordinates(validation.latitude, validation.longitude, 5);
      setOrUpdateMarker(rounded.latitude, rounded.longitude, true, 16);
      if (onChange) {
        onChange({
          latitude: rounded.latitude,
          longitude: rounded.longitude,
        });
      }
    } else {
      handleClearPin();
    }
  };

  const hasCoords =
    latitude != null &&
    longitude != null &&
    !isNaN(Number(latitude)) &&
    !isNaN(Number(longitude));

  const coordinateDisplay = hasCoords
    ? formatCoordinates(latitude, longitude, 5)
    : '';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Text Address Field (Preserved) */}
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

      {/* Main Map Block */}
      <div className="space-y-2">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sage-600" />
            <span>Map Location Pin</span>
            <span className="text-[11px] font-normal lowercase text-charcoal-500 font-sans">
              (optional but recommended)
            </span>
          </label>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Layer Switcher (Map / Satellite) */}
            <div className="inline-flex rounded-lg border border-sand-300 p-0.5 bg-white shadow-soft-sm">
              <button
                type="button"
                onClick={() => handleLayerSwitch('map')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer min-h-[36px] sm:min-h-[30px] flex items-center gap-1 ${
                  activeLayer === 'map'
                    ? 'bg-sage-600 text-white shadow-xs'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
                aria-pressed={activeLayer === 'map'}
              >
                <span>Map</span>
              </button>
              <button
                type="button"
                onClick={() => handleLayerSwitch('satellite')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer min-h-[36px] sm:min-h-[30px] flex items-center gap-1 ${
                  activeLayer === 'satellite'
                    ? 'bg-sage-600 text-white shadow-xs'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
                aria-pressed={activeLayer === 'satellite'}
              >
                <Layers className="w-3 h-3" />
                <span>Satellite</span>
              </button>
            </div>

            {/* Use My Current Location Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[36px] text-xs font-medium rounded-lg border border-sand-300 bg-white text-charcoal-700 hover:bg-sand-50 transition-colors shadow-soft-sm cursor-pointer disabled:opacity-60"
            >
              <Navigation
                className={`w-3.5 h-3.5 text-sage-600 ${isLocating ? 'animate-spin' : ''}`}
              />
              <span>{isLocating ? 'Locating...' : 'Use my current location'}</span>
            </button>

            {/* Expand / Fullscreen Button */}
            <button
              type="button"
              onClick={toggleExpanded}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] text-xs font-medium rounded-lg border border-sand-300 bg-white text-charcoal-700 hover:bg-sand-50 transition-colors shadow-soft-sm cursor-pointer"
              title={isExpanded ? 'Collapse map' : 'Expand map full screen'}
              aria-label={isExpanded ? 'Collapse map' : 'Expand map full screen'}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-charcoal-600" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-charcoal-600" />
                  <span className="hidden sm:inline">Expand map</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Place Search Bar (Nominatim, triggered on Enter or button click only) */}
        <div className="relative">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-sand-300 shadow-soft-sm focus-within:ring-2 focus-within:ring-sage-500"
          >
            <div className="pl-2.5 text-charcoal-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search colony, area or landmark in India (press Enter)..."
              className="flex-1 min-w-0 px-2 py-1.5 text-xs text-charcoal-800 bg-transparent focus:outline-none"
              aria-label="Search area in India"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setSearchFeedback(null);
                }}
                className="p-1 text-charcoal-400 hover:text-charcoal-600 rounded-md"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-3 py-1.5 min-h-[36px] text-xs font-medium bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50 cursor-pointer flex-shrink-0"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Search Attribution */}
          <div className="mt-1 flex items-center justify-between text-[10px] text-charcoal-400 px-1">
            <span>Search powered by OpenStreetMap Nominatim (India only)</span>
            <span>Press Enter to search</span>
          </div>

          {/* Search Feedback Message */}
          {searchFeedback && (
            <div className="mt-1.5 p-2 bg-sage-50 border border-sage-200 rounded-lg text-xs text-sage-800 flex items-start justify-between gap-2">
              <span>{searchFeedback}</span>
              <button
                type="button"
                onClick={() => setSearchFeedback(null)}
                className="text-sage-500 hover:text-sage-700 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Search Results Dropdown List */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-[500] bg-white rounded-xl border border-sand-300 shadow-soft-lg overflow-hidden divide-y divide-sand-100 max-h-60 overflow-y-auto">
              <div className="p-2 bg-sand-50/70 text-[11px] font-semibold text-charcoal-600 flex items-center justify-between">
                <span>Select area to center map:</span>
                <button
                  type="button"
                  onClick={() => setSearchResults([])}
                  className="text-charcoal-400 hover:text-charcoal-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {searchResults.map((item, idx) => (
                <button
                  key={item.place_id || idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-2.5 text-xs text-charcoal-800 hover:bg-sage-50/70 transition-colors flex items-start gap-2 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-sage-600 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2 leading-relaxed">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Location Error Notice */}
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

        {/* Map Container (Inline or Fullscreen modal) */}
        <div
          className={`${
            isExpanded
              ? 'fixed inset-0 z-[9999] bg-charcoal-900/80 backdrop-blur-sm p-3 sm:p-6 flex flex-col justify-center'
              : 'relative rounded-2xl border border-sand-300 overflow-hidden bg-sand-100 shadow-soft-sm'
          }`}
        >
          {isExpanded && (
            <div className="bg-white rounded-t-2xl p-3 border-b border-sand-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sage-600" />
                <span className="font-serif font-bold text-sm text-charcoal-900">
                  Precision Map View
                </span>
                <span className="text-xs text-charcoal-500 hidden sm:inline">
                  (Click map to drop pin or drag marker to adjust)
                </span>
              </div>
              <button
                type="button"
                onClick={toggleExpanded}
                className="px-3 py-1.5 min-h-[44px] sm:min-h-[36px] text-xs font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          )}

          <div
            ref={mapContainerRef}
            className={`w-full z-0 ${
              isExpanded
                ? 'flex-1 rounded-b-2xl min-h-[400px]'
                : 'h-[360px] min-h-[360px] sm:h-[420px] sm:min-h-[420px]'
            }`}
          />

          {/* Coordinate Status Overlay Pill */}
          <div className="absolute bottom-2 left-2 z-[400] flex flex-wrap items-center gap-2 pointer-events-auto">
            {hasCoords ? (
              <div className="flex items-center gap-2 bg-white/95 backdrop-blur px-2.5 py-1.5 rounded-lg border border-sand-200 shadow-soft-sm text-xs text-charcoal-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-sage-600 flex-shrink-0" />
                <span className="font-mono text-[11px] font-semibold text-charcoal-900">
                  {coordinateDisplay}
                </span>
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="text-xs text-charcoal-400 hover:text-red-600 font-medium ml-1 transition-colors min-h-[30px] px-1 flex items-center cursor-pointer"
                  title="Remove location pin"
                >
                  Clear pin
                </button>
              </div>
            ) : (
              <div className="bg-white/95 backdrop-blur px-2.5 py-1.5 rounded-lg border border-sand-200 text-[11px] text-charcoal-600 font-medium">
                Click map to drop a pin • Drag to adjust
              </div>
            )}
          </div>
        </div>

        {/* Instructions and Manual Fallback Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-charcoal-500 leading-relaxed">
            Click map to drop a pin, or drag marker to adjust. Precise coordinates enable algorithmic delivery feasibility scoring.
          </p>

          <button
            type="button"
            onClick={() => setShowManualInputs((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] text-sage-700 hover:text-sage-800 font-medium underline underline-offset-2 min-h-[36px] cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{showManualInputs ? 'Hide coordinate inputs' : 'Enter coordinates manually'}</span>
          </button>
        </div>

        {/* Accessible Keyboard / Screen Reader Manual Coordinate Inputs */}
        {showManualInputs && (
          <form
            onSubmit={handleApplyManualCoords}
            className="p-3 bg-sand-50 rounded-xl border border-sand-200 text-xs space-y-2 mt-2"
          >
            <span className="font-semibold text-charcoal-800 block">
              Manual Coordinates (Text Fallback)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-charcoal-600 block mb-1">
                  Latitude (-90 to 90)
                </label>
                <input
                  type="number"
                  step="0.00001"
                  min="-90"
                  max="90"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="e.g. 17.44813"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-sand-300 text-xs text-charcoal-900 bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-charcoal-600 block mb-1">
                  Longitude (-180 to 180)
                </label>
                <input
                  type="number"
                  step="0.00001"
                  min="-180"
                  max="180"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="e.g. 78.38456"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-sand-300 text-xs text-charcoal-900 bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors min-h-[36px] cursor-pointer"
              >
                Apply Coordinates
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default LocationPicker;
