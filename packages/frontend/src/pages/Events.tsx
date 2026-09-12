import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import AppShell from '../components/AppShell';
import MapView from '../components/MapView';
import { PlaceRow, LinksList } from '../components/Cards';
import { SectionTitle, Spinner, ErrorNote, Empty } from '../components/Section';
import { discoverApi, placesApi, errorMessage } from '../utils/api';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';
import type { GeoPoint, IntentLink, LiveEvent, Place } from '../lib/types';
import { fmtDate } from '../lib/format';

export default function Events() {
  const { position, status, locate } = useLocationStore();
  const home = useAuthStore((s) => s.preferences);
  const [center, setCenter] = useState<GeoPoint | null>(null);
  const [q, setQ] = useState('');
  const [where, setWhere] = useState('');
  const [data, setData] = useState<{ place: string; live: LiveEvent[]; venues: Place[]; links: IntentLink[]; live_source: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'idle') locate();
  }, [status, locate]);

  useEffect(() => {
    if (!center) {
      if (position) setCenter(position);
      else if (home?.home_lat && home.home_lng) setCenter({ lat: home.home_lat, lng: home.home_lng });
    }
  }, [position, home, center]);

  useEffect(() => {
    if (!center) return;
    setLoading(true);
    setError(null);
    discoverApi
      .events(center.lat, center.lng, q || undefined)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [center, q]);

  const goWhere = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!where.trim()) return;
    try {
      const r = await placesApi.search(where, 1);
      const g = r.data.data[0];
      if (g) setCenter({ lat: g.lat, lng: g.lng });
      else setError('Place not found');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <AppShell>
      <SectionTitle eyebrow="Events" title={data ? `What's on around ${data.place.split(',')[0]}` : "What's on"} />
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <form onSubmit={goWhere} className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-umber/60" />
          <input value={where} onChange={(e) => setWhere(e.target.value)} className="input !pl-9" placeholder="Another city…" />
        </form>
        <input value={q} onChange={(e) => setQ(e.target.value)} className="input" placeholder="Filter: jazz, opera, football, comedy…" />
        <button onClick={() => locate().then((p) => p && setCenter(p))} className="btn-ghost">Near me</button>
      </div>
      <ErrorNote message={error} onClose={() => setError(null)} />
      {loading && <Spinner label="Checking venues and listings…" />}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div>
            {data.live.length > 0 ? (
              <>
                <h4 className="small-caps mb-2 font-serif text-sm text-umber">Live listings {data.live_source && `· ${data.live_source}`}</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.live.map((e) => (
                    <a key={e.id} href={e.url} target="_blank" rel="noreferrer" className="marble overflow-hidden hover:border-gilt">
                      {e.image && <img src={e.image} alt="" className="h-28 w-full object-cover" />}
                      <div className="p-3">
                        <div className="font-serif font-semibold leading-tight">{e.name}</div>
                        <div className="text-xs text-umber/80">
                          {e.venue} · {e.start ? fmtDate(e.start, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'date TBA'}
                        </div>
                        {e.price_min && <div className="text-xs text-gold">from {e.price_min} {e.currency}</div>}
                      </div>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div className="marble p-4 text-sm text-umber/80">
                Live ticket listings appear here when a Ticketmaster key is configured. Meanwhile, the venue map and the listing links below cover concerts, theatre, festivals and meetups.
              </div>
            )}
            <div className="mt-5">
              <LinksList title="Listings & tickets" links={data.links} />
            </div>
            <div className="mt-6">
              <h4 className="small-caps mb-2 font-serif text-sm text-umber">Venues nearby</h4>
              {data.venues.length === 0 && <Empty title="No venues found nearby" />}
              <div className="grid gap-2 sm:grid-cols-2">
                {data.venues.slice(0, 12).map((v) => (
                  <PlaceRow key={v.id} place={v} compact />
                ))}
              </div>
            </div>
          </div>
          <div>
            {center && (
              <MapView
                center={center}
                zoom={13}
                fitToMarkers
                className="h-[480px]"
                markers={[
                  ...data.venues.map((v) => ({ id: v.id, lat: v.lat, lng: v.lng, label: v.name, sub: 'Venue' })),
                  ...data.live.filter((e) => e.lat && e.lng).map((e) => ({ id: e.id, lat: e.lat!, lng: e.lng!, label: e.name, sub: e.venue ?? undefined, kind: 'gold' as const }))
                ]}
              />
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
