/**
 * Open-Meteo weather adapter — free, no key required.
 * Provides: HDD (Heating Degree Days) / CDD (Cooling Degree Days) for natgas demand.
 *
 * Key US cities for energy demand forecasting:
 *   NYC (40.71, -74.01), Chicago (41.88, -87.63), Houston (29.76, -95.37),
 *   Denver (39.74, -104.99), Los Angeles (34.05, -118.24)
 *
 * HDD = max(0, 65°F - avg_temp°F)  — drives heating demand (natgas)
 * CDD = max(0, avg_temp°F - 65°F)  — drives cooling demand (electricity/natgas)
 */
import { logger } from "../../../lib/logger";

const BASE = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 10000;

// Key US energy demand cities
const CITIES = [
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Chicago", lat: 41.88, lon: -87.63 },
  { name: "Houston", lat: 29.76, lon: -95.37 },
  { name: "Denver", lat: 39.74, lon: -104.99 },
  { name: "Los Angeles", lat: 34.05, lon: -118.24 },
];

const HDD_BASE_TEMP_F = 65;
const CDD_BASE_TEMP_F = 65;

let lastFetch: string | null = null;
let lastError: string | null = null;
let lastLatencyMs = 0;

export function getWeatherStatus() {
  return {
    healthy: lastError === null,
    latencyMs: lastLatencyMs,
    lastFetch,
    error: lastError || undefined,
  };
}

export interface CityWeather {
  city: string;
  latitude: number;
  longitude: number;
  maxTempC: number;
  minTempC: number;
  avgTempC: number;
  maxTempF: number;
  minTempF: number;
  avgTempF: number;
  hdd: number;
  cdd: number;
  forecastDays: number;
  dates: string[];
}

export interface WeatherSummary {
  nationalHDD: number;
  nationalCDD: number;
  cities: CityWeather[];
  timestamp: string;
}

function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

function calcHDD(avgF: number): number {
  return Math.max(0, HDD_BASE_TEMP_F - avgF);
}

function calcCDD(avgF: number): number {
  return Math.max(0, avgF - CDD_BASE_TEMP_F);
}

async function fetchCityWeather(city: { name: string; lat: number; lon: number }): Promise<CityWeather | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(city.lat),
      longitude: String(city.lon),
      daily: "temperature_2m_max,temperature_2m_min",
      temperature_unit: "celsius",
      timezone: "America/New_York",
      forecast_days: "7",
    });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const r = await fetch(`${BASE}?${params}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);
    const data = await r.json();
    const daily = data?.daily;
    if (!daily?.temperature_2m_max || !daily?.temperature_2m_min) return null;

    const maxTemps: number[] = daily.temperature_2m_max;
    const minTemps: number[] = daily.temperature_2m_min;
    const dates: string[] = daily.time;
    const n = maxTemps.length;

    let totalHDD = 0;
    let totalCDD = 0;
    const avgTempsF: number[] = [];
    for (let i = 0; i < n; i++) {
      const avgC = (maxTemps[i] + minTemps[i]) / 2;
      const avgF = celsiusToFahrenheit(avgC);
      avgTempsF.push(avgF);
      totalHDD += calcHDD(avgF);
      totalCDD += calcCDD(avgF);
    }

    const avgMaxC = maxTemps.reduce((a, b) => a + b, 0) / n;
    const avgMinC = minTemps.reduce((a, b) => a + b, 0) / n;
    const avgAvgF = avgTempsF.reduce((a, b) => a + b, 0) / n;

    return {
      city: city.name,
      latitude: city.lat,
      longitude: city.lon,
      maxTempC: Math.round(avgMaxC * 10) / 10,
      minTempC: Math.round(avgMinC * 10) / 10,
      avgTempC: Math.round(((avgMaxC + avgMinC) / 2) * 10) / 10,
      maxTempF: celsiusToFahrenheit(avgMaxC),
      minTempF: celsiusToFahrenheit(avgMinC),
      avgTempF: Math.round(avgAvgF),
      hdd: Math.round(totalHDD),
      cdd: Math.round(totalCDD),
      forecastDays: n,
      dates,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Fetch weather for all key US energy demand cities.
 * Returns HDD/CDD data for natural gas demand forecasting.
 */
export async function fetchWeatherDemand(): Promise<WeatherSummary | null> {
  const t0 = Date.now();
  try {
    const results = await Promise.allSettled(CITIES.map(fetchCityWeather));
    const cities = results
      .filter((r): r is PromiseFulfilledResult<CityWeather | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((c): c is CityWeather => c !== null);

    if (cities.length === 0) {
      lastError = "no cities returned data";
      lastLatencyMs = Date.now() - t0;
      return null;
    }

    // National aggregate = sum of all city HDDs/CDDs
    const nationalHDD = cities.reduce((sum, c) => sum + c.hdd, 0);
    const nationalCDD = cities.reduce((sum, c) => sum + c.cdd, 0);

    lastFetch = new Date().toISOString();
    lastError = null;
    lastLatencyMs = Date.now() - t0;
    logger.debug({ cities: cities.length, nationalHDD, nationalCDD, ms: lastLatencyMs }, "weather demand fetched");

    return { nationalHDD, nationalCDD, cities, timestamp: new Date().toISOString() };
  } catch (err) {
    lastError = (err as Error).message;
    lastLatencyMs = Date.now() - t0;
    return null;
  }
}

/**
 * Fetch weather for a single city.
 */
export async function fetchCityDemand(cityName: string): Promise<CityWeather | null> {
  const city = CITIES.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
  if (!city) return null;
  return fetchCityWeather(city);
}
