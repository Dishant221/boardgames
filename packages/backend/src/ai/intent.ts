import type { IntentKind } from '../types';
import type { PoiCategory } from '../providers/overpass';

/**
 * Cheap, deterministic intent classifier. Runs BEFORE the LLM so that we can
 * (a) fetch the right grounding data, (b) build the right deep links and
 * (c) skip the LLM entirely for questions that data alone answers (weather).
 * No neurons are spent here.
 */
const RULES: { intent: IntentKind; patterns: RegExp[] }[] = [
  { intent: 'flights', patterns: [/\bflights?\b/i, /\bfly(ing)?\b/i, /\bairfare\b/i, /\bplane\b/i, /\bairline\b/i] },
  { intent: 'hotels', patterns: [/\bhotels?\b/i, /\bhostels?\b/i, /\bstay\b/i, /\baccommodation\b/i, /\bairbnb\b/i, /\bwhere (should|can|do) i sleep\b/i, /\bbook(ing)? a room\b/i] },
  { intent: 'directions', patterns: [/\bhow (do|can) i get to\b/i, /\bdirections?\b/i, /\bnavigate\b/i, /\bway to\b/i, /\broute to\b/i, /\bwalk(ing)? to\b/i, /\bhow far\b/i] },
  { intent: 'transport', patterns: [/\btrain\b/i, /\bbus\b/i, /\bmetro\b/i, /\bsubway\b/i, /\btram\b/i, /\btaxi\b/i, /\buber\b/i, /\btransport\b/i, /\bairport transfer\b/i, /\bget (from|between)\b/i, /\bferry\b/i] },
  { intent: 'food', patterns: [/\beat\b/i, /\bfood\b/i, /\brestaurants?\b/i, /\bdinner\b/i, /\blunch\b/i, /\bbreakfast\b/i, /\bbrunch\b/i, /\bcaf[eé]s?\b/i, /\bcoffee\b/i, /\bpizza\b/i, /\bpasta\b/i, /\bvegan\b/i, /\bvegetarian\b/i, /\bhungry\b/i, /\bgelato\b/i, /\bstreet food\b/i] },
  { intent: 'nightlife', patterns: [/\bnightlife\b/i, /\bbars?\b/i, /\bpubs?\b/i, /\bclubs?\b/i, /\bdrinks?\b/i, /\bcocktail/i, /\bparty\b/i] },
  { intent: 'events', patterns: [/\bevents?\b/i, /\bconcerts?\b/i, /\bfestivals?\b/i, /\bshows?\b/i, /\bexhibitions?\b/i, /\bmatch\b/i, /\bgame tonight\b/i, /\bwhat'?s (on|happening)\b/i, /\btickets?\b/i, /\btheat(re|er)\b/i, /\bopera\b/i] },
  { intent: 'weather', patterns: [/\bweather\b/i, /\brain(ing)?\b/i, /\btemperature\b/i, /\bforecast\b/i, /\bsunny\b/i, /\bhot\b/i, /\bcold\b/i, /\bumbrella\b/i, /\bwhat (should|do) i wear\b/i] },
  { intent: 'shopping', patterns: [/\bshop(ping|s)?\b/i, /\bbuy\b/i, /\bmarket\b/i, /\bsouvenir/i, /\bmall\b/i, /\bwhere can i (get|find|purchase)\b/i, /\bpharmacy\b/i, /\bsim card\b/i, /\bsupermarket\b/i, /\bgrocer/i] },
  { intent: 'safety', patterns: [/\bsafe(ty)?\b/i, /\bemergency\b/i, /\bpolice\b/i, /\bhospital\b/i, /\bdoctor\b/i, /\bscam/i, /\bpickpocket/i, /\blost (my )?(passport|wallet|phone)\b/i, /\bembassy\b/i, /\bsick\b/i, /\binjur/i, /\bhelp me\b/i] },
  { intent: 'nature', patterns: [/\bpark\b/i, /\bhik(e|ing)\b/i, /\bbeach\b/i, /\bnature\b/i, /\bgarden\b/i, /\bmountain/i, /\blake\b/i, /\bday trip\b/i, /\bsunset\b/i, /\bviewpoint\b/i] },
  { intent: 'itinerary', patterns: [/\bitinerary\b/i, /\bplan\b/i, /\bschedule\b/i, /\b\d+ days?\b/i, /\bweekend\b/i, /\bwhat (should|can) i do\b/i, /\bthings to do\b/i, /\bday by day\b/i] },
  { intent: 'sights', patterns: [/\bsee\b/i, /\bvisit\b/i, /\bmuseum/i, /\bsights?\b/i, /\battractions?\b/i, /\blandmark/i, /\bmonument/i, /\bchurch\b/i, /\bcathedral\b/i, /\bpalace\b/i, /\bcastle\b/i, /\bruins?\b/i, /\bgallery\b/i, /\bwhat is (this|that)\b/i, /\bhistory\b/i, /\bart\b/i] }
];

export function detectIntent(message: string): IntentKind {
  const scores = new Map<IntentKind, number>();
  for (const rule of RULES) {
    let s = 0;
    for (const p of rule.patterns) if (p.test(message)) s++;
    if (s) scores.set(rule.intent, s);
  }
  if (scores.size === 0) return 'general';
  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Map an intent to the POI categories worth fetching for grounding. */
export function poiCategoriesFor(intent: IntentKind, message: string): PoiCategory[] {
  switch (intent) {
    case 'food':
      return /caf[eé]|coffee|breakfast|bakery|gelato|dessert/i.test(message) ? ['cafes'] : ['food'];
    case 'nightlife':
      return ['nightlife'];
    case 'hotels':
      return ['hotels'];
    case 'sights':
      return /museum|gallery|art/i.test(message) ? ['museums'] : ['sights'];
    case 'itinerary':
      return ['sights', 'museums'];
    case 'events':
      return ['events'];
    case 'transport':
    case 'directions':
      return ['transport'];
    case 'shopping':
      if (/pharmac|medicine|drug/i.test(message)) return ['pharmacy'];
      if (/supermarket|grocer|water|snack/i.test(message)) return ['supermarket'];
      if (/atm|cash|money|exchange/i.test(message)) return ['atm'];
      return ['shopping'];
    case 'safety':
      if (/hospital|doctor|sick|injur/i.test(message)) return ['hospital', 'pharmacy'];
      return ['police', 'hospital'];
    case 'nature':
      return ['nature'];
    default:
      return [];
  }
}

/** Pull a probable place name out of the message ("in Rome", "to Florence", "near Trastevere"). */
export function extractPlaceMention(message: string): string | null {
  const m = message.match(/\b(?:in|to|at|around|near|visiting|from)\s+([A-Z][\p{L}'’.-]+(?:\s+(?:de|del|della|di|la|le|du|des|van|von|of|the|[A-Z][\p{L}'’.-]+))*)/u);
  if (!m) return null;
  const name = m[1].replace(/[.,!?]+$/, '').trim();
  if (/^(I|My|Me|The|This|That|Today|Tomorrow|Tonight|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.test(name)) return null;
  return name;
}

/** Extract an ISO date or a relative date hint from free text. */
export function extractDate(message: string, now = new Date()): string | undefined {
  const iso = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (/\btomorrow\b/i.test(message)) d.setUTCDate(d.getUTCDate() + 1);
  else if (/\bnext week\b/i.test(message)) d.setUTCDate(d.getUTCDate() + 7);
  else if (/\bthis weekend\b/i.test(message)) d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  else if (/\btoday\b|\btonight\b/i.test(message)) {
    /* keep today */
  } else return undefined;
  return d.toISOString().slice(0, 10);
}

/** Extract a cuisine / topic word to sharpen searches ("vegan", "seafood", "leather bags"). */
export function extractTopic(message: string): string | undefined {
  const cuisine = message.match(/\b(vegan|vegetarian|seafood|sushi|ramen|pizza|pasta|tapas|kebab|halal|kosher|gluten[- ]free|steak|burger|dessert|gelato|coffee|brunch|wine|craft beer)\b/i);
  if (cuisine) return cuisine[1].toLowerCase();
  const buy = message.match(/\b(?:buy|find|get|purchase)\s+(?:a |an |some )?([a-z][a-z\s-]{2,30}?)(?:\s+(?:in|near|around|at)\b|[.?!]|$)/i);
  if (buy) return buy[1].trim();
  return undefined;
}
