import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, LocateFixed, ShieldAlert, Plug, Coins, Languages, Phone, Car, type LucideIcon } from 'lucide-react';
import AppShell from '../components/AppShell';
import Painting from '../components/Painting';
import MapView from '../components/MapView';
import { PlaceRow, WeatherCard, LinksList } from '../components/Cards';
import { SectionTitle, Spinner, ErrorNote, Ornament } from '../components/Section';
import { guideApi, errorMessage } from '../utils/api';
import { useLocationStore } from '../store/locationStore';
import { pickArt, seedFrom } from '../lib/art';
import type { GuideData } from '../lib/types';

export default function Guide() {
  const { query } = useParams<{ query?: string }>();
  const navigate = useNavigate();
  const { position, locate } = useLocationStore();
  const [q, setQ] = useState(query ?? '');
  const [data, setData] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError(null);
    guideApi
      .byQuery(query)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [query]);

  const useHere = async () => {
    const p = position ?? (await locate());
    if (!p) return setError('Could not get your location.');
    setLoading(true);
    setError(null);
    try {
      const r = await guideApi.byCoords(p.lat, p.lng);
      setData(r.data.data);
      setQ(r.data.data.place.label);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const art = data ? pickArt(data.art_keyword, seedFrom(data.place.label)) : pickArt('rome', 2);

  return (
    <AppShell>
      <SectionTitle eyebrow="Destination guide" title={data ? data.place.label : 'Know before you go'} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/guide/${encodeURIComponent(q.trim())}`);
        }}
        className="mb-6 flex flex-wrap gap-2"
      >
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-umber/60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input !pl-9" placeholder="Rome, Kyoto, Lisbon, Cape Town…" />
        </div>
        <button className="btn-ink">Open guide</button>
        <button type="button" onClick={useHere} className="btn-ghost">
          <LocateFixed size={15} /> Where I am
        </button>
      </form>

      <ErrorNote message={error} onClose={() => setError(null)} />
      {loading && <Spinner label="Assembling your guide from Wikivoyage, OpenStreetMap and Open-Meteo…" />}

      {!data && !loading && (
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <Painting art={art} ornate />
          <div className="font-serif text-lg text-umber">
            <p>
              Type a city to get a one-page briefing: background, weather, currency, emergency numbers, plug types, key phrases, top sights, where to eat, transit hubs and ready-made booking searches.
            </p>
            <p className="mt-3 text-sm text-umber/70">Popular: {['Rome', 'Venice', 'Florence', 'Paris', 'Amsterdam', 'Barcelona', 'Vienna', 'Athens'].map((c, i) => (
              <Link key={c} to={`/guide/${c}`} className="text-lapis hover:underline">
                {c}{i < 7 ? ', ' : ''}
              </Link>
            ))}</p>
          </div>
        </div>
      )}

      {data && (
        <div className="animate-fade-in">
          <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <Painting art={art} ornate />
            <div>
              {data.summary && (
                <div className="marble p-5">
                  <div className="small-caps text-xs text-gold">{data.summary.source === 'wikivoyage' ? 'Wikivoyage' : 'Wikipedia'}</div>
                  <h3 className="font-serif text-2xl font-semibold">{data.summary.title}</h3>
                  {data.summary.description && <div className="text-sm italic text-umber/80">{data.summary.description}</div>}
                  <p className="mt-2 text-sm leading-relaxed text-ink/90">{data.summary.extract}</p>
                  <a href={data.summary.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-lapis hover:underline">
                    Read the full article →
                  </a>
                </div>
              )}
              {data.weather && <div className="mt-4"><WeatherCard weather={data.weather} title="Forecast" /></div>}
            </div>
          </section>

          <Ornament>Essentials</Ornament>

          {data.essentials && (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Essential icon={ShieldAlert} title="Emergency">
                <div className="font-display text-2xl text-terracotta">{data.essentials.emergency.general ?? data.essentials.emergency.police}</div>
                <div className="text-xs text-umber/80">
                  Police {data.essentials.emergency.police} · Ambulance {data.essentials.emergency.ambulance} · Fire {data.essentials.emergency.fire}
                </div>
              </Essential>
              <Essential icon={Coins} title="Money">
                <div className="font-display text-2xl">{data.essentials.currencies.map((c) => `${c.symbol ?? ''} ${c.code}`).join(', ') || '—'}</div>
                <div className="text-xs text-umber/80">{data.essentials.currencies.map((c) => c.name).join(', ')}</div>
              </Essential>
              <Essential icon={Plug} title="Plugs & power">
                <div className="font-display text-2xl">Type {data.essentials.plugs.types.join('/')}</div>
                <div className="text-xs text-umber/80">
                  {data.essentials.plugs.voltage} · {data.essentials.plugs.frequency}
                </div>
              </Essential>
              <Essential icon={Languages} title="Language">
                <div className="font-display text-xl">{data.essentials.languages.slice(0, 2).join(', ') || '—'}</div>
                <div className="text-xs text-umber/80">
                  {data.essentials.calling_code && (
                    <span className="mr-2 inline-flex items-center gap-1">
                      <Phone size={11} /> {data.essentials.calling_code}
                    </span>
                  )}
                  {data.essentials.driving_side && (
                    <span className="inline-flex items-center gap-1">
                      <Car size={11} /> drive on the {data.essentials.driving_side}
                    </span>
                  )}
                </div>
              </Essential>
            </section>
          )}

          {data.phrases && (
            <section className="marble mt-4 grid gap-2 p-4 sm:grid-cols-3 lg:grid-cols-6">
              {(['hello', 'thanks', 'please', 'help', 'bill', 'where'] as const).map((k) => (
                <div key={k}>
                  <div className="small-caps text-[11px] text-gold">{k === 'bill' ? 'the bill' : k === 'where' ? 'where is…' : k}</div>
                  <div className="font-serif text-base font-semibold">{data.phrases![k]}</div>
                </div>
              ))}
            </section>
          )}

          <Ornament>Around town</Ornament>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <MapView
              center={{ lat: data.place.lat, lng: data.place.lng }}
              zoom={13}
              fitToMarkers
              className="h-[420px]"
              markers={[
                ...data.sights.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name, sub: 'Sight' })),
                ...data.food.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name, sub: 'Food', kind: 'gold' as const })),
                ...data.transit.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name, sub: 'Transit', kind: 'me' as const }))
              ]}
            />
            <div className="grid gap-4">
              <div>
                <h4 className="small-caps mb-2 font-serif text-sm text-umber">Top sights</h4>
                <div className="space-y-1.5">{data.sights.slice(0, 6).map((p) => <PlaceRow key={p.id} place={p} compact />)}</div>
              </div>
              <div>
                <h4 className="small-caps mb-2 font-serif text-sm text-umber">Where to eat</h4>
                <div className="space-y-1.5">{data.food.slice(0, 4).map((p) => <PlaceRow key={p.id} place={p} compact />)}</div>
              </div>
            </div>
          </section>

          {data.events.length > 0 && (
            <section className="mt-8">
              <h4 className="small-caps mb-2 font-serif text-sm text-umber">Live events</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {data.events.map((e) => (
                  <a key={e.id} href={e.url} target="_blank" rel="noreferrer" className="marble p-3 hover:border-gilt">
                    <div className="font-serif font-semibold">{e.name}</div>
                    <div className="text-xs text-umber/80">{e.venue} · {e.start?.slice(0, 10)}</div>
                  </a>
                ))}
              </div>
            </section>
          )}

          <Ornament>Book & search</Ornament>
          <section className="grid gap-5 md:grid-cols-2">
            <LinksList title="Stay" links={data.links.stay} />
            <LinksList title="Do & tickets" links={data.links.do} />
            <LinksList title="Events" links={data.links.events} />
            {data.links.transport.length > 0 && <LinksList title="Getting there" links={data.links.transport} />}
            <LinksList title="Maps" links={data.links.maps} />
            <LinksList title="Search" links={data.links.search} />
          </section>
          <p className="mt-6 text-xs text-umber/60">Sources: {data.sources.join(', ')}.</p>
        </div>
      )}
    </AppShell>
  );
}

function Essential({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="marble p-4">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-umber/80">
        <Icon size={14} className="text-gold" /> {title}
      </div>
      {children}
    </div>
  );
}
