import { useState } from 'react';
import { ExternalLink, Bookmark, BookmarkCheck, Navigation, Clock, Phone, Globe, Star } from 'lucide-react';
import type { Card, IntentLink, Place, RouteResult, Weather } from '../lib/types';
import { categoryEmoji, fmtDistance, fmtDuration, fmtTemp, weatherEmoji, fmtDate } from '../lib/format';
import { placesApi } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';

/* ------------------------------------------------------------- PlaceCard */
export function PlaceRow({ place, onPick, compact = false }: { place: Place; onPick?: (p: Place) => void; compact?: boolean }) {
  const units = useAuthStore((s) => s.preferences?.units ?? 'metric');
  const me = useLocationStore((s) => s.position);
  const [saved, setSaved] = useState(false);
  const save = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saved) return;
    try {
      await placesApi.save({ name: place.name, category: place.category, lat: place.lat, lng: place.lng, address: place.address, source: place.source, source_id: place.source_id, tags: place.tags });
      setSaved(true);
    } catch {
      /* ignore */
    }
  };
  const dir = `https://www.google.com/maps/dir/?api=1${me ? `&origin=${me.lat},${me.lng}` : ''}&destination=${place.lat},${place.lng}&travelmode=walking`;
  return (
    <div onClick={() => onPick?.(place)} className={`group flex items-start gap-3 rounded-lg border border-umber/10 bg-marble/70 p-3 transition hover:border-gilt/60 hover:shadow-card ${onPick ? 'cursor-pointer' : ''}`}>
      <span className="text-xl leading-none">{categoryEmoji(place.category)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h4 className="truncate font-serif text-base font-semibold text-ink">{place.name}</h4>
          {place.rating && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-gold">
              <Star size={11} fill="currentColor" /> {place.rating}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-umber/80">
          {place.distance_m !== undefined && <span className="font-medium text-terracotta">{fmtDistance(place.distance_m, units)}</span>}
          {place.distance_m !== undefined && (place.address || place.tags?.cuisine) && ' · '}
          {place.tags?.cuisine && <span className="capitalize">{place.tags.cuisine.replace(/_/g, ' ').replace(/;/g, ', ')} · </span>}
          {place.address}
        </p>
        {!compact && (place.opening_hours || place.phone || place.website) && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-umber/70">
            {place.opening_hours && (
              <span className="inline-flex items-center gap-1">
                <Clock size={11} /> {place.opening_hours.slice(0, 40)}
              </span>
            )}
            {place.phone && (
              <a href={`tel:${place.phone}`} className="inline-flex items-center gap-1 hover:text-terracotta" onClick={(e) => e.stopPropagation()}>
                <Phone size={11} /> {place.phone}
              </a>
            )}
            {place.website && (
              <a href={place.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-terracotta" onClick={(e) => e.stopPropagation()}>
                <Globe size={11} /> website
              </a>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1 opacity-70 group-hover:opacity-100">
        <a href={dir} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="rounded p-1 text-lapis hover:bg-lapis/10" title="Directions">
          <Navigation size={15} />
        </a>
        <button onClick={save} className={`rounded p-1 hover:bg-gilt/20 ${saved ? 'text-gold' : 'text-umber'}`} title={saved ? 'Saved' : 'Save place'}>
          {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- WeatherCard */
export function WeatherCard({ weather, title }: { weather: Weather; title?: string }) {
  const units = useAuthStore((s) => s.preferences?.units ?? 'metric');
  const c = weather.current;
  return (
    <div className="marble p-4">
      {title && <h4 className="small-caps mb-2 font-serif text-sm text-umber">{title}</h4>}
      <div className="flex items-center gap-4">
        <span className="text-4xl">{weatherEmoji(c.weather_code, c.is_day)}</span>
        <div>
          <div className="font-display text-3xl">{fmtTemp(c.temperature_c, units)}</div>
          <div className="text-xs text-umber/80">
            {c.description} · feels {fmtTemp(c.apparent_c, units)} · wind {Math.round(c.wind_kmh)} km/h
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-7">
        {weather.daily.slice(0, 7).map((d) => (
          <div key={d.date} className="rounded-md bg-ivory/70 p-1.5 text-center text-[11px]">
            <div className="text-umber/70">{fmtDate(d.date, { weekday: 'short' })}</div>
            <div className="text-lg">{weatherEmoji(d.weather_code)}</div>
            <div className="font-medium">
              {Math.round(d.t_max_c)}° <span className="text-umber/60">{Math.round(d.t_min_c)}°</span>
            </div>
            {d.precipitation_probability > 20 && <div className="text-lapis">💧{d.precipitation_probability}%</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- LinksCard */
export function LinksList({ links, title }: { links: IntentLink[]; title?: string }) {
  return (
    <div>
      {title && <h4 className="small-caps mb-2 font-serif text-sm text-umber">{title}</h4>}
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="chip hover:bg-ivory">
            <ExternalLink size={12} className="text-gold" />
            <span className="font-medium">{l.provider}</span>
            <span className="hidden sm:inline text-umber/70">· {l.label.length > 42 ? l.label.slice(0, 40) + '…' : l.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- RouteCard */
export function RouteCard({ route }: { route: RouteResult }) {
  const units = useAuthStore((s) => s.preferences?.units ?? 'metric');
  return (
    <div className="marble p-4">
      <div className="flex items-center gap-3">
        <Navigation className="text-lapis" size={20} />
        <div>
          <div className="font-serif text-lg font-semibold">
            {route.to?.name ? `Walk to ${route.to.name}` : 'Walking route'}
          </div>
          <div className="text-xs text-umber/80">
            {fmtDistance(route.distance_m, units)} · about {fmtDuration(route.duration_s)}
          </div>
        </div>
      </div>
      <ol className="mt-3 space-y-1 text-sm">
        {route.steps.slice(0, 8).map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-5 shrink-0 text-right font-display text-xs text-gold">{i + 1}</span>
            <span>
              {s.instruction} <span className="text-umber/60">({fmtDistance(s.distance_m, units)})</span>
            </span>
          </li>
        ))}
        {route.steps.length > 8 && <li className="text-xs text-umber/60">… {route.steps.length - 8} more steps</li>}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------- Card dispatcher */
export function CardView({ card }: { card: Card }) {
  switch (card.type) {
    case 'places': {
      const places = card.payload as Place[];
      return (
        <div>
          <h4 className="small-caps mb-2 font-serif text-sm text-umber">{card.title}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {places.slice(0, 6).map((p) => (
              <PlaceRow key={p.id} place={p} compact />
            ))}
          </div>
        </div>
      );
    }
    case 'weather':
      return <WeatherCard weather={card.payload as Weather} title={card.title} />;
    case 'links':
      return <LinksList links={card.payload as IntentLink[]} title={card.title} />;
    case 'route':
      return <RouteCard route={card.payload as RouteResult} />;
    case 'guide': {
      const g = card.payload as { title: string; extract: string; url: string; thumbnail?: string; source: string };
      return (
        <div className="marble flex gap-3 p-3">
          {g.thumbnail && <img src={g.thumbnail} alt="" className="h-20 w-20 shrink-0 rounded object-cover" />}
          <div className="min-w-0">
            <div className="font-serif font-semibold">{g.title}</div>
            <p className="line-clamp-3 text-xs text-umber/80">{g.extract}</p>
            <a href={g.url} target="_blank" rel="noreferrer" className="text-xs text-lapis hover:underline">
              Read on {g.source}
            </a>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
