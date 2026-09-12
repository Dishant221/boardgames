import type { Env } from '../types';
import { EMERGENCY_NUMBERS, PLUG_TYPES, DEFAULT_EMERGENCY } from '../data/essentials';
import { COUNTRIES, flagEmoji } from '../data/countries';

/**
 * Country essentials for the destination guide: currency, languages,
 * dialling code, driving side, emergency numbers, plug/voltage.
 *
 * Served entirely from static tables (src/data) - REST Countries retired its
 * free v3 API in 2026 and the replacement has no stable public schema. Static
 * data costs no external calls and never breaks the guide.
 */
export interface CountryEssentials {
  code: string;
  name: string;
  flag: string;
  capital?: string;
  region?: string;
  currencies: { code: string; name: string; symbol?: string }[];
  languages: string[];
  calling_code?: string;
  driving_side?: 'left' | 'right';
  timezones: string[];
  emergency: { police: string; ambulance: string; fire: string; general?: string };
  plugs: { types: string[]; voltage: string; frequency: string };
}

export async function countryEssentials(_env: Env, code: string): Promise<CountryEssentials | null> {
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  const facts = COUNTRIES[cc];
  const emergency = EMERGENCY_NUMBERS[cc] ?? DEFAULT_EMERGENCY;
  const plugs = PLUG_TYPES[cc] ?? { types: ['C', 'F'], voltage: '230V', frequency: '50Hz' };
  if (!facts) {
    return { code: cc, name: cc, flag: flagEmoji(cc), currencies: [], languages: [], timezones: [], emergency, plugs };
  }
  return {
    code: cc,
    name: facts.name,
    flag: flagEmoji(cc),
    capital: facts.capital,
    region: facts.region,
    currencies: facts.currencies,
    languages: facts.languages,
    calling_code: facts.calling_code,
    driving_side: facts.driving_side,
    timezones: facts.timezones,
    emergency,
    plugs
  };
}
