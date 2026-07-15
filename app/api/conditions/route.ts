// ============================================================
// app/api/conditions/route.ts
//
// Single source of truth for all pages.
// All three pages (Species, Map, Dams) call this endpoint.
// Data sources:
// - DART mg.php — daily fish counts + environmental data
// - USGS — hourly water temp + flow
// - Open-Meteo — weather forecasts
// ============================================================

import { NextResponse } from "next/server";
import { fetchAllConditions, fetchWeatherForecast } from "../../../lib/fetchData";

// Dam coordinates for localized weather forecasts
const DAM_COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  bonneville:      { lat: 45.644, lon: -121.940, name: "Bonneville Dam" },
  dalles:          { lat: 45.614, lon: -121.134, name: "The Dalles Dam" },
  johnday:         { lat: 45.715, lon: -120.694, name: "John Day Dam" },
  mcnary:          { lat: 45.934, lon: -119.298, name: "McNary Dam" },
  priestrapids:    { lat: 46.660, lon: -119.905, name: "Priest Rapids Dam" },
  wanapum:         { lat: 46.857, lon: -119.987, name: "Wanapum Dam" },
  rockisland:      { lat: 47.368, lon: -120.078, name: "Rock Island Dam" },
  rockyreach:      { lat: 47.526, lon: -120.248, name: "Rocky Reach Dam" },
  wells:           { lat: 47.975, lon: -119.672, name: "Wells Dam (Brewster)" },
  chiefjoseph:     { lat: 48.007, lon: -119.625, name: "Chief Joseph Dam" },
  grandcoulee:     { lat: 47.957, lon: -118.981, name: "Grand Coulee Dam" },
  iceharbor:       { lat: 46.249, lon: -118.878, name: "Ice Harbor Dam" },
  lowermonumental: { lat: 46.563, lon: -118.536, name: "Lower Monumental Dam" },
  littlegoose:     { lat: 46.585, lon: -118.026, name: "Little Goose Dam" },
  lowergranite:    { lat: 46.661, lon: -117.429, name: "Lower Granite Dam" },
  hellscanyon:     { lat: 45.257, lon: -116.698, name: "Hells Canyon Dam" },
  dworshak:        { lat: 46.516, lon: -116.296, name: "Dworshak Dam" },
};

// Fetch 10-day weather for a specific lat/lon from Open-Meteo
async function fetchDamWeather(lat: number, lon: number) {
  try {
    const url = [
      "https://api.open-meteo.com/v1/forecast",
      "?latitude=" + lat,
      "&longitude=" + lon,
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode",
      "&temperature_unit=fahrenheit",
      "&forecast_days=10",
      "&timezone=America%2FLos_Angeles",
    ].join("");

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      dates:  data.daily?.time ?? [],
      highs:  data.daily?.temperature_2m_max ?? [],
      lows:   data.daily?.temperature_2m_min ?? [],
      precip: data.daily?.precipitation_sum ?? [],
      codes:  data.daily?.weathercode ?? [],
    };
  } catch {
    return null;
  }
}

function weatherLabel(code: number): string {
  if (code === 0) return "Sunny";
  if (code <= 2)  return "Partly cloudy";
  if (code <= 3)  return "Cloudy";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow";
  if (code <= 84) return "Showers";
  if (code <= 99) return "Thunderstorm";
  return "Mixed";
}

function weatherShort(code: number): string {
  if (code === 0) return "Sunny";
  if (code <= 2)  return "P.Cloudy";
  if (code <= 3)  return "Cloudy";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow";
  if (code <= 84) return "Showers";
  if (code <= 99) return "T-Storm";
  return "Mixed";
}

function formatDateLabel(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "numeric", day: "numeric",
  });
}

function buildDays(weather: {
  dates: string[]; highs: number[]; lows: number[];
  precip: number[]; codes: number[];
}) {
  return weather.dates.map((date: string, i: number) => ({
    date,
    dateLabel:  formatDateLabel(date, i),
    high:       Math.round(weather.highs[i] ?? 0),
    low:        Math.round(weather.lows[i] ?? 0),
    precip:     Math.round((weather.precip[i] ?? 0) * 100) / 100,
    condition:  weatherLabel(weather.codes[i] ?? 0),
    shortLabel: weatherShort(weather.codes[i] ?? 0),
    code:       weather.codes[i] ?? 0,
  }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const damId = searchParams.get("dam");
    const lat   = searchParams.get("lat");
    const lon   = searchParams.get("lon");
    const name  = searchParams.get("name") ?? "Fish location";

    // --------------------------------------------------------
    // CASE 1: Specific dam ID → return weather for that dam
    // --------------------------------------------------------
    if (damId && DAM_COORDS[damId]) {
      const coords = DAM_COORDS[damId];
      const weather = await fetchDamWeather(coords.lat, coords.lon);
      if (!weather) {
        return NextResponse.json(
          { error: "Weather unavailable for this dam" },
          { status: 500 }
        );
      }
      return NextResponse.json({
        damId,
        damName:   coords.name,
        location:  coords,
        days:      buildDays(weather),
        fetchedAt: new Date().toISOString(),
      });
    }

    // --------------------------------------------------------
    // CASE 2: Lat/lon → return weather for that location
    // Used by map page for "weather where fish are"
    // --------------------------------------------------------
    if (lat && lon) {
      const weather = await fetchDamWeather(parseFloat(lat), parseFloat(lon));
      if (!weather) {
        return NextResponse.json(
          { error: "Weather unavailable for this location" },
          { status: 500 }
        );
      }
      return NextResponse.json({
        damId:     "fish_location",
        damName:   name,
        location:  { lat: parseFloat(lat), lon: parseFloat(lon) },
        days:      buildDays(weather),
        fetchedAt: new Date().toISOString(),
      });
    }

    // --------------------------------------------------------
    // CASE 3: Default → all dam conditions + forecast
    // This is the main call all three pages use on load
    // --------------------------------------------------------
    const [conditions, forecast] = await Promise.all([
      fetchAllConditions(),
      fetchWeatherForecast(),
    ]);

    // Find the most recent dataThrough date across all dams
    // This tells all pages what date the DART data is current through
    const dataThrough = conditions
      .map(c => (c as { dataThrough?: string }).dataThrough ?? "")
      .filter(d => d.length > 0)
      .sort()
      .pop() ?? "";

    const realDamCount = conditions.filter(
      c => (c as { isRealData?: boolean }).isRealData
    ).length;

    return NextResponse.json({
      conditions,
      forecast,
      fetchedAt:     new Date().toISOString(),
      dataThrough,   // ← used by all pages to show "data through April 4"
      realDamCount,  // ← how many dams have live data
      dataSource:    "DART adult_daily.php + USGS Water Services + Open-Meteo",
      dataNote:      "Fish counts from DART (cbr.washington.edu). Water temp + flow from USGS + DART scroll case sensor.",
    });

  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
