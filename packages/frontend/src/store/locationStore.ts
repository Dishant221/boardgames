import { create } from 'zustand';
import { placesApi, preferencesApi } from '../utils/api';
import type { GeoPoint } from '../lib/types';

/**
 * Browser geolocation, shared across pages. The position is sent to the
 * user's own tenant Durable Object (never to a shared store) so the assistant
 * can answer "near me" questions.
 */
interface LocationStore {
  position: (GeoPoint & { accuracy_m?: number }) | null;
  label: string | null;
  status: 'idle' | 'locating' | 'granted' | 'denied' | 'unsupported';
  error: string | null;
  locate: (opts?: { share?: boolean }) => Promise<(GeoPoint & { accuracy_m?: number }) | null>;
  setManual: (p: GeoPoint, label?: string) => void;
}

export const useLocationStore = create<LocationStore>((set, get) => ({
  position: null,
  label: null,
  status: 'idle',
  error: null,

  locate: async (opts = { share: true }) => {
    if (!('geolocation' in navigator)) {
      set({ status: 'unsupported', error: 'Geolocation is not supported by this browser.' });
      return null;
    }
    set({ status: 'locating', error: null });
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: Math.round(pos.coords.accuracy) };
          set({ position: p, status: 'granted' });
          try {
            const r = await placesApi.reverse(p.lat, p.lng);
            const g = r.data.data;
            if (g) set({ label: g.name ? `${g.name}${g.display_name.includes(',') ? ', ' + g.display_name.split(',').pop()?.trim() : ''}` : g.display_name });
          } catch {
            /* label is optional */
          }
          if (opts.share !== false) preferencesApi.shareLocation(p.lat, p.lng, p.accuracy_m).catch(() => undefined);
          resolve(p);
        },
        (err) => {
          set({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'idle', error: err.message });
          resolve(get().position);
        },
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
      );
    });
  },

  setManual: (p, label) => set({ position: p, label: label ?? null, status: 'granted' })
}));
