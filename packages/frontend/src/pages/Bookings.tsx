import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plane, BedDouble, Ticket, TrainFront, UtensilsCrossed, ShoppingBag, Search, type LucideIcon } from 'lucide-react';
import AppShell from '../components/AppShell';
import Painting from '../components/Painting';
import { LinksList } from '../components/Cards';
import { SectionTitle, ErrorNote, Ornament } from '../components/Section';
import { discoverApi, errorMessage } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import { pickArt } from '../lib/art';
import type { IntentLink } from '../lib/types';

type Kind = 'flights' | 'hotels' | 'activities' | 'transport' | 'food' | 'shopping' | 'search';
const KINDS: { key: Kind; label: string; icon: LucideIcon }[] = [
  { key: 'flights', label: 'Flights', icon: Plane },
  { key: 'hotels', label: 'Stays', icon: BedDouble },
  { key: 'activities', label: 'Tickets & tours', icon: Ticket },
  { key: 'transport', label: 'Trains & buses', icon: TrainFront },
  { key: 'food', label: 'Tables', icon: UtensilsCrossed },
  { key: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { key: 'search', label: 'Web search', icon: Search }
];

export default function Bookings() {
  const [params] = useSearchParams();
  const prefs = useAuthStore((s) => s.preferences);
  const { position } = useLocationStore();
  const [kind, setKind] = useState<Kind>((params.get('kind') as Kind) || 'flights');
  const [form, setForm] = useState({
    destination: params.get('destination') ?? '',
    origin: prefs?.home_city ?? '',
    depart: params.get('checkin') ?? '',
    return: params.get('checkout') ?? '',
    adults: 2,
    topic: '',
    keywords: ''
  });
  const [result, setResult] = useState<{ destination: string; origin?: string; engine: string; links: IntentLink[]; tips: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prefs?.home_city && !form.origin) setForm((f) => ({ ...f, origin: prefs.home_city ?? '' }));
  }, [prefs?.home_city, form.origin]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await discoverApi.bookings({
        kind,
        destination: form.destination || undefined,
        origin: form.origin || undefined,
        depart: form.depart || undefined,
        return: form.return || undefined,
        checkin: form.depart || undefined,
        checkout: form.return || undefined,
        adults: form.adults,
        topic: form.topic || undefined,
        keywords: form.keywords || undefined,
        lat: position?.lat,
        lng: position?.lng
      });
      setResult(r.data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const art = pickArt('harbour', 0);

  return (
    <AppShell>
      <SectionTitle eyebrow="Bookings" title="Find it, then book where you trust" />
      <p className="mb-5 max-w-prose text-sm text-umber/85">
        Grand Tour never takes a commission or hides prices. Tell it what you need and it opens ready-made searches on the best sites and on <span className="font-medium text-ink">{prefs?.search_engine ?? 'Google'}</span>, with your dates, destination and intent already filled in.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k.key} onClick={() => setKind(k.key)} className={`chip ${kind === k.key ? 'chip-active' : ''}`}>
            <k.icon size={13} /> {k.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <form onSubmit={submit} className="marble grid gap-3 p-5 sm:grid-cols-2">
          {kind !== 'search' && (
            <div className={kind === 'flights' || kind === 'transport' ? '' : 'sm:col-span-2'}>
              <label className="field">Destination</label>
              <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="input" placeholder="Rome" required />
            </div>
          )}
          {(kind === 'flights' || kind === 'transport') && (
            <div>
              <label className="field">From</label>
              <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="input" placeholder="Your city" />
            </div>
          )}
          {(kind === 'flights' || kind === 'hotels' || kind === 'transport') && (
            <>
              <div>
                <label className="field">{kind === 'hotels' ? 'Check-in' : 'Depart'}</label>
                <input type="date" value={form.depart} onChange={(e) => setForm({ ...form, depart: e.target.value })} className="input" />
              </div>
              <div>
                <label className="field">{kind === 'hotels' ? 'Check-out' : 'Return (optional)'}</label>
                <input type="date" value={form.return} onChange={(e) => setForm({ ...form, return: e.target.value })} className="input" min={form.depart} />
              </div>
            </>
          )}
          {(kind === 'flights' || kind === 'hotels') && (
            <div>
              <label className="field">Travellers</label>
              <input type="number" min={1} max={9} value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })} className="input" />
            </div>
          )}
          {(kind === 'activities' || kind === 'food' || kind === 'shopping') && (
            <div className="sm:col-span-2">
              <label className="field">{kind === 'food' ? 'Cuisine or mood' : kind === 'shopping' ? 'What are you looking to buy?' : 'Topic (e.g. Vatican, cooking class, boat tour)'}</label>
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="input" placeholder={kind === 'food' ? 'seafood, vegan, romantic…' : kind === 'shopping' ? 'leather bags, SIM card, hiking boots…' : 'skip-the-line Colosseum'} />
            </div>
          )}
          {kind === 'search' && (
            <div className="sm:col-span-2">
              <label className="field">Keywords</label>
              <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} className="input" placeholder="best rooftop bars Rome sunset" required />
            </div>
          )}
          <div className="sm:col-span-2">
            <button disabled={busy} className="btn-primary">
              {busy ? 'Preparing searches…' : 'Show me where to look'}
            </button>
          </div>
        </form>
        <div className="hidden lg:block">
          <Painting art={art} />
        </div>
      </div>

      <ErrorNote message={error} onClose={() => setError(null)} />

      {result && (
        <div className="animate-rise-in">
          <Ornament>Open in a new tab</Ornament>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="marble p-5">
              <h3 className="font-serif text-xl font-semibold">
                {result.destination}
                {result.origin && kind === 'flights' && <span className="text-umber/70"> from {result.origin}</span>}
              </h3>
              <div className="mt-3 grid gap-2">
                {result.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-md border border-umber/15 bg-ivory px-4 py-3 hover:border-gilt hover:shadow-card">
                    <div>
                      <div className="font-medium">{l.provider}</div>
                      <div className="text-xs text-umber/70">{l.label}</div>
                    </div>
                    <span className="text-gold">↗</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="marble p-5">
              <h4 className="small-caps mb-2 font-serif text-sm text-umber">Guide&apos;s tips</h4>
              <ul className="space-y-2 font-serif text-[15px]">
                {result.tips.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="text-gilt">❧</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <LinksList links={result.links.filter((l) => l.kind === 'search')} />
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
