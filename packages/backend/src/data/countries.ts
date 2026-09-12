/**
 * Static country facts for the guide's "essentials" block. REST Countries v3
 * was retired in 2026, so we ship the data we need ourselves (no network, no
 * quota). Coverage: the most-visited destinations; unknown codes fall back to
 * generic values in providers/countries.ts.
 */
export interface CountryFacts {
  name: string;
  capital: string;
  region: string;
  currencies: { code: string; name: string; symbol?: string }[];
  languages: string[];
  calling_code: string;
  driving_side: 'left' | 'right';
  timezones: string[];
}

const EUR = { code: 'EUR', name: 'Euro', symbol: '€' };
const USD = { code: 'USD', name: 'US dollar', symbol: '$' };

export const COUNTRIES: Record<string, CountryFacts> = {
  IT: { name: 'Italy', capital: 'Rome', region: 'Europe', currencies: [EUR], languages: ['Italian'], calling_code: '+39', driving_side: 'right', timezones: ['UTC+01:00'] },
  FR: { name: 'France', capital: 'Paris', region: 'Europe', currencies: [EUR], languages: ['French'], calling_code: '+33', driving_side: 'right', timezones: ['UTC+01:00'] },
  ES: { name: 'Spain', capital: 'Madrid', region: 'Europe', currencies: [EUR], languages: ['Spanish', 'Catalan', 'Basque', 'Galician'], calling_code: '+34', driving_side: 'right', timezones: ['UTC+01:00'] },
  PT: { name: 'Portugal', capital: 'Lisbon', region: 'Europe', currencies: [EUR], languages: ['Portuguese'], calling_code: '+351', driving_side: 'right', timezones: ['UTC+00:00'] },
  DE: { name: 'Germany', capital: 'Berlin', region: 'Europe', currencies: [EUR], languages: ['German'], calling_code: '+49', driving_side: 'right', timezones: ['UTC+01:00'] },
  AT: { name: 'Austria', capital: 'Vienna', region: 'Europe', currencies: [EUR], languages: ['German'], calling_code: '+43', driving_side: 'right', timezones: ['UTC+01:00'] },
  CH: { name: 'Switzerland', capital: 'Bern', region: 'Europe', currencies: [{ code: 'CHF', name: 'Swiss franc', symbol: 'CHF' }], languages: ['German', 'French', 'Italian', 'Romansh'], calling_code: '+41', driving_side: 'right', timezones: ['UTC+01:00'] },
  NL: { name: 'Netherlands', capital: 'Amsterdam', region: 'Europe', currencies: [EUR], languages: ['Dutch'], calling_code: '+31', driving_side: 'right', timezones: ['UTC+01:00'] },
  BE: { name: 'Belgium', capital: 'Brussels', region: 'Europe', currencies: [EUR], languages: ['Dutch', 'French', 'German'], calling_code: '+32', driving_side: 'right', timezones: ['UTC+01:00'] },
  LU: { name: 'Luxembourg', capital: 'Luxembourg', region: 'Europe', currencies: [EUR], languages: ['Luxembourgish', 'French', 'German'], calling_code: '+352', driving_side: 'right', timezones: ['UTC+01:00'] },
  GB: { name: 'United Kingdom', capital: 'London', region: 'Europe', currencies: [{ code: 'GBP', name: 'Pound sterling', symbol: '£' }], languages: ['English'], calling_code: '+44', driving_side: 'left', timezones: ['UTC+00:00'] },
  IE: { name: 'Ireland', capital: 'Dublin', region: 'Europe', currencies: [EUR], languages: ['English', 'Irish'], calling_code: '+353', driving_side: 'left', timezones: ['UTC+00:00'] },
  GR: { name: 'Greece', capital: 'Athens', region: 'Europe', currencies: [EUR], languages: ['Greek'], calling_code: '+30', driving_side: 'right', timezones: ['UTC+02:00'] },
  HR: { name: 'Croatia', capital: 'Zagreb', region: 'Europe', currencies: [EUR], languages: ['Croatian'], calling_code: '+385', driving_side: 'right', timezones: ['UTC+01:00'] },
  SI: { name: 'Slovenia', capital: 'Ljubljana', region: 'Europe', currencies: [EUR], languages: ['Slovene'], calling_code: '+386', driving_side: 'right', timezones: ['UTC+01:00'] },
  CZ: { name: 'Czechia', capital: 'Prague', region: 'Europe', currencies: [{ code: 'CZK', name: 'Czech koruna', symbol: 'Kč' }], languages: ['Czech'], calling_code: '+420', driving_side: 'right', timezones: ['UTC+01:00'] },
  PL: { name: 'Poland', capital: 'Warsaw', region: 'Europe', currencies: [{ code: 'PLN', name: 'Polish złoty', symbol: 'zł' }], languages: ['Polish'], calling_code: '+48', driving_side: 'right', timezones: ['UTC+01:00'] },
  HU: { name: 'Hungary', capital: 'Budapest', region: 'Europe', currencies: [{ code: 'HUF', name: 'Hungarian forint', symbol: 'Ft' }], languages: ['Hungarian'], calling_code: '+36', driving_side: 'right', timezones: ['UTC+01:00'] },
  DK: { name: 'Denmark', capital: 'Copenhagen', region: 'Europe', currencies: [{ code: 'DKK', name: 'Danish krone', symbol: 'kr' }], languages: ['Danish'], calling_code: '+45', driving_side: 'right', timezones: ['UTC+01:00'] },
  SE: { name: 'Sweden', capital: 'Stockholm', region: 'Europe', currencies: [{ code: 'SEK', name: 'Swedish krona', symbol: 'kr' }], languages: ['Swedish'], calling_code: '+46', driving_side: 'right', timezones: ['UTC+01:00'] },
  NO: { name: 'Norway', capital: 'Oslo', region: 'Europe', currencies: [{ code: 'NOK', name: 'Norwegian krone', symbol: 'kr' }], languages: ['Norwegian'], calling_code: '+47', driving_side: 'right', timezones: ['UTC+01:00'] },
  FI: { name: 'Finland', capital: 'Helsinki', region: 'Europe', currencies: [EUR], languages: ['Finnish', 'Swedish'], calling_code: '+358', driving_side: 'right', timezones: ['UTC+02:00'] },
  IS: { name: 'Iceland', capital: 'Reykjavik', region: 'Europe', currencies: [{ code: 'ISK', name: 'Icelandic króna', symbol: 'kr' }], languages: ['Icelandic'], calling_code: '+354', driving_side: 'right', timezones: ['UTC+00:00'] },
  TR: { name: 'Türkiye', capital: 'Ankara', region: 'Asia', currencies: [{ code: 'TRY', name: 'Turkish lira', symbol: '₺' }], languages: ['Turkish'], calling_code: '+90', driving_side: 'right', timezones: ['UTC+03:00'] },
  MT: { name: 'Malta', capital: 'Valletta', region: 'Europe', currencies: [EUR], languages: ['Maltese', 'English'], calling_code: '+356', driving_side: 'left', timezones: ['UTC+01:00'] },
  US: { name: 'United States', capital: 'Washington, D.C.', region: 'Americas', currencies: [USD], languages: ['English'], calling_code: '+1', driving_side: 'right', timezones: ['UTC-10:00', 'UTC-09:00', 'UTC-08:00', 'UTC-07:00', 'UTC-06:00', 'UTC-05:00'] },
  CA: { name: 'Canada', capital: 'Ottawa', region: 'Americas', currencies: [{ code: 'CAD', name: 'Canadian dollar', symbol: '$' }], languages: ['English', 'French'], calling_code: '+1', driving_side: 'right', timezones: ['UTC-08:00', 'UTC-07:00', 'UTC-06:00', 'UTC-05:00', 'UTC-04:00', 'UTC-03:30'] },
  MX: { name: 'Mexico', capital: 'Mexico City', region: 'Americas', currencies: [{ code: 'MXN', name: 'Mexican peso', symbol: '$' }], languages: ['Spanish'], calling_code: '+52', driving_side: 'right', timezones: ['UTC-08:00', 'UTC-07:00', 'UTC-06:00'] },
  BR: { name: 'Brazil', capital: 'Brasília', region: 'Americas', currencies: [{ code: 'BRL', name: 'Brazilian real', symbol: 'R$' }], languages: ['Portuguese'], calling_code: '+55', driving_side: 'right', timezones: ['UTC-05:00', 'UTC-04:00', 'UTC-03:00', 'UTC-02:00'] },
  AR: { name: 'Argentina', capital: 'Buenos Aires', region: 'Americas', currencies: [{ code: 'ARS', name: 'Argentine peso', symbol: '$' }], languages: ['Spanish'], calling_code: '+54', driving_side: 'right', timezones: ['UTC-03:00'] },
  PE: { name: 'Peru', capital: 'Lima', region: 'Americas', currencies: [{ code: 'PEN', name: 'Peruvian sol', symbol: 'S/' }], languages: ['Spanish', 'Quechua'], calling_code: '+51', driving_side: 'right', timezones: ['UTC-05:00'] },
  IN: { name: 'India', capital: 'New Delhi', region: 'Asia', currencies: [{ code: 'INR', name: 'Indian rupee', symbol: '₹' }], languages: ['Hindi', 'English'], calling_code: '+91', driving_side: 'left', timezones: ['UTC+05:30'] },
  JP: { name: 'Japan', capital: 'Tokyo', region: 'Asia', currencies: [{ code: 'JPY', name: 'Japanese yen', symbol: '¥' }], languages: ['Japanese'], calling_code: '+81', driving_side: 'left', timezones: ['UTC+09:00'] },
  KR: { name: 'South Korea', capital: 'Seoul', region: 'Asia', currencies: [{ code: 'KRW', name: 'South Korean won', symbol: '₩' }], languages: ['Korean'], calling_code: '+82', driving_side: 'right', timezones: ['UTC+09:00'] },
  CN: { name: 'China', capital: 'Beijing', region: 'Asia', currencies: [{ code: 'CNY', name: 'Chinese yuan', symbol: '¥' }], languages: ['Chinese'], calling_code: '+86', driving_side: 'right', timezones: ['UTC+08:00'] },
  TH: { name: 'Thailand', capital: 'Bangkok', region: 'Asia', currencies: [{ code: 'THB', name: 'Thai baht', symbol: '฿' }], languages: ['Thai'], calling_code: '+66', driving_side: 'left', timezones: ['UTC+07:00'] },
  VN: { name: 'Vietnam', capital: 'Hanoi', region: 'Asia', currencies: [{ code: 'VND', name: 'Vietnamese đồng', symbol: '₫' }], languages: ['Vietnamese'], calling_code: '+84', driving_side: 'right', timezones: ['UTC+07:00'] },
  ID: { name: 'Indonesia', capital: 'Jakarta', region: 'Asia', currencies: [{ code: 'IDR', name: 'Indonesian rupiah', symbol: 'Rp' }], languages: ['Indonesian'], calling_code: '+62', driving_side: 'left', timezones: ['UTC+07:00', 'UTC+08:00', 'UTC+09:00'] },
  SG: { name: 'Singapore', capital: 'Singapore', region: 'Asia', currencies: [{ code: 'SGD', name: 'Singapore dollar', symbol: '$' }], languages: ['English', 'Malay', 'Chinese', 'Tamil'], calling_code: '+65', driving_side: 'left', timezones: ['UTC+08:00'] },
  MY: { name: 'Malaysia', capital: 'Kuala Lumpur', region: 'Asia', currencies: [{ code: 'MYR', name: 'Malaysian ringgit', symbol: 'RM' }], languages: ['Malay', 'English'], calling_code: '+60', driving_side: 'left', timezones: ['UTC+08:00'] },
  PH: { name: 'Philippines', capital: 'Manila', region: 'Asia', currencies: [{ code: 'PHP', name: 'Philippine peso', symbol: '₱' }], languages: ['Filipino', 'English'], calling_code: '+63', driving_side: 'right', timezones: ['UTC+08:00'] },
  AE: { name: 'United Arab Emirates', capital: 'Abu Dhabi', region: 'Asia', currencies: [{ code: 'AED', name: 'UAE dirham', symbol: 'د.إ' }], languages: ['Arabic'], calling_code: '+971', driving_side: 'right', timezones: ['UTC+04:00'] },
  IL: { name: 'Israel', capital: 'Jerusalem', region: 'Asia', currencies: [{ code: 'ILS', name: 'Israeli new shekel', symbol: '₪' }], languages: ['Hebrew', 'Arabic'], calling_code: '+972', driving_side: 'right', timezones: ['UTC+02:00'] },
  AU: { name: 'Australia', capital: 'Canberra', region: 'Oceania', currencies: [{ code: 'AUD', name: 'Australian dollar', symbol: '$' }], languages: ['English'], calling_code: '+61', driving_side: 'left', timezones: ['UTC+08:00', 'UTC+09:30', 'UTC+10:00'] },
  NZ: { name: 'New Zealand', capital: 'Wellington', region: 'Oceania', currencies: [{ code: 'NZD', name: 'New Zealand dollar', symbol: '$' }], languages: ['English', 'Māori'], calling_code: '+64', driving_side: 'left', timezones: ['UTC+12:00'] },
  ZA: { name: 'South Africa', capital: 'Pretoria', region: 'Africa', currencies: [{ code: 'ZAR', name: 'South African rand', symbol: 'R' }], languages: ['English', 'Zulu', 'Xhosa', 'Afrikaans'], calling_code: '+27', driving_side: 'left', timezones: ['UTC+02:00'] },
  EG: { name: 'Egypt', capital: 'Cairo', region: 'Africa', currencies: [{ code: 'EGP', name: 'Egyptian pound', symbol: 'E£' }], languages: ['Arabic'], calling_code: '+20', driving_side: 'right', timezones: ['UTC+02:00'] },
  MA: { name: 'Morocco', capital: 'Rabat', region: 'Africa', currencies: [{ code: 'MAD', name: 'Moroccan dirham', symbol: 'DH' }], languages: ['Arabic', 'Berber', 'French'], calling_code: '+212', driving_side: 'right', timezones: ['UTC+01:00'] },
  KE: { name: 'Kenya', capital: 'Nairobi', region: 'Africa', currencies: [{ code: 'KES', name: 'Kenyan shilling', symbol: 'KSh' }], languages: ['Swahili', 'English'], calling_code: '+254', driving_side: 'left', timezones: ['UTC+03:00'] }
};

/** Regional-indicator flag emoji from an ISO-3166 alpha-2 code. */
export function flagEmoji(cc: string): string {
  const code = cc.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
