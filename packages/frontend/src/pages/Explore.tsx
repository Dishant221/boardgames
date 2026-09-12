import { useEffect, useMemo, useState } from 'react';
import { Search, LocateFixed } from 'lucide-react';
import AppShell from '../components/AppShell';
import MapView from '../components/MapView';
import { PlaceRow } from '../components/Cards';
import { SectionTitle, Spinner, ErrorNote, Empty } from '../components/Section';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';
import { placesApi, errorMessage } from '../utils/api';
import type { GeoPoint, Place } from '../lib/types';
import { categoryEmoji } from '../lib/format';

const CATEGORIES = [
  'sights', 'museums', 'food', 'cafes', 'nightlife', 'hotels', 'transport', 'pharmacy', 'hospital', 'atm', 'supermarket', 'shopping', 'nature', 'events', 'wifi', 'toilets', 'police'
] as const;
const LABELS: Record<string, string> = {
  sights: 'Sights', museums: 'Museums', food: 'Food', cafes: 'Cafés', nightlife: 'Nightlife', hotels: 'Stays', transport: 'Transit', pharmacy: 'Pharmacy', hospital: 'Hospital',
  atm: 'ATM', supermarket: 'Groceries', shopping: 'Shopping', nature: 'Nature', events: 'Venues', wifi: 'Wi-Fi', toilets: 'Toilets', police: 'Police'
};

export default function Explore() {
  const { position, status, locate, setManual } = useLocationStore();
  const home = useAuthStore((s) => s.preferences);
  const [center, setCenter] = useState<GeoPoint | null>(null);
  const [centerLabel, setCenterLabel] = useState<string>('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('sights');
  const [radius, setRadius] = useState(1500);
  const [places, setPlaces] = useState<Place[]>([]);
  const [landmarks, setLandmarks] = useState<{ id: string; title: string; lat: number; lng: number; distance_m: number; url: string }[]>([]);
  const [saved, setSaved] = useState<Place[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Place | null>(null);

  useEffect(() => {
    if (status === 'idle') locate();
  }, [status, locate]);

  useEffect(() => {
    if (position && !center) setCenter(position);
    else if (!center && home?.home_lat && home.home_lng) {
      setCenter({ lat: home.home_lat, lng: home.home_lng });
      setCenterLabel(home.home_city ?? '');
    }
  }, [position, center, home]);

  useEffect(() => {
    placesApi.saved().then((r) => setSaved(r.data.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!center) return;
    setLoading(true);
    setError(null);
    Promise.all([placesApi.nearby(center.lat, center.lng, category, radius, 40), placesApi.landmarks(center.lat, center.lng, Math.min(radius, 3000))])
      .then(([p, l]) => {
        setPlaces(p.data.data);
        setLandmarks(l.data.data);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [center, category, radius]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (center && /^(find|where|nearest|nearby)/i.test(q)) {
        const r = await placesApi.find(q.replace(/^(find|where is|where are|nearest|nearby)\s*/i, ''), center.lat, center.lng);
        setPlaces(r.data.data);
      } else {
        const r = await placesApi.search(q, 1);
        const g = r.data.data[0];
        if (!g) setError('No place found for that search.');
        else {
          setCenter({ lat: g.lat, lng: g.lng });
          setCenterLabel(g.display_name);
          setManual({ lat: g.lat, lng: g.lng }, g.name);
        }
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const markers = useMemo(() => {
    const m = places.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name, sub: p.address, onClick: () => setSelected(p) }));
    if (position) m.unshift({ id: 'me', lat: position.lat, lng: position.lng, label: 'You are here', sub: undefined as unknown as string, onClick: () => undefined, kind: 'me' } as never);
    return m;
  }, [places, position]);

  return (
    <AppShell>
      <SectionTitle eyebrow="Explore" title={centerLabel ? `Around ${centerLabel.split(',')[0]}` : 'What is around you'} action={
        <button onClick={() => locate().then((p) => p && (setCenter(p), setCenterLabel('')))} className="btn-ghost">
          <LocateFixed size={15} /> Re-centre on me
        </button>
      } />

      <form onSubmit={search} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-umber/60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input !pl-9" placeholder="Search a city or address… or “find sushi”, “nearest pharmacy”" />
        </div>
        <button className="btn-ink">Go</button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`chip ${category === c ? 'chip-active' : ''}`}>
            <span>{categoryEmoji(c)}</span> {LABELS[c]}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-umber/80">
          Radius
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="input !w-auto !py-1">
            <option value={500}>500 m</option>
            <option value={1000}>1 km</option>
            <option value={1500}>1.5 km</option>
            <option value={3000}>3 km</option>
            <option value={5000}>5 km</option>
          </select>
        </label>
      </div>

      <ErrorNote message={error} onClose={() => setError(null)} />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          {center ? (
            <MapView center={selected ? { lat: selected.lat, lng: selected.lng } : center} zoom={selected ? 17 : radius > 2000 ? 13 : 15} markers={markers} className="h-[420px] lg:h-[560px]" onClick={(p) => { setCenter(p); setCenterLabel(''); }} />
          ) : (
            <div className="marble grid h-[420px] place-items-center text-umber/70">
              {status === 'denied' ? 'Location blocked - search a city above or set a home city in Settings.' : 'Locating you…'}
            </div>
          )}
          {landmarks.length > 0 && (
            <div className="mt-4">
              <h4 className="small-caps mb-2 font-serif text-sm text-umber">What is this? · Wikipedia landmarks nearby</h4>
              <div className="flex flex-wrap gap-2">
                {landmarks.slice(0, 12).map((l) => (
                  <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="chip">
                    🏛️ {l.title} <span className="text-umber/60">· {l.distance_m} m</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
          {loading && <Spinner label="Consulting the maps…" />}
          {!loading && places.length === 0 && <Empty title={`No ${LABELS[category].toLowerCase()} found in this radius`} hint="Try a larger radius or another category." />}
          {places.map((p) => (
            <PlaceRow key={p.id} place={p} onPick={setSelected} />
          ))}
        </div>
      </div>

      {saved.length > 0 && (
        <section className="mt-10">
          <SectionTitle eyebrow="Your collection" title="Saved places" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((p) => (
              <PlaceRow key={p.id} place={p} compact onPick={(pl) => { setCenter({ lat: pl.lat, lng: pl.lng }); setSelected(pl); }} />
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
