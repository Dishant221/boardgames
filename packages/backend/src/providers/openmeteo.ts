import type { Env, WeatherSummary } from '../types';
import { cachedJson } from '../utils/http';

/** Open-Meteo - free weather API, no key required. Cached for 30 minutes. */
const BASE = 'https://api.open-meteo.com/v1/forecast';

interface OpenMeteoResponse {
  timezone: string;
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    precipitation: number;
    weather_code: number;
    is_day: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
    sunrise: string[];
    sunset: string[];
  };
}

export async function forecast(env: Env, lat: number, lng: number, days = 7): Promise<WeatherSummary> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lng.toFixed(3),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,sunrise,sunset',
    timezone: 'auto',
    forecast_days: String(Math.min(16, Math.max(1, days)))
  });
  const data = await cachedJson<OpenMeteoResponse>(env, 'open-meteo', `${BASE}?${params}`, { ttlSeconds: 1800 });
  return {
    lat,
    lng,
    timezone: data.timezone,
    current: {
      temperature_c: data.current.temperature_2m,
      apparent_c: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      wind_kmh: data.current.wind_speed_10m,
      precipitation_mm: data.current.precipitation,
      weather_code: data.current.weather_code,
      description: describeWeather(data.current.weather_code),
      is_day: data.current.is_day === 1
    },
    daily: data.daily.time.map((date, i) => ({
      date,
      t_max_c: data.daily.temperature_2m_max[i],
      t_min_c: data.daily.temperature_2m_min[i],
      precipitation_mm: data.daily.precipitation_sum[i],
      precipitation_probability: data.daily.precipitation_probability_max[i] ?? 0,
      weather_code: data.daily.weather_code[i],
      description: describeWeather(data.daily.weather_code[i]),
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i]
    }))
  };
}

/** WMO weather interpretation codes. */
export function describeWeather(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code === 95) return 'Thunderstorm';
  if (code === 96 || code === 99) return 'Thunderstorm with hail';
  return 'Unknown';
}
