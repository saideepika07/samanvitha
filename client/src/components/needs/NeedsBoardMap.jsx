import React, { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { setupLeafletIcons } from '../common/LocationPicker.jsx';
import { Building, MapPin, Layers } from 'lucide-react';

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

export function NeedsBoardMap({ needs = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const clusterGroupRef = useRef(null);

  const [activeLayer, setActiveLayer] = useState('map');

  // Aggregate open needs by approved institution
  const { institutionsWithCoords, institutionsWithoutCoordsCount } = useMemo(() => {
    const map = new Map();
    let withoutCoords = 0;

    needs.forEach((need) => {
      // Must have open remaining need
      const remaining = Number(need.remainingNeed ?? need.quantity ?? 0);
      if (remaining <= 0) return;

      const instId = need.institutionId?._id || need.institutionId || need.institutionName;
      if (!instId) return;

      const lat = need.latitude != null ? Number(need.latitude) : null;
      const lng = need.longitude != null ? Number(need.longitude) : null;

      const hasCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

      if (!hasCoords) {
        if (!map.has(`unmapped_${instId}`)) {
          map.set(`unmapped_${instId}`, true);
          withoutCoords++;
        }
        return;
      }

      if (!map.has(instId)) {
        map.set(instId, {
          id: instId,
          name: need.institutionName || 'Verified Care Facility',
          type: need.institutionType || 'Care Facility',
          latitude: lat,
          longitude: lng,
          openNeedsCount: 0,
        });
      }

      map.get(instId).openNeedsCount += 1;
    });

    const instList = Array.from(map.values()).filter((item) => item.latitude != null);
    return {
      institutionsWithCoords: instList,
      institutionsWithoutCoordsCount: withoutCoords,
    };
  }, [needs]);

  // Initialize Map
  useEffect(() => {
    setupLeafletIcons();

    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const defaultCenter = [17.385, 78.4867]; // Hyderabad center
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 11,
      maxZoom: 19,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    // Tile layer setup with maxZoom 19 and detectRetina
    const initialConfig = TILE_LAYERS.map;
    const tileLayer = L.tileLayer(initialConfig.url, initialConfig.options).addTo(map);
    tileLayerRef.current = tileLayer;

    // Cluster group setup
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div>${count}</div>`,
          className: 'custom-cluster-marker',
          iconSize: L.point(40, 40),
        });
      },
    });
    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    // Handle container resize
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    // Initial sizing invalidate
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
      clusterGroupRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Handle Layer Switch (Map / Satellite)
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

  // Update clustered markers when institutions data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !clusterGroup) return;

    clusterGroup.clearLayers();

    if (institutionsWithCoords.length === 0) return;

    institutionsWithCoords.forEach((inst) => {
      const openNeedsCount = inst.openNeedsCount;
      const formattedType = inst.type.replace('_', ' ');

      // Requirement 6: Popups with name, type and open needs count ONLY
      const popupHtml = `
        <div style="font-family: inherit; min-width: 180px; padding: 4px;">
          <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #1e293b; line-height: 1.2;">
            ${escapeHtml(inst.name)}
          </h3>
          <div style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background-color: #f1f5f9; color: #475569; margin-bottom: 8px;">
            ${escapeHtml(formattedType)}
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 2px;">
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #36432D;">
              ${openNeedsCount} Open ${openNeedsCount === 1 ? 'Deficit' : 'Deficits'}
            </p>
          </div>
        </div>
      `;

      const marker = L.marker([inst.latitude, inst.longitude]).bindPopup(popupHtml);
      clusterGroup.addLayer(marker);
    });

    // Fit bounds to markers
    if (institutionsWithCoords.length === 1) {
      map.setView([institutionsWithCoords[0].latitude, institutionsWithCoords[0].longitude], 14);
    } else {
      const bounds = clusterGroup.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [institutionsWithCoords]);

  return (
    <div className="space-y-3">
      {/* Map Card */}
      <div className="bg-white rounded-3xl border border-sand-200 overflow-hidden shadow-soft-sm">
        <div className="p-4 sm:p-5 border-b border-sand-200 flex flex-wrap items-center justify-between gap-3 bg-sand-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sage-100 flex items-center justify-center text-sage-700">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-charcoal-900">
                Community Needs Map
              </h3>
              <p className="text-xs text-charcoal-500">
                Verified care facilities with active open deficits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Layer Switcher (Map / Satellite) */}
            <div className="inline-flex rounded-lg border border-sand-300 p-0.5 bg-white shadow-soft-sm">
              <button
                type="button"
                onClick={() => handleLayerSwitch('map')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer min-h-[36px] sm:min-h-[30px] flex items-center gap-1 ${
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
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer min-h-[36px] sm:min-h-[30px] flex items-center gap-1 ${
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

            <div className="flex items-center gap-1.5 text-xs font-semibold text-sage-800 bg-sage-50 px-3 py-1.5 rounded-xl border border-sage-200">
              <Building className="w-3.5 h-3.5 text-sage-600" />
              <span>{institutionsWithCoords.length} Care Facilities Pinned</span>
            </div>
          </div>
        </div>

        {/* Leaflet Map with Marker Clustering */}
        <div
          ref={mapContainerRef}
          className="w-full h-[360px] sm:h-[440px] md:h-[500px] z-0"
          style={{ minHeight: '360px' }}
        />
      </div>

      {/* Info Notice about unmapped facilities */}
      {institutionsWithoutCoordsCount > 0 && (
        <div className="p-3.5 bg-sand-100/70 border border-sand-200 rounded-2xl text-xs text-charcoal-600 flex items-center justify-between gap-2">
          <span>
            <strong>Note:</strong> {institutionsWithoutCoordsCount} verified care{' '}
            {institutionsWithoutCoordsCount === 1 ? 'facility has' : 'facilities have'} not yet dropped a map pin. All active needs remain visible in Grid View.
          </span>
        </div>
      )}
    </div>
  );
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default NeedsBoardMap;
