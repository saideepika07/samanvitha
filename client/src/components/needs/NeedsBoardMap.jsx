import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { setupLeafletIcons } from '../common/LocationPicker.jsx';
import { Building, Package, MapPin } from 'lucide-react';

export function NeedsBoardMap({ needs = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Aggregate open needs by approved institution
  const { institutionsWithCoords, institutionsWithoutCoordsCount } = useMemo(() => {
    const map = new Map();
    let withoutCoords = 0;

    needs.forEach((need) => {
      // Must be open deficit
      const remaining = Number(need.remainingNeed ?? need.quantity ?? 0);
      if (remaining <= 0) return;

      const instId = need.institutionId?._id || need.institutionId || need.institutionName;
      if (!instId) return;

      const lat = need.latitude != null ? Number(need.latitude) : null;
      const lng = need.longitude != null ? Number(need.longitude) : null;

      const hasCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

      if (!hasCoords) {
        // Track unmapped institutions
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
          openNeeds: [],
        });
      }

      map.get(instId).openNeeds.push({
        itemType: need.itemType,
        remainingNeed: remaining,
        unit: need.unit || 'units',
        urgency: need.urgency || 'Medium',
      });
    });

    const instList = Array.from(map.values()).filter((item) => item.latitude != null);
    return {
      institutionsWithCoords: instList,
      institutionsWithoutCoordsCount: withoutCoords,
    };
  }, [needs]);

  useEffect(() => {
    setupLeafletIcons();

    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const defaultCenter = [17.3850, 78.4867]; // Hyderabad center
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 11,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = [];
    };
  }, []);

  // Update markers when institutions list changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (institutionsWithCoords.length === 0) return;

    const bounds = L.latLngBounds();

    institutionsWithCoords.forEach((inst) => {
      const openNeedsCount = inst.openNeeds.length;
      const formattedType = inst.type.replace('_', ' ');

      // Privacy: Only public institution name, type, and open needs count. No private data!
      const itemsListHtml = inst.openNeeds
        .slice(0, 3)
        .map(
          (n) =>
            `<li style="margin-bottom: 2px;">${escapeHtml(n.itemType)} (${n.remainingNeed} ${escapeHtml(n.unit)})</li>`
        )
        .join('');
      const moreHtml =
        openNeedsCount > 3
          ? `<li style="color: #6b7280; font-style: italic;">+ ${openNeedsCount - 3} more open needs</li>`
          : '';

      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px; padding: 4px;">
          <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #1e293b; line-height: 1.2;">
            ${escapeHtml(inst.name)}
          </h3>
          <div style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background-color: #f1f5f9; color: #475569; margin-bottom: 8px;">
            ${escapeHtml(formattedType)}
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 2px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #047857;">
              ${openNeedsCount} Open ${openNeedsCount === 1 ? 'Deficit' : 'Deficits'}
            </p>
            <ul style="margin: 0; padding-left: 14px; font-size: 11px; color: #334155; line-height: 1.4;">
              ${itemsListHtml}
              ${moreHtml}
            </ul>
          </div>
        </div>
      `;

      const marker = L.marker([inst.latitude, inst.longitude])
        .addTo(map)
        .bindPopup(popupHtml);

      markersRef.current.push(marker);
      bounds.extend([inst.latitude, inst.longitude]);
    });

    if (institutionsWithCoords.length > 0) {
      if (institutionsWithCoords.length === 1) {
        map.setView([institutionsWithCoords[0].latitude, institutionsWithCoords[0].longitude], 13);
      } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
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

          <div className="flex items-center gap-2 text-xs font-semibold text-sage-800 bg-sage-50 px-3 py-1.5 rounded-xl border border-sage-200">
            <Building className="w-3.5 h-3.5 text-sage-600" />
            <span>{institutionsWithCoords.length} Approved Care Facilities Pinned</span>
          </div>
        </div>

        {/* Leaflet Map */}
        <div
          ref={mapContainerRef}
          className="w-full h-[320px] sm:h-[420px] md:h-[460px] z-0"
          style={{ minHeight: '300px' }}
        />
      </div>

      {/* Info notice about coordinates */}
      {institutionsWithoutCoordsCount > 0 && (
        <div className="p-3.5 bg-sand-100/70 border border-sand-200 rounded-2xl text-xs text-charcoal-600 flex items-center justify-between gap-2">
          <span>
            <strong>Note:</strong> {institutionsWithoutCoordsCount} verified care {institutionsWithoutCoordsCount === 1 ? 'facility has' : 'facilities have'} not yet dropped a map pin. All active needs remain visible in Grid View.
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
