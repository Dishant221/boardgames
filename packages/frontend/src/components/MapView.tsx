import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { GeoPoint } from '../lib/types';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  kind?: 'default' | 'me' | 'gold';
  onClick?: () => void;
}

interface Props {
  center: GeoPoint;
  zoom?: number;
  markers?: MapMarker[];
  polyline?: GeoPoint[];
  fitToMarkers?: boolean;
  className?: string;
  onClick?: (p: GeoPoint) => void;
}

/**
 * Leaflet + OpenStreetMap tiles (free). Tiles are tinted warm via CSS so the
 * map sits comfortably on the gallery wall.
 */
export default function MapView({ center, zoom = 14, markers = [], polyline, fitToMarkers = false, className = 'h-72', onClick }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const line = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    if (onClick) map.current.on('click', (e: L.LeafletMouseEvent) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }));
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current) return;
    if (!fitToMarkers || markers.length === 0) map.current.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center.lat, center.lng, zoom, fitToMarkers, markers.length]);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    for (const m of markers) {
      const icon = L.divIcon({ className: '', html: `<div class="gt-marker ${m.kind === 'me' ? 'gt-marker-me' : m.kind === 'gold' ? 'gt-marker-gold' : ''}"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
      const marker = L.marker([m.lat, m.lng], { icon }).bindPopup(`<strong>${escapeHtml(m.label)}</strong>${m.sub ? `<br/><span style="opacity:.75">${escapeHtml(m.sub)}</span>` : ''}`);
      if (m.onClick) marker.on('click', m.onClick);
      marker.addTo(layer.current);
      bounds.push([m.lat, m.lng]);
    }
    if (line.current) {
      line.current.remove();
      line.current = null;
    }
    if (polyline && polyline.length > 1) {
      line.current = L.polyline(
        polyline.map((p) => [p.lat, p.lng] as L.LatLngExpression),
        { color: '#b1412c', weight: 4, opacity: 0.85, dashArray: '2 6', lineCap: 'round' }
      ).addTo(map.current);
      bounds.push(...polyline.map((p) => [p.lat, p.lng] as L.LatLngExpression));
    }
    if (fitToMarkers && bounds.length > 1) map.current.fitBounds(L.latLngBounds(bounds as L.LatLngTuple[]), { padding: [30, 30], maxZoom: 16 });
  }, [markers, polyline, fitToMarkers]);

  return <div ref={el} className={`w-full ${className} rounded-lg overflow-hidden border border-umber/20 shadow-card`} />;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
