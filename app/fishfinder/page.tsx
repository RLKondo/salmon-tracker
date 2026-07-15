"use client";
// ============================================================
// COLUMBIA SALMON TRACKER - FishFinder Page
// File: app/fishfinder/page.tsx
//
// User picks dams + species + data types across three collapsible
// tiles, and a fourth tile renders one result card per selected dam.
// All data comes from /api/conditions (same source as every other page).
// Selections persist to localStorage under "fishfinder_settings".
// ============================================================

import { useState, useEffect, useMemo, useRef } from "react";
import type { RiverDailyRow } from "../../lib/fetchData";

// ============================================================
// TYPES
// ============================================================
interface DamCondition {
  damId: string;
  waterTempF: number;
  flowKcfs: number;
  isRealData: boolean;
  dataThrough?: string;
  hasLadderData?: boolean;
  chinookSpring?: number;
  chinookSummer?: number;
  chinookFall?: number;
  coho?: number;
  sockeye?: number;
  steelhead?: number;
  shad?: number;
  lamprey?: number;
  chum?: number;
  pink?: number;
  fishCount?: number;
  avg3day_chinookSpring?: number;
  avg3day_chinookSummer?: number;
  avg3day_chinookFall?: number;
  avg3day_coho?: number;
  avg3day_sockeye?: number;
  avg3day_steelhead?: number;
  avg3day_shad?: number;
  avg3day_lamprey?: number;
  avg3day_chum?: number;
  avg3day_pink?: number;
  avg3day_total?: number;
  ytd_chinook?: number;
  ytd_steelhead?: number;
  ytd_coho?: number;
  ytd_sockeye?: number;
  ytd_shad?: number;
  ytd_lamprey?: number;
  ytd_chum?: number;
  ytd_pink?: number;
  baromPres?: number | null;
  gasPct?: number | null;
  spillPct?: number | null;
  outflowKcfs?: number | null;
  turbidity?: number | null;
}

interface DamInfo {
  id: string;
  name: string;
  river: "columbia" | "snake";
  riverMile: number;
}

interface SpeciesInfo {
  id: string;
  label: string;
  field: keyof DamCondition;
  avgField: keyof DamCondition;
  ytdField?: keyof DamCondition;
}

interface DataTypeInfo {
  id: string;
  label: string;
}

interface WeatherDay {
  date: string;
  dateLabel: string;
  high: number;
  low: number;
  precip: number;
  condition: string;
  shortLabel: string;
  code: number;
}

interface Settings {
  dams: string[];
  species: string[];
  dataTypes: string[];
  collapsed: Record<string, boolean>;
}

// ============================================================
// STATIC REFERENCE DATA
// ============================================================
const ALL_DAMS: DamInfo[] = [
  { id: "bonneville",      name: "Bonneville Dam",       river: "columbia", riverMile: 146 },
  { id: "dalles",          name: "The Dalles Dam",       river: "columbia", riverMile: 191 },
  { id: "johnday",         name: "John Day Dam",         river: "columbia", riverMile: 215 },
  { id: "mcnary",          name: "McNary Dam",           river: "columbia", riverMile: 292 },
  { id: "priestrapids",    name: "Priest Rapids Dam",    river: "columbia", riverMile: 397 },
  { id: "wanapum",         name: "Wanapum Dam",          river: "columbia", riverMile: 415 },
  { id: "rockisland",      name: "Rock Island Dam",      river: "columbia", riverMile: 453 },
  { id: "rockyreach",      name: "Rocky Reach Dam",      river: "columbia", riverMile: 473 },
  { id: "wells",           name: "Wells Dam",            river: "columbia", riverMile: 515 },
  { id: "iceharbor",       name: "Ice Harbor Dam",       river: "snake",    riverMile: 9   },
  { id: "lowermonumental", name: "Lower Monumental Dam", river: "snake",    riverMile: 41  },
  { id: "littlegoose",     name: "Little Goose Dam",     river: "snake",    riverMile: 70  },
  { id: "lowergranite",    name: "Lower Granite Dam",    river: "snake",    riverMile: 107 },
];

const ALL_SPECIES: SpeciesInfo[] = [
  { id: "chinookSpring", label: "Chinook Spring", field: "chinookSpring", avgField: "avg3day_chinookSpring", ytdField: "ytd_chinook" },
  { id: "chinookSummer", label: "Chinook Summer", field: "chinookSummer", avgField: "avg3day_chinookSummer" },
  { id: "chinookFall",   label: "Chinook Fall",   field: "chinookFall",   avgField: "avg3day_chinookFall" },
  { id: "coho",          label: "Coho",           field: "coho",          avgField: "avg3day_coho",     ytdField: "ytd_coho" },
  { id: "sockeye",       label: "Sockeye",        field: "sockeye",       avgField: "avg3day_sockeye",  ytdField: "ytd_sockeye" },
  { id: "steelhead",     label: "Steelhead",      field: "steelhead",     avgField: "avg3day_steelhead", ytdField: "ytd_steelhead" },
  { id: "shad",          label: "Shad",           field: "shad",          avgField: "avg3day_shad",     ytdField: "ytd_shad" },
  { id: "lamprey",       label: "Lamprey",        field: "lamprey",       avgField: "avg3day_lamprey",  ytdField: "ytd_lamprey" },
  { id: "chum",          label: "Chum",           field: "chum",          avgField: "avg3day_chum",     ytdField: "ytd_chum" },
  { id: "pink",          label: "Pink",           field: "pink",          avgField: "avg3day_pink",     ytdField: "ytd_pink" },
];

const ALL_DATA_TYPES: DataTypeInfo[] = [
  { id: "fishCounts",  label: "Fish counts (daily + 3-day avg)" },
  { id: "waterTemp",   label: "Water temperature" },
  { id: "flow",        label: "River flow (kcfs)" },
  { id: "weather",     label: "Weather forecast (5-day)" },
  { id: "baromPres",   label: "Barometric pressure (mmHg)" },
  { id: "gasPct",      label: "Dissolved gas %" },
  { id: "spillPct",    label: "Spill percent" },
  { id: "turbidity",   label: "Visibility / turbidity" },
];

// DART project codes — dams not listed here have no river_daily
// data (no DART project code to query river conditions from).
const DART_PROJECT_CODES: Record<string, string> = {
  bonneville:      "BON",
  dalles:          "TDA",
  johnday:         "JDA",
  mcnary:          "MCN",
  priestrapids:    "PRD",
  wanapum:         "WAN",
  rockisland:      "RIS",
  rockyreach:      "RRH",
  wells:           "WEL",
  iceharbor:       "IHR",
  lowermonumental: "LMN",
  littlegoose:     "LGS",
  lowergranite:    "LWG",
};

const TIME_RANGES = [1, 3, 7] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const STORAGE_KEY = "fishfinder_settings";

// Nothing pre-selected — the user picks what they want to see.
const DEFAULT_SETTINGS: Settings = {
  dams: [],
  species: [],
  dataTypes: [],
  collapsed: { dams: false, species: false, dataTypes: false, results: false, riverHistory: false },
};

// ============================================================
// HELPERS
// ============================================================
function countColor(n: number): string {
  if (n > 100) return "text-green-700 bg-green-50";
  if (n > 0)   return "text-blue-700 bg-blue-50";
  return "text-gray-600 bg-gray-50";
}

function baromInterpretation(mmHg: number | null | undefined): string | null {
  if (mmHg == null) return null;
  if (mmHg >= 760) return "Rising";
  if (mmHg >= 745) return "Stable";
  return "Falling";
}

function riverLabel(river: string): string {
  return river === "snake" ? "Snake River" : "Columbia River";
}

// Always comma-separated, full precision — used for YTD season totals.
function formatFull(n: number): string {
  return Math.round(n).toLocaleString();
}

// Comma-separated below 10,000; K notation above — used for daily counts,
// which can spike into the tens of thousands (e.g. shad runs).
function formatCompact(n: number): string {
  if (n >= 10000) return (n / 1000).toFixed(1) + "K";
  return Math.round(n).toLocaleString();
}

function trendArrow(today: number, avg: number): { symbol: string; color: string } {
  if (today > avg) return { symbol: "↑", color: "text-green-600" };
  if (today < avg) return { symbol: "↓", color: "text-red-600" };
  return { symbol: "→", color: "text-gray-600" };
}

function speciesNameColor(count: number): string {
  if (count > 100) return "text-green-700 font-medium";
  if (count > 0)   return "text-blue-700 font-medium";
  return "text-gray-600";
}

// ============================================================
// COMPONENT
// ============================================================
export default function FishFinderPage() {
  const [conditions, setConditions] = useState<DamCondition[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [dataError, setDataError]     = useState(false);
  const [dataThrough, setDataThrough] = useState<string>("");
  const [isRealData, setIsRealData]   = useState(false);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded]     = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Settings>;
        setSettings({
          dams:      saved.dams      ?? DEFAULT_SETTINGS.dams,
          species:   saved.species   ?? DEFAULT_SETTINGS.species,
          dataTypes: saved.dataTypes ?? DEFAULT_SETTINGS.dataTypes,
          collapsed: { ...DEFAULT_SETTINGS.collapsed, ...(saved.collapsed ?? {}) },
        });
      }
    } catch {
      // ignore corrupt localStorage
    }
    setLoaded(true);
  }, []);

  // Persist settings whenever they change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, loaded]);

  // Fetch live conditions
  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const res  = await fetch("/api/conditions");
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        if (json.conditions)   setConditions(json.conditions);
        if (json.dataThrough)  setDataThrough(json.dataThrough);
        setIsRealData((json.realDamCount ?? 0) > 0);
        setDataError(false);
      } catch {
        setDataError(true);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Fetch 5-day weather forecasts for selected dams, only when the
  // "weather" data type is checked. Uses /api/conditions?dam=<id>,
  // a separate per-dam query (the bulk fetch above doesn't include
  // per-dam forecasts).
  const [weatherByDam, setWeatherByDam]   = useState<Record<string, WeatherDay[] | null>>({});
  const [weatherLoading, setWeatherLoading] = useState(false);

  const wantsWeather = settings.dataTypes.includes("weather");
  const weatherDamsKey = wantsWeather ? settings.dams.slice().sort().join(",") : "";

  useEffect(() => {
    if (!wantsWeather || settings.dams.length === 0) return;
    let cancelled = false;

    async function loadWeather() {
      setWeatherLoading(true);
      const results = await Promise.all(
        settings.dams.map(async damId => {
          try {
            const res = await fetch(`/api/conditions?dam=${damId}`);
            if (!res.ok) return [damId, null] as const;
            const json = await res.json();
            const days: WeatherDay[] = Array.isArray(json.days) ? json.days.slice(0, 5) : [];
            return [damId, days] as const;
          } catch {
            return [damId, null] as const;
          }
        })
      );
      if (cancelled) return;
      setWeatherByDam(prev => {
        const next = { ...prev };
        for (const [damId, days] of results) next[damId] = days;
        return next;
      });
      setWeatherLoading(false);
    }

    loadWeather();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsWeather, weatherDamsKey]);

  // Fetch Flow & Water Level history for the dams selected in Tile 1.
  // Keyed by damId so toggling a dam off (removing it from the graph
  // list) never discards data already fetched for other dams — only
  // a time-range change forces a re-fetch of everything selected.
  const [graphData, setGraphData]       = useState<Record<string, RiverDailyRow[]>>({});
  const [graphLoading, setGraphLoading] = useState<Record<string, boolean>>({});
  const [timeRange, setTimeRange]       = useState<TimeRange>(3);
  const prevTimeRangeRef = useRef(timeRange);

  const graphDams    = ALL_DAMS.filter(d => settings.dams.includes(d.id) && DART_PROJECT_CODES[d.id]);
  const graphDamsKey = graphDams.map(d => d.id).join(",");

  useEffect(() => {
    if (graphDams.length === 0) return;

    const timeRangeChanged = prevTimeRangeRef.current !== timeRange;
    prevTimeRangeRef.current = timeRange;

    const damsToFetch = timeRangeChanged
      ? graphDams
      : graphDams.filter(d => !(d.id in graphData));

    if (damsToFetch.length === 0) return;

    let cancelled = false;

    async function loadGraphs() {
      setGraphLoading(prev => {
        const next = { ...prev };
        for (const d of damsToFetch) next[d.id] = true;
        return next;
      });

      const results = await Promise.all(
        damsToFetch.map(async d => {
          const proj = DART_PROJECT_CODES[d.id];
          try {
            const res = await fetch(`/api/river-history?proj=${proj}&days=${timeRange}`);
            if (!res.ok) return [d.id, [] as RiverDailyRow[]] as const;
            const json = await res.json();
            return [d.id, Array.isArray(json.rows) ? (json.rows as RiverDailyRow[]) : []] as const;
          } catch {
            return [d.id, [] as RiverDailyRow[]] as const;
          }
        })
      );

      if (cancelled) return;
      setGraphData(prev => {
        const next = { ...prev };
        for (const [damId, rows] of results) next[damId] = rows;
        return next;
      });
      setGraphLoading(prev => {
        const next = { ...prev };
        for (const d of damsToFetch) next[d.id] = false;
        return next;
      });
    }

    loadGraphs();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphDamsKey, timeRange]);

  const conditionsByDam = useMemo(() => {
    const map: Record<string, DamCondition> = {};
    for (const c of conditions) map[c.damId] = c;
    return map;
  }, [conditions]);

  // ------------------------------------------------------------
  // Selection helpers
  // ------------------------------------------------------------
  function toggleDam(id: string) {
    setSettings(s => ({
      ...s,
      dams: s.dams.includes(id) ? s.dams.filter(d => d !== id) : [...s.dams, id],
    }));
  }

  function toggleSpecies(id: string) {
    setSettings(s => ({
      ...s,
      species: s.species.includes(id) ? s.species.filter(x => x !== id) : [...s.species, id],
    }));
  }

  function toggleDataType(id: string) {
    setSettings(s => ({
      ...s,
      dataTypes: s.dataTypes.includes(id) ? s.dataTypes.filter(x => x !== id) : [...s.dataTypes, id],
    }));
  }

  function selectAllInRiver(river: "columbia" | "snake") {
    const riverDamIds = ALL_DAMS.filter(d => d.river === river).map(d => d.id);
    setSettings(s => ({ ...s, dams: Array.from(new Set([...s.dams, ...riverDamIds])) }));
  }

  function clearAllInRiver(river: "columbia" | "snake") {
    const riverDamIds = new Set(ALL_DAMS.filter(d => d.river === river).map(d => d.id));
    setSettings(s => ({ ...s, dams: s.dams.filter(id => !riverDamIds.has(id)) }));
  }

  function selectAllSpecies() {
    setSettings(s => ({ ...s, species: ALL_SPECIES.map(sp => sp.id) }));
  }

  function clearAllSpecies() {
    setSettings(s => ({ ...s, species: [] }));
  }

  function selectAllDataTypes() {
    setSettings(s => ({ ...s, dataTypes: ALL_DATA_TYPES.map(dt => dt.id) }));
  }

  function clearAllDataTypes() {
    setSettings(s => ({ ...s, dataTypes: [] }));
  }

  function toggleCollapsed(tile: string) {
    setSettings(s => ({ ...s, collapsed: { ...s.collapsed, [tile]: !s.collapsed[tile] } }));
  }

  // ------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------
  const selectedDams = ALL_DAMS.filter(d => settings.dams.includes(d.id));

  // Bonneville is the reference dam for Tile 2 — it's the first dam
  // upstream, so it counts every fish entering the river before any
  // tributary or upstream project splits the run.
  const bonneville = conditionsByDam["bonneville"];

  const speciesStats = useMemo(() => {
    const stats: Record<string, { today: number; avg3: number; ytd: number | null }> = {};
    for (const sp of ALL_SPECIES) {
      const today = (bonneville?.[sp.field] as number | undefined) ?? 0;
      const avg3  = (bonneville?.[sp.avgField] as number | undefined) ?? 0;
      const ytd   = sp.ytdField ? ((bonneville?.[sp.ytdField] as number | undefined) ?? null) : null;
      stats[sp.id] = { today, avg3, ytd };
    }
    return stats;
  }, [bonneville]);

  return (
    <main className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-3xl">🎣</span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">FishFinder</h1>
            <p className="text-sm text-gray-500">
              {isLoading
                ? "Loading live data..."
                : dataError
                ? <span className="text-amber-600">Could not reach DART — check connection</span>
                : <span>
                    <span className="text-green-600 font-medium">
                      {isRealData ? "✅ Live — DART" : "Using fallback data"}
                    </span>
                    {dataThrough && <span className="text-gray-600"> · data through {dataThrough}</span>}
                  </span>
              }
            </p>
          </div>
          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap gap-x-4 gap-y-1">
            <a href="/"               className="text-sm text-blue-600 hover:underline">← Species</a>
            <a href="/map"            className="text-sm text-blue-600 hover:underline">River Map</a>
            <a href="/dams"           className="text-sm text-blue-600 hover:underline">Dam Reference</a>
            <a href="/season-updates" className="text-sm text-blue-600 hover:underline">Season Updates</a>
          </div>
        </div>

        {/* TILE 1 — SELECT DAMS */}
        <Tile
          title="Select Dams"
          subtitle={`${settings.dams.length} of ${ALL_DAMS.length} selected`}
          collapsed={!!settings.collapsed.dams}
          onToggle={() => toggleCollapsed("dams")}
        >
          {(["columbia", "snake"] as const).map(river => (
            <div key={river} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600 uppercase tracking-wide">{riverLabel(river)}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => selectAllInRiver(river)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => clearAllInRiver(river)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {ALL_DAMS.filter(d => d.river === river).map(dam => (
                  <label
                    key={dam.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={settings.dams.includes(dam.id)}
                      onChange={() => toggleDam(dam.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-gray-800">{dam.name}</span>
                    <span className="text-xs text-gray-600 ml-auto">RM {dam.riverMile}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </Tile>

        {/* TILE 2 — SELECT SPECIES */}
        <Tile
          title="Select Species"
          subtitle={
            <>
              {settings.species.length} of {ALL_SPECIES.length} selected ·{" "}
              <span className="text-sky-600 font-medium">counts from Bonneville</span>
            </>
          }
          collapsed={!!settings.collapsed.species}
          onToggle={() => toggleCollapsed("species")}
        >
          <div className="flex items-center justify-end gap-3 mb-2">
            <button onClick={selectAllSpecies} className="text-xs text-blue-600 hover:underline">
              Select All
            </button>
            <button onClick={clearAllSpecies} className="text-xs text-blue-600 hover:underline">
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
            {ALL_SPECIES.map(sp => {
              const stat    = speciesStats[sp.id];
              const running = stat.today > 0;
              const trend   = trendArrow(stat.today, stat.avg3);
              return (
                <label
                  key={sp.id}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={settings.species.includes(sp.id)}
                    onChange={() => toggleSpecies(sp.id)}
                    className="rounded border-gray-300"
                  />
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${running ? "bg-green-500" : "bg-gray-300"}`}
                    title={running ? "Currently running" : "No count reported"}
                  />
                  <span className={speciesNameColor(stat.today)}>{sp.label}</span>
                  {!isLoading && (
                    <span className="ml-auto flex items-baseline gap-3 flex-shrink-0">
                      <span
                        className="flex items-baseline gap-1 whitespace-nowrap"
                        title="From Bonneville — the first dam upstream, counting every fish entering the river"
                      >
                        <span className="text-base font-bold text-sky-600">
                          {formatCompact(stat.today)}
                        </span>
                        <span className={`text-sm font-bold ${trend.color}`} title={`vs 3-day avg ${formatFull(stat.avg3)}`}>
                          {trend.symbol}
                        </span>
                        <span className="text-xs text-sky-500">/day</span>
                      </span>
                      <span className="text-xs text-sky-500 font-medium whitespace-nowrap">
                        {stat.ytd != null ? `${formatFull(stat.ytd)} YTD` : "—"}
                      </span>
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </Tile>

        {/* TILE 3 — SELECT DATA TO DISPLAY */}
        <Tile
          title="Select Data to Display"
          subtitle={`${settings.dataTypes.length} of ${ALL_DATA_TYPES.length} selected`}
          collapsed={!!settings.collapsed.dataTypes}
          onToggle={() => toggleCollapsed("dataTypes")}
        >
          <div className="flex items-center justify-end gap-3 mb-2">
            <button onClick={selectAllDataTypes} className="text-xs text-blue-600 hover:underline">
              Select All
            </button>
            <button onClick={clearAllDataTypes} className="text-xs text-blue-600 hover:underline">
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {ALL_DATA_TYPES.map(dt => (
              <label
                key={dt.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={settings.dataTypes.includes(dt.id)}
                  onChange={() => toggleDataType(dt.id)}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-800">{dt.label}</span>
              </label>
            ))}
          </div>
        </Tile>

        {/* TILE 4 — FLOW & WATER LEVEL HISTORY */}
        <Tile
          title="Flow & Water Level History"
          subtitle={`${selectedDams.length} dam${selectedDams.length === 1 ? "" : "s"} selected`}
          collapsed={!!settings.collapsed.riverHistory}
          onToggle={() => toggleCollapsed("riverHistory")}
        >
          {selectedDams.length === 0 ? (
            <p className="text-sm text-gray-600 py-4 text-center">
              Select at least one dam in Tile 1 to see flow & water level graphs.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-end gap-2 mb-3">
                <span className="text-xs text-gray-600 mr-1">Time range:</span>
                {TIME_RANGES.map(r => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`text-xs px-2.5 py-1 rounded-lg border ${
                      timeRange === r
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {r === 1 ? "Today" : `${r} Days`}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-4">
                {selectedDams.map(dam => (
                  <FlowGraphCard
                    key={dam.id}
                    dam={dam}
                    hasProject={!!DART_PROJECT_CODES[dam.id]}
                    rows={graphData[dam.id]}
                    loading={!!graphLoading[dam.id]}
                  />
                ))}
              </div>
            </>
          )}
        </Tile>

        {/* TILE 5 — RESULTS */}
        <Tile
          title="Results"
          subtitle={`${selectedDams.length} dam${selectedDams.length === 1 ? "" : "s"}`}
          collapsed={!!settings.collapsed.results}
          onToggle={() => toggleCollapsed("results")}
        >
          {isLoading ? (
            <ResultsSkeleton count={Math.max(selectedDams.length, 2)} />
          ) : selectedDams.length === 0 ? (
            <p className="text-sm text-gray-600 py-4 text-center">
              Select at least one dam in Tile 1 to see results.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {selectedDams.map(dam => (
                <DamCard
                  key={dam.id}
                  dam={dam}
                  conditions={conditionsByDam[dam.id]}
                  selectedSpecies={settings.species}
                  selectedDataTypes={settings.dataTypes}
                  weather={weatherByDam[dam.id]}
                  weatherLoading={weatherLoading}
                />
              ))}
            </div>
          )}
        </Tile>

      </div>
    </main>
  );
}

// ============================================================
// TILE — collapsible section wrapper
// ============================================================
function Tile({
  title,
  subtitle,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  subtitle: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-600">{subtitle}</p>
        </div>
        <span className="text-gray-600 text-sm">{collapsed ? "▸ Expand" : "▾ Collapse"}</span>
      </button>
      {!collapsed && <div className="px-4 pb-4 border-t border-gray-100 pt-3">{children}</div>}
    </div>
  );
}

// ============================================================
// DAM CARD — one per selected dam in Tile 4
// ============================================================
function DamCard({
  dam,
  conditions,
  selectedSpecies,
  selectedDataTypes,
  weather,
  weatherLoading,
}: {
  dam: DamInfo;
  conditions: DamCondition | undefined;
  selectedSpecies: string[];
  selectedDataTypes: string[];
  weather: WeatherDay[] | null | undefined;
  weatherLoading: boolean;
}) {
  const has = (id: string) => selectedDataTypes.includes(id);
  const speciesToShow = ALL_SPECIES.filter(sp => selectedSpecies.includes(sp.id));

  const barom = baromInterpretation(conditions?.baromPres);
  const gasHigh = (conditions?.gasPct ?? 0) > 110;

  return (
    <div className="bg-white border-2 border-gray-300 rounded-xl p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900">{dam.name}</h3>
          <span className="text-xs text-gray-600">{riverLabel(dam.river)} · RM {dam.riverMile}</span>
          {conditions?.dataThrough && (
            <span className="text-xs text-gray-500">· through {conditions.dataThrough}</span>
          )}
        </div>
        {conditions?.isRealData && (
          <span className="text-xs text-green-700 font-semibold flex-shrink-0">✅ Live — DART</span>
        )}
      </div>

      {!conditions ? (
        <p className="text-xs text-gray-600 py-2">No data available for this dam.</p>
      ) : (
        <>
          {/* FISH COUNTS — compact wrapping chips, one per species */}
          {has("fishCounts") && speciesToShow.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {speciesToShow.map(sp => {
                const today = (conditions[sp.field] as number | undefined) ?? 0;
                const avg3  = (conditions[sp.avgField] as number | undefined) ?? 0;
                const ytd   = sp.ytdField ? (conditions[sp.ytdField] as number | undefined) : undefined;
                return (
                  <div
                    key={sp.id}
                    className={`flex items-baseline gap-1 px-2 py-1 rounded-lg text-xs font-medium ${countColor(today)}`}
                  >
                    <span>{sp.label}</span>
                    <span className="font-bold text-sm">{formatCompact(today)}</span>
                    <span className="opacity-70">/day</span>
                    <span className="opacity-70">· {formatCompact(avg3)} avg</span>
                    {ytd != null && <span className="opacity-70">· {formatFull(ytd)} YTD</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ENVIRONMENTAL STAT CARDS — denser grid now the card is full-width */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
            {has("waterTemp") && (
              <StatCard label="Water Temp" value={conditions.waterTempF != null ? `${conditions.waterTempF}°F` : null} />
            )}
            {has("flow") && (
              <StatCard label="River Flow" value={conditions.flowKcfs != null ? `${conditions.flowKcfs} kcfs` : null} />
            )}
            {has("baromPres") && (
              <StatCard
                label="Barometric Pressure"
                value={conditions.baromPres != null ? `${conditions.baromPres} mmHg` : null}
                note={barom ?? undefined}
              />
            )}
            {has("gasPct") && (
              <StatCard
                label="Dissolved Gas"
                value={conditions.gasPct != null ? `${conditions.gasPct}%` : null}
                warning={gasHigh ? "⚠ Above 110%" : undefined}
              />
            )}
            {has("spillPct") && (
              <StatCard label="Spill" value={conditions.spillPct != null ? `${conditions.spillPct}%` : null} />
            )}
            {has("turbidity") && (
              <StatCard label="Turbidity" value={conditions.turbidity != null ? `${conditions.turbidity} NTU` : null} />
            )}
          </div>

          {/* WEATHER — 5-day forecast for this dam's location */}
          {has("weather") && (
            <div className="mt-2">
              {weather === undefined || weather === null ? (
                weatherLoading ? (
                  <p className="text-xs text-gray-600">Loading forecast...</p>
                ) : (
                  <p className="text-xs text-gray-600">Weather forecast unavailable.</p>
                )
              ) : weather.length === 0 ? (
                <p className="text-xs text-gray-600">Weather forecast unavailable.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {weather.map(day => (
                    <div
                      key={day.date}
                      className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-gray-50 text-xs min-w-[68px]"
                    >
                      <span className="font-semibold text-gray-700">{day.dateLabel}</span>
                      <span className="text-gray-600">{day.shortLabel}</span>
                      <span className="font-bold text-gray-900">
                        {Math.round(day.high)}°/{Math.round(day.low)}°
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// STAT CARD — small environmental stat tile
// ============================================================
function StatCard({
  label,
  value,
  note,
  warning,
}: {
  label: string;
  value: string | null;
  note?: string;
  warning?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
      <p className="text-[11px] leading-tight text-gray-600">{label}</p>
      <p className="text-sm font-bold leading-tight text-gray-900">{value ?? "—"}</p>
      {note && <p className="text-[11px] leading-tight text-gray-600">{note}</p>}
      {warning && <p className="text-[11px] leading-tight text-red-700 font-semibold">{warning}</p>}
    </div>
  );
}

// ============================================================
// LOADING SKELETON
// ============================================================
function ResultsSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/3 mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// FLOW GRAPH CARD — one per selected dam in Tile 5
// ============================================================
function FlowGraphCard({
  dam,
  hasProject,
  rows,
  loading,
}: {
  dam: DamInfo;
  hasProject: boolean;
  rows: RiverDailyRow[] | undefined;
  loading: boolean;
}) {
  if (!hasProject) {
    return (
      <div className="bg-white border-2 border-gray-300 rounded-xl p-3 shadow-sm">
        <div className="flex items-baseline gap-2 flex-wrap mb-2">
          <h3 className="text-sm font-semibold text-gray-900">{dam.name}</h3>
          <span className="text-xs text-gray-600">{riverLabel(dam.river)} · RM {dam.riverMile}</span>
        </div>
        <p className="text-xs text-gray-600 py-2">
          Flow data not available for {dam.name} — DART does not track this dam&apos;s river conditions
        </p>
      </div>
    );
  }

  const flowRows = (rows ?? []).filter(r => r.outflowKcfs !== null);
  const elevRows = (rows ?? []).filter(r => r.elevationFt !== null);
  const reported = (rows ?? []).filter(r => r.outflowKcfs !== null || r.elevationFt !== null);
  const dataThrough = reported.length > 0 ? reported[reported.length - 1].date : "";
  const isRealData  = reported.length > 0;

  return (
    <div className="bg-white border-2 border-gray-300 rounded-xl p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900">{dam.name}</h3>
          <span className="text-xs text-gray-600">{riverLabel(dam.river)} · RM {dam.riverMile}</span>
          {dataThrough && <span className="text-xs text-gray-500">· Data through {dataThrough}</span>}
        </div>
        {isRealData && (
          <span className="text-xs text-green-700 font-semibold flex-shrink-0">✅ Live — DART</span>
        )}
      </div>

      {loading && !rows ? (
        <div className="animate-pulse space-y-2 py-2">
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-16 bg-gray-100 rounded w-full" />
        </div>
      ) : !rows || reported.length === 0 ? (
        <p className="text-xs text-gray-600 py-2">
          No flow or water level data reported for {dam.name} in the selected time range.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Sparkline
            label="River Flow (kcfs)"
            rows={flowRows}
            value={r => r.outflowKcfs as number}
          />
          <Sparkline
            label="Water Level / Elevation (ft)"
            rows={elevRows}
            value={r => r.elevationFt as number}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// SPARKLINE — small inline SVG line chart for one metric
// ============================================================
function Sparkline({
  label,
  rows,
  value,
}: {
  label: string;
  rows: RiverDailyRow[];
  value: (row: RiverDailyRow) => number;
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
        <p className="text-[11px] leading-tight text-gray-600">{label}</p>
        <p className="text-xs text-gray-500 py-2">Not reported</p>
      </div>
    );
  }

  // Reserve room above the line for per-point value labels and below
  // it for a little breathing space, so labels never clip the viewBox.
  const width      = 280;
  const height     = 96;
  const topPad     = 18;
  const bottomPad  = 8;
  const chartTop   = topPad;
  const chartBottom = height - bottomPad;
  const chartHeight = chartBottom - chartTop;

  const values = rows.map(value);
  const min    = Math.min(...values);
  const max    = Math.max(...values);
  const range  = max - min || 1;

  const coords = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
    const y = chartBottom - ((v - min) / range) * chartHeight;
    return { x, y, v };
  });

  return (
    <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[11px] leading-tight text-gray-600">{label}</p>
        <p className="text-sm font-bold leading-tight text-gray-900">
          {Math.round(values[values.length - 1]).toLocaleString()}
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <polyline
          points={coords.map(p => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-sky-500"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((p, i) => {
          // First/last labels are centered on a point that sits right at
          // the viewBox edge — center-anchoring them would push half the
          // text outside the SVG and clip it. Anchor those inward instead.
          const isFirst = i === 0;
          const isLast  = i === coords.length - 1;
          const anchor  = isFirst ? "start" : isLast ? "end" : "middle";
          const labelX  = isFirst ? p.x + 2 : isLast ? p.x - 2 : p.x;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={2.5} className="fill-sky-600" />
              <text
                x={labelX}
                y={p.y - 6}
                textAnchor={anchor}
                className="fill-gray-700"
                style={{ fontSize: 9, fontWeight: 600 }}
              >
                {Math.round(p.v).toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>{rows[0].date}</span>
        <span>{rows[rows.length - 1].date}</span>
      </div>
    </div>
  );
}
