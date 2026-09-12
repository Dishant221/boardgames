import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sparkles, Plus, Trash2, ChevronUp, ChevronDown, MessageCircle, ExternalLink } from 'lucide-react';
import AppShell from '../components/AppShell';
import Painting from '../components/Painting';
import MapView from '../components/MapView';
import { SectionTitle, Spinner, ErrorNote } from '../components/Section';
import { tripsApi, placesApi, errorMessage } from '../utils/api';
import { artForDestination } from '../lib/art';
import type { Trip, TripDay, TripStop, StopKind, Place, GeoPoint } from '../lib/types';
import { categoryEmoji, fmtDate, fmtDistance, fmtDuration } from '../lib/format';

const KINDS: StopKind[] = ['sight', 'food', 'hotel', 'transport', 'flight', 'activity', 'event', 'note'];

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [legs, setLegs] = useState<{ from: string; to: string; route: { distance_m: number; duration_s: number; geometry: GeoPoint[] } | null }[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [newStop, setNewStop] = useState<{ name: string; kind: StopKind; start_time: string; notes: string }>({ name: '', kind: 'sight', start_time: '', notes: '' });
  const [suggestions, setSuggestions] = useState<Place[]>([]);

  const load = async () => {
    if (!id) return;
    try {
      const r = await tripsApi.get(id);
      setTrip(r.data.data);
      if (!activeDay && r.data.data.days?.[0]) setActiveDay(r.data.data.days[0].id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const day = useMemo(() => trip?.days?.find((d) => d.id === activeDay) ?? trip?.days?.[0] ?? null, [trip, activeDay]);

  useEffect(() => {
    if (!id || !day) return;
    if (day.stops.filter((s) => s.lat !== null).length < 2) {
      setLegs([]);
      return;
    }
    tripsApi.legs(id, day.id).then((r) => setLegs(r.data.data)).catch(() => setLegs([]));
  }, [id, day]);

  const autoplan = async () => {
    if (!id) return;
    setPlanning(true);
    setError(null);
    try {
      const r = await tripsApi.autoplan(id);
      setTrip(r.data.data);
      setActiveDay(r.data.data.days?.[0]?.id ?? null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPlanning(false);
    }
  };

  const addDay = async () => {
    if (!id) return;
    await tripsApi.addDay(id);
    await load();
  };

  const removeDay = async (dayId: string) => {
    if (!id || !confirm('Delete this day and its stops?')) return;
    const r = await tripsApi.deleteDay(id, dayId);
    setTrip(r.data.data);
    setActiveDay(r.data.data.days?.[0]?.id ?? null);
  };

  const removeStop = async (stopId: string) => {
    if (!id) return;
    const r = await tripsApi.deleteStop(id, stopId);
    setTrip(r.data.data);
  };

  const move = async (d: TripDay, index: number, dir: -1 | 1) => {
    if (!id) return;
    const stops = [...d.stops];
    const j = index + dir;
    if (j < 0 || j >= stops.length) return;
    [stops[index], stops[j]] = [stops[j], stops[index]];
    const r = await tripsApi.reorder(id, stops.map((s, i) => ({ stop_id: s.id, day_id: d.id, position: i })));
    setTrip(r.data.data);
  };

  const suggest = async (q: string) => {
    setNewStop((s) => ({ ...s, name: q }));
    if (q.length < 3 || !trip?.dest_lat || !trip.dest_lng) return setSuggestions([]);
    try {
      const r = await placesApi.find(q, trip.dest_lat, trip.dest_lng);
      setSuggestions(r.data.data.slice(0, 5));
    } catch {
      setSuggestions([]);
    }
  };

  const submitStop = async (e: React.FormEvent, d: TripDay, picked?: Place) => {
    e.preventDefault();
    if (!id) return;
    const body: Record<string, unknown> = {
      name: picked?.name ?? newStop.name,
      kind: newStop.kind,
      start_time: newStop.start_time || null,
      notes: newStop.notes || null,
      lat: picked?.lat,
      lng: picked?.lng,
      address: picked?.address,
      source: picked?.source
    };
    await tripsApi.addStop(id, d.id, body);
    setNewStop({ name: '', kind: 'sight', start_time: '', notes: '' });
    setSuggestions([]);
    setAdding(null);
    await load();
  };

  const deleteTrip = async () => {
    if (!id || !confirm('Delete this whole trip?')) return;
    await tripsApi.remove(id);
    navigate('/trips');
  };

  if (loading) return <AppShell><Spinner label="Opening your itinerary…" /></AppShell>;
  if (!trip) return <AppShell><ErrorNote message={error ?? 'Trip not found'} /><Link to="/trips" className="text-lapis">← Back to trips</Link></AppShell>;

  const art = artForDestination(trip.destination, trip.id);
  const dayMarkers = (day?.stops ?? []).filter((s) => s.lat !== null && s.lng !== null).map((s, i) => ({ id: s.id, lat: s.lat!, lng: s.lng!, label: `${i + 1}. ${s.name}`, sub: s.start_time ?? undefined, kind: s.kind === 'food' ? ('gold' as const) : ('default' as const) }));
  const polyline = legs.flatMap((l) => l.route?.geometry ?? []);
  const totals = legs.reduce((acc, l) => ({ d: acc.d + (l.route?.distance_m ?? 0), t: acc.t + (l.route?.duration_s ?? 0) }), { d: 0, t: 0 });

  return (
    <AppShell>
      <div className="mb-2 text-xs"><Link to="/trips" className="text-lapis hover:underline">← All trips</Link></div>
      <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Painting art={art} ornate />
        <div>
          <div className="small-caps text-xs text-gold">{trip.status} · {trip.destination}</div>
          <h1 className="font-serif text-4xl font-semibold leading-tight">{trip.title}</h1>
          {trip.start_date && (
            <div className="mt-1 text-sm text-umber/80">
              {fmtDate(trip.start_date, { weekday: 'long', day: 'numeric', month: 'long' })} {trip.end_date && `– ${fmtDate(trip.end_date, { weekday: 'long', day: 'numeric', month: 'long' })}`}
            </div>
          )}
          {trip.notes && <p className="mt-3 font-serif italic text-umber">“{trip.notes}”</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={autoplan} disabled={planning} className="btn-gilt">
              <Sparkles size={16} /> {planning ? 'Drafting your days…' : trip.days?.some((d) => d.stops.length) ? 'Re-draft with AI' : 'Auto-plan with AI'}
            </button>
            <Link to={`/assistant?trip=${trip.id}&q=${encodeURIComponent(`Help me with my trip to ${trip.destination}`)}`} className="btn-ghost">
              <MessageCircle size={15} /> Ask the guide about this trip
            </Link>
            <Link to={`/guide/${encodeURIComponent(trip.destination.split(',')[0])}`} className="btn-ghost">
              Destination guide
            </Link>
            <Link to={`/bookings?destination=${encodeURIComponent(trip.destination)}&checkin=${trip.start_date ?? ''}&checkout=${trip.end_date ?? ''}`} className="btn-ghost">
              Book flights & stays
            </Link>
            <button onClick={deleteTrip} className="btn-ghost !text-venetian ml-auto">
              <Trash2 size={15} /> Delete
            </button>
          </div>
          <ErrorNote message={error} onClose={() => setError(null)} />
          {planning && <p className="mt-3 text-xs text-umber/70">The planner fetches real sights, museums, restaurants and the forecast, then arranges them by proximity and weather. This uses your daily AI allowance once.</p>}
        </div>
      </section>

      {/* Day tabs */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {trip.days?.map((d) => (
            <button key={d.id} onClick={() => setActiveDay(d.id)} className={`chip ${day?.id === d.id ? 'chip-active' : ''}`}>
              <span className="font-display">{d.day_index}</span>
              <span>{d.date ? fmtDate(d.date) : d.title}</span>
              <span className="opacity-70">· {d.stops.length}</span>
            </button>
          ))}
          <button onClick={addDay} className="chip">
            <Plus size={12} /> Add day
          </button>
        </div>

        {day && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div>
              <SectionTitle
                title={day.title ?? `Day ${day.day_index}`}
                eyebrow={day.date ? fmtDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' }) : undefined}
                action={
                  <button onClick={() => removeDay(day.id)} className="text-xs text-venetian hover:underline">
                    Remove day
                  </button>
                }
              />
              {day.notes && <p className="mb-3 font-serif italic text-umber">{day.notes}</p>}
              {totals.d > 0 && (
                <div className="mb-3 text-xs text-umber/80">
                  Walking between stops: {fmtDistance(totals.d)} · about {fmtDuration(totals.t)}
                </div>
              )}
              <ol className="relative space-y-2 border-l-2 border-gilt/50 pl-5">
                {day.stops.length === 0 && <li className="text-sm text-umber/70">No stops yet - add one below or let the AI draft the day.</li>}
                {day.stops.map((s, i) => (
                  <StopItem key={s.id} stop={s} index={i} total={day.stops.length} onUp={() => move(day, i, -1)} onDown={() => move(day, i, 1)} onDelete={() => removeStop(s.id)} />
                ))}
              </ol>

              {adding === day.id ? (
                <form onSubmit={(e) => submitStop(e, day)} className="marble relative mt-4 grid gap-2 p-4 sm:grid-cols-[1fr_auto_auto]">
                  <div className="relative sm:col-span-3">
                    <input value={newStop.name} onChange={(e) => suggest(e.target.value)} className="input" placeholder="Place name (we will look it up around your destination)" autoFocus required />
                    {suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-umber/20 bg-marble shadow-card">
                        {suggestions.map((p) => (
                          <button type="button" key={p.id} onClick={(e) => submitStop(e as unknown as React.FormEvent, day, p)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-parchment">
                            <span>{categoryEmoji(p.category)}</span>
                            <span className="font-medium">{p.name}</span>
                            <span className="truncate text-xs text-umber/70">{p.address}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <select value={newStop.kind} onChange={(e) => setNewStop({ ...newStop, kind: e.target.value as StopKind })} className="input">
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {categoryEmoji(k)} {k}
                      </option>
                    ))}
                  </select>
                  <input type="time" value={newStop.start_time} onChange={(e) => setNewStop({ ...newStop, start_time: e.target.value })} className="input" />
                  <input value={newStop.notes} onChange={(e) => setNewStop({ ...newStop, notes: e.target.value })} className="input" placeholder="Notes" />
                  <div className="flex gap-2 sm:col-span-3">
                    <button className="btn-primary">Add stop</button>
                    <button type="button" onClick={() => setAdding(null)} className="btn-ghost">Cancel</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setAdding(day.id)} className="btn-ghost mt-4">
                  <Plus size={15} /> Add a stop
                </button>
              )}
            </div>
            <div>
              {trip.dest_lat && trip.dest_lng ? (
                <MapView center={{ lat: trip.dest_lat, lng: trip.dest_lng }} zoom={13} markers={dayMarkers} polyline={polyline} fitToMarkers={dayMarkers.length > 0} className="h-[420px] lg:h-[560px]" />
              ) : (
                <div className="marble grid h-[420px] place-items-center text-umber/70">No coordinates for this destination.</div>
              )}
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function StopItem({ stop, index, total, onUp, onDown, onDelete }: { stop: TripStop; index: number; total: number; onUp: () => void; onDown: () => void; onDelete: () => void }) {
  return (
    <li className="marble relative p-3">
      <span className="absolute -left-[31px] top-4 grid h-6 w-6 place-items-center rounded-full bg-terracotta font-display text-xs text-ivory shadow-inset">{index + 1}</span>
      <div className="flex items-start gap-3">
        <span className="text-xl">{categoryEmoji(stop.kind)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {stop.start_time && <span className="font-display text-sm text-gold">{stop.start_time}{stop.end_time ? `–${stop.end_time}` : ''}</span>}
            <span className="font-serif text-lg font-semibold">{stop.name}</span>
          </div>
          {stop.address && <div className="text-xs text-umber/70">{stop.address}</div>}
          {stop.notes && <div className="mt-1 text-sm text-ink/85">{stop.notes}</div>}
          <div className="mt-1 flex gap-3 text-xs">
            {stop.lat !== null && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-lapis hover:underline">
                <ExternalLink size={11} /> Map
              </a>
            )}
            {stop.booking_url && (
              <a href={stop.booking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-lapis hover:underline">
                <ExternalLink size={11} /> Booking
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col text-umber/60">
          <button onClick={onUp} disabled={index === 0} className="rounded p-0.5 hover:text-ink disabled:opacity-30"><ChevronUp size={14} /></button>
          <button onClick={onDown} disabled={index === total - 1} className="rounded p-0.5 hover:text-ink disabled:opacity-30"><ChevronDown size={14} /></button>
          <button onClick={onDelete} className="rounded p-0.5 hover:text-venetian"><Trash2 size={14} /></button>
        </div>
      </div>
    </li>
  );
}
