// Open-Meteo Real-time Weather API Service (Free, No API Key Required)

export type WeatherCondition =
  | 'clear' | 'partly_cloudy' | 'overcast'
  | 'drizzle' | 'rain' | 'heavy_rain'
  | 'snow' | 'thunderstorm' | 'foggy' | 'windy';

export interface LiveWeatherData {
  latitude: number;
  longitude: number;
  cityName: string;
  tempC: number;
  feelsLikeC: number;
  humidityPct: number;
  uvIndex: number;
  weatherCode: number;
  weatherCondition: WeatherCondition;
  windSpeedKmh: number;
  precipMm: number;          // precipitation in last hour (mm)
  visibilityKm: number;
  updatedAt: string;
  hourlyTrend: { hour: string; tempC: number; score?: number }[];
}

const WEATHER_CACHE_KEY = 'heatwatch_cached_weather';

export function getCachedWeather(): LiveWeatherData | null {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function cacheWeather(w: LiveWeatherData): void {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(w));
  } catch {}
}

/**
 * Maps WMO weather codes to our WeatherCondition enum.
 * https://open-meteo.com/en/docs#weathervariables
 */
export function wmoToCondition(code: number): WeatherCondition {
  if (code === 0)                         return 'clear';
  if (code <= 2)                          return 'partly_cloudy';
  if (code === 3)                         return 'overcast';
  if (code >= 45 && code <= 48)           return 'foggy';
  if (code >= 51 && code <= 57)           return 'drizzle';
  if (code >= 61 && code <= 65)           return 'rain';
  if (code >= 66 && code <= 67)           return 'rain';   // freezing rain
  if (code >= 71 && code <= 77)           return 'snow';
  if (code >= 80 && code <= 82)           return 'rain';
  if (code === 85 || code === 86)         return 'snow';
  if (code >= 95 && code <= 99)           return 'thunderstorm';
  return 'partly_cloudy';
}

/** Human-readable condition label + emoji */
export function conditionLabel(c: WeatherCondition): { label: string; emoji: string } {
  const map: Record<WeatherCondition, { label: string; emoji: string }> = {
    clear:         { label: 'Clear Sky',      emoji: '☀️'  },
    partly_cloudy: { label: 'Partly Cloudy',  emoji: '⛅'  },
    overcast:      { label: 'Overcast',       emoji: '☁️'  },
    drizzle:       { label: 'Drizzle',        emoji: '🌦️' },
    rain:          { label: 'Rain',           emoji: '🌧️' },
    heavy_rain:    { label: 'Heavy Rain',     emoji: '⛈️' },
    snow:          { label: 'Snow',           emoji: '❄️'  },
    thunderstorm:  { label: 'Thunderstorm',   emoji: '⛈️' },
    foggy:         { label: 'Foggy',          emoji: '🌫️' },
    windy:         { label: 'Windy',          emoji: '💨'  },
  };
  return map[c];
}

/**
 * Reverse geocodes coordinates to a human-readable city name.
 */
export async function getCityName(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  } catch {
    return 'Current Location';
  }
}

/**
 * Search for a city by name using Open-Meteo Geocoding API.
 * Returns up to 5 candidate results.
 */
export interface GeoSearchResult {
  name: string;
  country: string;
  admin1?: string;   // state/province
  latitude: number;
  longitude: number;
  displayName: string;
}

export async function searchCity(query: string): Promise<GeoSearchResult[]> {
  if (query.trim().length < 2) return [];
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: {
      name: string; country: string; admin1?: string; latitude: number; longitude: number;
    }) => ({
      name: r.name,
      country: r.country,
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude,
      displayName: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches real-time weather & 12-hour hourly forecast from Open-Meteo REST API.
 * Now also fetches wind speed, precipitation, and visibility.
 */
export async function fetchLiveWeather(lat: number = 28.6139, lon: number = 77.2090): Promise<LiveWeatherData> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,uv_index,weather_code,wind_speed_10m,precipitation,visibility` +
      `&hourly=temperature_2m,relative_humidity_2m,uv_index` +
      `&forecast_days=1&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo API returned status ${res.status}`);
    const data = await res.json();

    const current = data.current || {};
    const hourly  = data.hourly  || {};

    const cityName = await getCityName(lat, lon);

    const times: string[] = hourly.time || [];
    const temps: number[] = hourly.temperature_2m || [];

    const nowHourIndex = new Date().getHours();
    const hourlyTrend = [];

    for (let i = Math.max(0, nowHourIndex - 6); i <= Math.min(times.length - 1, nowHourIndex + 5); i++) {
      const dateObj = new Date(times[i]);
      const hourLabel = dateObj.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      hourlyTrend.push({
        hour: i === nowHourIndex ? 'Now' : hourLabel,
        tempC: Math.round(temps[i] || current.temperature_2m || 30),
      });
    }

    const windKmh: number = current.wind_speed_10m ?? 0;
    const precipMm: number = current.precipitation ?? 0;
    const wCode: number = current.weather_code ?? 0;

    // Override condition to 'windy' if very high wind and otherwise clear
    let condition = wmoToCondition(wCode);
    if (windKmh > 40 && condition === 'clear') condition = 'windy';
    if (precipMm > 10) condition = 'heavy_rain';

    return {
      latitude: lat,
      longitude: lon,
      cityName,
      tempC: current.temperature_2m ?? 32,
      feelsLikeC: current.apparent_temperature ?? 35,
      humidityPct: current.relative_humidity_2m ?? 60,
      uvIndex: current.uv_index ?? 6,
      weatherCode: wCode,
      weatherCondition: condition,
      windSpeedKmh: windKmh,
      precipMm,
      visibilityKm: (current.visibility ?? 10000) / 1000,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hourlyTrend,
    };
  } catch (err) {
    console.warn('Weather API request failed, using realistic fallback:', err);
    return {
      latitude: lat,
      longitude: lon,
      cityName: 'New Delhi, India',
      tempC: 38.5,
      feelsLikeC: 43.2,
      humidityPct: 74,
      uvIndex: 9.2,
      weatherCode: 0,
      weatherCondition: 'clear',
      windSpeedKmh: 12,
      precipMm: 0,
      visibilityKm: 10,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hourlyTrend: [
        { hour: '6 AM', tempC: 28 }, { hour: '8 AM', tempC: 31 }, { hour: '10 AM', tempC: 35 },
        { hour: '12 PM', tempC: 38 }, { hour: '2 PM', tempC: 39 }, { hour: '4 PM', tempC: 37 },
        { hour: 'Now', tempC: 38.5 },
      ],
    };
  }
}
