import { describe, it, expect } from 'vitest';
import { flightLinks, hotelLinks, linksForIntent, mapsDirections, slug, webSearch } from '../src/providers/intents';
import { detectIntent, extractDate, extractPlaceMention, extractTopic, poiCategoriesFor } from '../src/ai/intent';
import { decodePolyline } from '../src/providers/osrm';
import { extractJson } from '../src/ai/provider';

describe('intent detection', () => {
  it.each([
    ['cheap flights to Rome next month', 'flights'],
    ['where should I stay in Florence?', 'hotels'],
    ['I am hungry, best pasta near me', 'food'],
    ['what museums are worth visiting in Paris', 'sights'],
    ['is it going to rain tomorrow', 'weather'],
    ['how do I get to the Colosseum', 'directions'],
    ['train from Milan to Venice', 'transport'],
    ['any concerts in Berlin this weekend', 'events'],
    ['I lost my passport, help', 'safety'],
    ['plan 3 days in Lisbon', 'itinerary'],
    ['hello there', 'general']
  ])('%s -> %s', (msg, intent) => {
    expect(detectIntent(msg)).toBe(intent);
  });

  it('maps intents to POI categories', () => {
    expect(poiCategoriesFor('food', 'good coffee nearby')).toEqual(['cafes']);
    expect(poiCategoriesFor('shopping', 'where is a pharmacy')).toEqual(['pharmacy']);
    expect(poiCategoriesFor('general', 'hi')).toEqual([]);
  });

  it('extracts place mentions, dates and topics', () => {
    expect(extractPlaceMention('best gelato in Rome')).toBe('Rome');
    expect(extractPlaceMention('what to do in New York')).toBe('New York');
    expect(extractPlaceMention('I am hungry')).toBeNull();
    expect(extractDate('flights on 2026-10-01')).toBe('2026-10-01');
    expect(extractDate('anything tomorrow?', new Date('2026-09-12T10:00:00Z'))).toBe('2026-09-13');
    expect(extractTopic('vegan restaurants in Berlin')).toBe('vegan');
    expect(extractTopic('where can I buy a sim card in Rome?')).toBe('sim card');
  });
});

describe('deep links', () => {
  it('web search honours the preferred engine', () => {
    expect(webSearch('duckduckgo', 'rome tips').url).toContain('duckduckgo.com/?q=rome%20tips');
    expect(webSearch('google', 'rome tips').provider).toBe('Google');
  });

  it('builds flight and hotel links with intent pre-filled', () => {
    const f = flightLinks({ from: 'Paris', to: 'Rome', depart: '2026-10-01', return: '2026-10-08', adults: 2 });
    expect(f.map((l) => l.provider)).toEqual(['Google Flights', 'Skyscanner', 'Kayak']);
    expect(f[1].url).toContain('/paris/rome/261001/261008/');
    const h = hotelLinks({ destination: 'Rome, Italy', checkin: '2026-10-01', checkout: '2026-10-08', adults: 2 });
    expect(h[0].url).toContain('checkin=2026-10-01');
    expect(h.some((l) => l.provider === 'Airbnb')).toBe(true);
  });

  it('directions link uses coordinates and travel mode', () => {
    const l = mapsDirections({ lat: 41.89, lng: 12.49 }, { lat: 41.9, lng: 12.5 }, 'transit');
    expect(l.url).toContain('origin=41.9,12.5');
    expect(l.url).toContain('destination=41.89%2C12.49');
    expect(l.url).toContain('travelmode=transit');
  });

  it('linksForIntent always returns something', () => {
    for (const intent of ['flights', 'hotels', 'food', 'sights', 'events', 'transport', 'directions', 'weather', 'shopping', 'safety', 'nightlife', 'nature', 'itinerary', 'general'] as const) {
      const links = linksForIntent(intent, { destination: 'Rome', engine: 'bing', message: 'test', near: { lat: 41.9, lng: 12.5 } });
      expect(links.length).toBeGreaterThan(0);
      for (const l of links) expect(l.url.startsWith('https://')).toBe(true);
    }
  });

  it('slugifies with accents', () => {
    expect(slug('São Paulo / Città di Castello')).toBe('sao-paulo-citta-di-castello');
  });
});

describe('utilities', () => {
  it('decodes OSRM polylines', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts.length).toBe(3);
    expect(pts[0].lat).toBeCloseTo(38.5, 3);
    expect(pts[0].lng).toBeCloseTo(-120.2, 3);
  });

  it('extracts JSON from chatty model output', () => {
    expect(extractJson<{ a: number }>('Sure! ```json\n{"a": 1}\n``` hope that helps')).toEqual({ a: 1 });
    expect(extractJson<number[]>('result: [1,2,3] done')).toEqual([1, 2, 3]);
    expect(extractJson('nothing here')).toBeNull();
  });
});
