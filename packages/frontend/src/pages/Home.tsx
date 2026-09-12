import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, MessageCircle, Route, BookOpen, Ticket, CalendarDays, Sparkles, Phone } from 'lucide-react';
import AppShell from '../components/AppShell';
import Painting from '../components/Painting';
import { SectionTitle, Ornament } from '../components/Section';
import { WeatherCard, PlaceRow } from '../components/Cards';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import { discoverApi, placesApi, tripsApi, assistantApi } from '../utils/api';
import { artForDestination, pickArt } from '../lib/art';
import type { Conversation, Place, Trip, Weather } from '../lib/types';
import { fmtDate } from '../lib/format';

const QUICK = [
  { to: '/assistant', icon: MessageCircle, title: 'Ask the guide', text: 'Chat about where to eat, what to see, how to get there.' },
  { to: '/assistant?mode=call', icon: Phone, title: 'Call the guide', text: 'Hands-free voice mode for when you are walking.' },
  { to: '/explore', icon: MapPin, title: 'What is around me', text: 'Sights, food, pharmacies, transit and Wi-Fi nearby.' },
  { to: '/trips', icon: Route, title: 'Plan an itinerary', text: 'Day-by-day plans, auto-drafted from real places.' },
  { to: '/guide', icon: BookOpen, title: 'Destination guide', text: 'Essentials, phrases, emergency numbers, weather.' },
  { to: '/bookings', icon: Ticket, title: 'Flights, stays, tickets', text: 'Open pre-filled searches on your favourite sites.' },
  { to: '/events', icon: CalendarDays, title: 'Events nearby', text: 'Concerts, shows and venues around you.' }
];

export default function Home() {
  const navigate = useNavigate();
  const { user, preferences } = useAuthStore();
  const { position, label, status, locate } = useLocationStore();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [nearby, setNearby] = useState<Place[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (status === 'idle') locate();
  }, [status, locate]);

  useEffect(() => {
    const p = position ?? (preferences?.home_lat && preferences.home_lng ? { lat: preferences.home_lat, lng: preferences.home_lng } : null);
    if (!p) return;
    discoverApi.weather(p.lat, p.lng, 7).then((r) => setWeather(r.data.data)).catch(() => undefined);
    placesApi.nearby(p.lat, p.lng, 'sights', 1500, 6).then((r) => setNearby(r.data.data)).catch(() => undefined);
  }, [position, preferences?.home_lat, preferences?.home_lng]);

  useEffect(() => {
    tripsApi.list().then((r) => setTrips(r.data.data)).catch(() => undefined);
    assistantApi.conversations().then((r) => setConvs(r.data.data.slice(0, 4))).catch(() => undefined);
  }, []);

  const hero = pickArt('hero', new Date().getDate());
  const where = label ?? preferences?.home_city ?? null;

  return (
    <AppShell>
      {/* Hero */}
      <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="animate-rise-in">
          <div className="small-caps text-xs text-gold">Atrium</div>
          <h1 className="mt-1 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
            Buongiorno, {user?.username}.
            <br />
            <span className="italic text-umber">Where shall we wander today?</span>
          </h1>
          <p className="mt-3 max-w-prose text-umber/90">
            {where ? (
              <>
                You are near <span className="font-semibold text-ink">{where}</span>. Ask me anything about the neighbourhood, or let me plan the day.
              </>
            ) : (
              <>Share your location or set a home city, and I will start guiding you locally.</>
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) navigate(`/assistant?q=${encodeURIComponent(prompt.trim())}`);
            }}
            className="mt-5 flex gap-2"
          >
            <input value={prompt} onChange={(e) => setPrompt(e.target.value)} className="input flex-1 !py-3 text-base" placeholder="Where can I get good coffee near me? · Plan 2 days in Rome · Is it going to rain?" />
            <button className="btn-primary !px-5">
              <Sparkles size={16} /> Ask
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {['Best gelato near me', 'How do I get to the train station?', 'What is worth seeing within 15 minutes walk?', 'Any concerts tonight?'].map((s) => (
              <button key={s} onClick={() => navigate(`/assistant?q=${encodeURIComponent(s)}`)} className="chip">
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="animate-fade-in">
          <Painting art={hero} ornate width={1400} />
        </div>
      </section>

      <Ornament>The Grand Tour</Ornament>

      {/* Quick actions */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className="marble group flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:border-gilt">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-ink text-gilt shadow-inset group-hover:bg-terracotta group-hover:text-ivory">
              <q.icon size={18} />
            </span>
            <div>
              <div className="font-serif text-lg font-semibold leading-tight">{q.title}</div>
              <div className="text-xs text-umber/80">{q.text}</div>
            </div>
          </Link>
        ))}
      </section>

      {/* Today */}
      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <SectionTitle eyebrow="Today" title={where ? `Weather in ${where.split(',')[0]}` : 'Weather'} />
          {weather ? <WeatherCard weather={weather} /> : <div className="marble p-6 text-sm text-umber/70">{status === 'denied' ? 'Location is blocked. Set a home city in Settings to see weather.' : 'Waiting for your location…'}</div>}
        </div>
        <div>
          <SectionTitle eyebrow="Within a stroll" title="Landmarks nearby" action={<Link to="/explore" className="text-sm text-lapis hover:underline">Explore all →</Link>} />
          <div className="space-y-2">
            {nearby.length ? nearby.map((p) => <PlaceRow key={p.id} place={p} compact />) : <div className="marble p-6 text-sm text-umber/70">Nothing loaded yet - share your location to see what is around.</div>}
          </div>
        </div>
      </section>

      {/* Trips & conversations */}
      <section className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionTitle eyebrow="Itineraries" title="Your journeys" action={<Link to="/trips" className="text-sm text-lapis hover:underline">All trips →</Link>} />
          {trips.length === 0 ? (
            <div className="marble p-6 text-sm text-umber/70">
              No trips yet.{' '}
              <Link to="/trips" className="text-lapis underline">
                Start one
              </Link>{' '}
              and let the guide draft your days.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {trips.slice(0, 4).map((t) => {
                const art = artForDestination(t.destination, t.id);
                return (
                  <Link key={t.id} to={`/trips/${t.id}`} className="group">
                    <Painting art={art} caption={false} width={800} aspect="aspect-[16/10]" />
                    <div className="mt-2">
                      <div className="font-serif text-lg font-semibold group-hover:text-terracotta">{t.title}</div>
                      <div className="text-xs text-umber/80">
                        {t.destination} {t.start_date && `· ${fmtDate(t.start_date)}${t.end_date ? ` – ${fmtDate(t.end_date)}` : ''}`}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <SectionTitle eyebrow="Assistant" title="Recent conversations" />
          <div className="space-y-2">
            {convs.length === 0 && <div className="marble p-6 text-sm text-umber/70">Your conversations with the guide will appear here.</div>}
            {convs.map((c) => (
              <Link key={c.id} to={`/assistant/${c.id}`} className="marble flex items-center gap-3 p-3 hover:border-gilt">
                <span className="text-lg">{c.mode === 'call' ? '📞' : '💬'}</span>
                <div className="min-w-0">
                  <div className="truncate font-serif font-semibold">{c.title}</div>
                  <div className="text-xs text-umber/70">
                    {c.message_count} messages · {fmtDate(c.updated_at)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
