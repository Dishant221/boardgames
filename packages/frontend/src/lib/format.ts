export function fmtDistance(m?: number, units: 'metric' | 'imperial' = 'metric'): string {
  if (m === undefined || m === null) return '';
  if (units === 'imperial') {
    const ft = m * 3.28084;
    return ft < 1000 ? `${Math.round(ft)} ft` : `${(ft / 5280).toFixed(1)} mi`;
  }
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function fmtDuration(s: number): string {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

export function fmtTemp(c: number, units: 'metric' | 'imperial' = 'metric'): string {
  return units === 'imperial' ? `${Math.round((c * 9) / 5 + 32)}°F` : `${Math.round(c)}°C`;
}

export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, opts);
}

export function weatherEmoji(code: number, isDay = true): string {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 2) return isDay ? '🌤️' : '☁️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 85 && code <= 86) return '❄️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

export function categoryEmoji(cat: string): string {
  const m: Record<string, string> = {
    sights: '🏛️', museums: '🖼️', food: '🍝', cafes: '☕', nightlife: '🍸', hotels: '🛏️', transport: '🚉', pharmacy: '💊', hospital: '🏥',
    atm: '🏧', supermarket: '🛒', shopping: '🛍️', nature: '🌳', events: '🎭', wifi: '📶', toilets: '🚻', police: '👮', place: '📍',
    sight: '🏛️', hotel: '🛏️', flight: '✈️', activity: '🎟️', event: '🎭', note: '📝'
  };
  return m[cat] ?? '📍';
}

/** Very small markdown → HTML for assistant replies (bold, italics, lists, line breaks). */
export function miniMarkdown(src: string): string {
  const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = esc.split(/\r?\n/);
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const close = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const inline = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\s)\*(?!\s)(.+?)\*(?=\s|$|[.,!?])/g, '$1<em>$2</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
    if (/^\s*[-*•]\s+/.test(line)) {
      if (list !== 'ul') {
        close();
        out.push('<ul>');
        list = 'ul';
      }
      out.push(`<li>${inline.replace(/^\s*[-*•]\s+/, '')}</li>`);
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      if (list !== 'ol') {
        close();
        out.push('<ol>');
        list = 'ol';
      }
      out.push(`<li>${inline.replace(/^\s*\d+[.)]\s+/, '')}</li>`);
    } else if (/^#{1,3}\s+/.test(line)) {
      close();
      out.push(`<h3>${inline.replace(/^#{1,3}\s+/, '')}</h3>`);
    } else if (line.trim() === '') {
      close();
    } else {
      close();
      out.push(`<p>${inline}</p>`);
    }
  }
  close();
  return out.join('');
}
