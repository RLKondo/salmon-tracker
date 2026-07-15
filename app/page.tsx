"use client";
// ============================================================
// COLUMBIA SALMON TRACKER - Species Report Page
// File: app/page.tsx
//
// All data is live from:
// - DART mg.php — daily fish counts per dam
// - USGS — water temp + flow
// - DART adult_basin_sum.php — YTD season totals
// No hardcoded mock counts anywhere in this file.
// ============================================================

import { useState, useEffect } from "react";

// ============================================================
// TYPES
// ============================================================
type RunStatus = "strong" | "building" | "light" | "none";
type Confidence = "High" | "Medium" | "Low";
type SegmentStatus = "past" | "now" | "forecast" | "none";

interface SpeciesData {
  id: string;
  label: string;
  title: string;
  runStatus: RunStatus;
  statusLabel: string;
  phase: string;
  peak: string;
  summary: string;
  fishingTip: string | null;
  segments: SegmentStatus[];
  forecastBullets: string[];
  note: string;
  dartKey: string;
  // Season timing
  seasonStart: string;
  seasonNote: string;
}

interface DamCondition {
  damId: string;
  waterTempF: number;
  flowKcfs: number;
  isRealData: boolean;
  dataThrough?: string;
  hasLadderData?: boolean;
  hasBasinData?: boolean;
  chinookSpring: number;
  chinookSummer: number;
  chinookFall: number;
  coho: number;
  sockeye: number;
  steelhead: number;
  shad: number;
  lamprey: number;
  chum: number;
  pink: number;
  fishCount: number;
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
  ytd_chinook?: number;
  ytd_steelhead?: number;
  ytd_coho?: number;
  ytd_sockeye?: number;
  ytd_shad?: number;
  ytd_lamprey?: number;
  ytd_chum?: number;
  ytd_pink?: number;
  max3day_chinookSpring: number;
  max3day_chinookSummer: number;
  max3day_chinookFall: number;
  max3day_coho: number;
  max3day_sockeye: number;
  max3day_steelhead: number;
  max3day_shad: number;
  max3day_lamprey: number;
  max3day_chum: number;
  max3day_pink: number;
  baromPres?: number | null;
  gasPct?: number | null;
  spillPct?: number | null;
  history: { date: string }[];
}

// ============================================================
// 10-YEAR HISTORICAL AVERAGES (hardcoded from DART Quick Look)
// Source: DART adult_basin_sum / Quick Look 2015-2024
// ============================================================
interface HistoricalAvg {
  avgPeakDaily: number;
  avgPeakDate: string;
  avgPeakWindow: string;
  avgAnnualTotal: number;
  seasonStart: string;
  seasonEnd: string;
  timingNote: string;
}

const HISTORICAL: Record<string, HistoricalAvg> = {
  chinook_spring: { avgPeakDaily: 3440, avgPeakDate: "May 5", avgPeakWindow: "late April – mid May", avgAnnualTotal: 280000, seasonStart: "March 15", seasonEnd: "June 15", timingNote: "Spring Chinook are the first salmon of the year. Peak passage at Bonneville is typically May 1–10. Fish are destined for tributaries throughout the Columbia and Snake basins." },
  chinook_summer: { avgPeakDaily: 3580, avgPeakDate: "July 18", avgPeakWindow: "late June – late July", avgAnnualTotal: 190000, seasonStart: "June 1", seasonEnd: "August 15", timingNote: "Summer Chinook overlap with late spring fish at Bonneville in June. Most are destined for upper Columbia tributaries including the Wenatchee, Methow, and Okanogan rivers." },
  chinook_fall:   { avgPeakDaily: 28400, avgPeakDate: "September 28", avgPeakWindow: "mid September – mid October", avgAnnualTotal: 550000, seasonStart: "August 1", seasonEnd: "November 15", timingNote: "Fall Chinook are the most abundant Chinook at Bonneville. The Hanford Reach population is one of the largest wild Chinook runs in the Columbia. Peak counts regularly exceed 30,000/day." },
  coho:           { avgPeakDaily: 8200, avgPeakDate: "September 20", avgPeakWindow: "September – October", avgAnnualTotal: 420000, seasonStart: "August 1", seasonEnd: "November 30", timingNote: "Coho show two distinct waves — early run August-September and a larger late run in October. Most are hatchery fish from lower Columbia tributaries." },
  sockeye:        { avgPeakDaily: 3400, avgPeakDate: "July 1", avgPeakWindow: "mid June – mid July", avgAnnualTotal: 260000, seasonStart: "May 1", seasonEnd: "August 31", timingNote: "Columbia River sockeye are primarily destined for the Okanogan River system in BC. Run timing is tightly correlated with water temperature." },
  steelhead:      { avgPeakDaily: 1500, avgPeakDate: "August 10", avgPeakWindow: "July – September", avgAnnualTotal: 380000, seasonStart: "January 1", seasonEnd: "December 31", timingNote: "Steelhead run year-round in the Columbia. Winter/spring fish present December–May. Main summer run builds from June through August. Peak is typically early August." },
  shad:           { avgPeakDaily: 112000, avgPeakDate: "June 15", avgPeakWindow: "late May – early July", avgAnnualTotal: 4200000, seasonStart: "May 1", seasonEnd: "July 31", timingNote: "Shad are the most numerous fish to pass Bonneville — annual totals regularly exceed 4 million. Peak daily counts can exceed 150,000. Very popular sport fishery in the lower Columbia." },
  lamprey:        { avgPeakDaily: 1800, avgPeakDate: "July 15", avgPeakWindow: "June – August", avgAnnualTotal: 85000, seasonStart: "June 1", seasonEnd: "September 30", timingNote: "Pacific Lamprey have declined significantly over 30 years but are recovering. Culturally critical to Columbia Basin tribes. DART tracks daytime window counts and LPS counts separately." },
  chum:           { avgPeakDaily: 3200, avgPeakDate: "October 25", avgPeakWindow: "mid October – mid November", avgAnnualTotal: 140000, seasonStart: "October 1", seasonEnd: "December 1", timingNote: "Chum primarily use lower Columbia tributaries (Cowlitz, Grays, Kalama). Most fish do not pass Bonneville in large numbers." },
  pink:           { avgPeakDaily: 14000, avgPeakDate: "August 25", avgPeakWindow: "August – September (odd years only)", avgAnnualTotal: 320000, seasonStart: "August 1", seasonEnd: "October 1", timingNote: "Pink salmon only return in odd-numbered years. 2026 is an even year — essentially no run expected. Next significant run: 2027." },
};

// ============================================================
// RIVER SECTIONS
// ============================================================
const RIVER_SECTIONS = [
  "Lower / Estuary",
  "Below Bonneville",
  "Bonneville → Dalles",
  "Dalles → John Day",
  "John Day → McNary",
  "McNary → Tri-Cities",
  "Priest Rapids",
  "Wells / Brewster",
];

// ============================================================
// ALL 10 SPECIES — static content only, no hardcoded counts
// ============================================================
const ALL_SPECIES: SpeciesData[] = [
  {
    id: "chinook_spring", label: "Chinook Spring", title: "Chinook — Spring Run",
    runStatus: "none", statusLabel: "Checking...",
    phase: "Active migration", peak: "Peak: late April – May",
    summary: "Spring Chinook are the first salmon upriver each year and the most prized. Early fish are moving through the lower Columbia now. Watch Bonneville counts daily — the run builds quickly through April and May.",
    fishingTip: "Spring Chinook are excellent table fish — high in fat and flavor. Best fishing from Bonneville pool upstream to McNary. Check ODFW/WDFW regs for current open sections.",
    segments: ["past", "past", "now", "now", "forecast", "forecast", "none", "none"],
    forecastBullets: ["Fish ~2–3 days upstream from Bonneville after passing", "Favorable flow and temps expected through April", "Historical timing: peak at Bonneville early May", "Watch McNary counts for mid-river arrival timing"],
    note: "Fish counts from DART mg.php (cbr.washington.edu). Water temp + flow from USGS + DART scroll case sensor.",
    dartKey: "chinookSpring", seasonStart: "March", seasonNote: "Active spring migration",
  },
  {
    id: "chinook_summer", label: "Chinook Summer", title: "Chinook — Summer Run",
    runStatus: "none", statusLabel: "Checking...",
    phase: "Not yet — arrives June", peak: "Peak: ~July 20",
    summary: "Summer Chinook typically begin appearing at Bonneville in June. They overlap with late spring fish and are destined primarily for upper Columbia tributaries including the Wenatchee, Methow, and Okanogan rivers.",
    fishingTip: "Summer Chinook peak in July. Target the McNary to Priest Rapids stretch when counts build. Check WDFW regs for upper Columbia seasons.",
    segments: ["none", "none", "none", "none", "none", "none", "none", "none"],
    forecastBullets: ["First summer Chinook typically appear at Bonneville in June", "Counts build quickly through late June and July", "Destined for upper Columbia tributaries", "Watch for overlap with late spring fish in June"],
    note: "Fish counts from DART mg.php (cbr.washington.edu). Water temp + flow from USGS + DART scroll case sensor.",
    dartKey: "chinookSummer", seasonStart: "June", seasonNote: "Arrives June — peaks July",
  },
  {
    id: "chinook_fall", label: "Chinook Fall", title: "Chinook — Fall Run",
    runStatus: "none", statusLabel: "Not yet",
    phase: "Not yet running", peak: "Peak: Sept – Oct",
    summary: "Fall Chinook have not yet entered the river in significant numbers. First fish typically appear at Bonneville in late August. The Hanford Reach fall Chinook run is one of the largest wild Chinook runs remaining in the Columbia.",
    fishingTip: null,
    segments: ["none", "none", "none", "none", "none", "none", "none", "none"],
    forecastBullets: ["Historical timing: first fish ~August 20", "Ocean survival data suggests near-average return", "Watch for jack counts as early indicator", "Hanford Reach opens late August for world-class fishing"],
    note: "Fish counts from DART mg.php (cbr.washington.edu). Fall Chinook forecast from PFMC preseason report.",
    dartKey: "chinookFall", seasonStart: "August", seasonNote: "Arrives August — peaks late September",
  },
  {
    id: "coho", label: "Coho", title: "Coho Salmon",
    runStatus: "none", statusLabel: "Not yet",
    phase: "Not yet running", peak: "Peak: ~Sept 15",
    summary: "Coho have not yet entered the river. They typically begin appearing at Bonneville in August with two distinct waves — an early run in August-September and a larger late run in October. Aggressive biters and a favorite among sport anglers.",
    fishingTip: null,
    segments: ["none", "none", "none", "none", "none", "none", "none", "none"],
    forecastBullets: ["Early fish will begin pushing upstream in August", "Expect counts to build through September", "Water temps will be key driver of timing", "Watch The Dalles counts for mid-river timing"],
    note: "Fish counts from DART mg.php (cbr.washington.edu).",
    dartKey: "coho", seasonStart: "August", seasonNote: "Arrives August — peaks September",
  },
  {
    id: "sockeye", label: "Sockeye", title: "Sockeye Salmon",
    runStatus: "none", statusLabel: "Not yet",
    phase: "Not yet running", peak: "Peak: ~July 1",
    summary: "Sockeye have not yet arrived in significant numbers. They typically begin appearing at Bonneville in May and peak around July 1. Primarily destined for the Okanogan River system in British Columbia.",
    fishingTip: null,
    segments: ["none", "none", "none", "none", "none", "none", "none", "none"],
    forecastBullets: ["First fish expected at Bonneville in May", "Counts build quickly through June", "Water temps will be key driver — warm years delay passage", "Primarily destined for Okanogan River system"],
    note: "Fish counts from DART mg.php (cbr.washington.edu). Sockeye destined primarily for Okanogan system.",
    dartKey: "sockeye", seasonStart: "May", seasonNote: "Arrives May — peaks July",
  },
  {
    id: "steelhead", label: "Steelhead", title: "Steelhead",
    runStatus: "none", statusLabel: "Checking...",
    phase: "Active — year-round run", peak: "Summer peak: Aug 10",
    summary: "Steelhead run year-round in the Columbia. Winter/spring fish are present now and active. The main summer run builds from June through August with peak passage typically in early August. Both hatchery and wild fish are present — check regs carefully.",
    fishingTip: "Steelhead are active now. Check WDFW/ODFW regs — many sections are hatchery-only. Look for adipose fin clips to identify hatchery fish. Wild fish must be released in most sections.",
    segments: ["past", "now", "now", "forecast", "none", "none", "none", "none"],
    forecastBullets: ["Steady upstream progression expected", "Spring fish follow warming water temps upriver", "Summer run overlaps starting June", "Check McNary counts for mid-river arrival"],
    note: "Fish counts from DART mg.php (cbr.washington.edu). Steelhead counted year-round.",
    dartKey: "steelhead", seasonStart: "Year-round", seasonNote: "Year-round — summer peak August",
  },
  {
    id: "shad", label: "Shad", title: "American Shad",
    runStatus: "none", statusLabel: "Not yet",
    phase: "Not yet — starts May", peak: "Peak: June–July",
    summary: "American Shad have not yet arrived. They typically begin appearing at Bonneville in May and reach peak counts in June–July when they regularly exceed 100,000 per day. Shad are the most numerous fish to pass Columbia dams.",
    fishingTip: null,
    segments: ["none", "none", "none", "none", "none", "none", "none", "none"],
    forecastBullets: ["First shad expected at Bonneville in May", "Counts ramp up quickly through June", "Peak passage typically 3–4 weeks long", "Very popular sport fishery in lower river"],
    note: "Fish counts from DART mg.php (cbr.washington.edu). Shad not tracked past certain upper dams.",
    dartKey: "shad", seasonStart: "May", seasonNote: "Arrives May — peaks June",
  },
  {
    id: "lamprey", label: "Lamprey", title: "Pacific Lamprey",
    runStatus: "none", statusLabel: "Not yet",
    phase: "Not yet — starts June", peak: "Peak: June–August",
    summary: "Pacific Lamprey have not yet arrived in significant numbers. They typically begin appearing at Bonneville in June. Lamprey are culturally significant to Columbia Basin tribes and have been recovering after significant declines.",
    fishingTip: null,
    segments: ["none", "none", "none", "none", "none", "none", "none", "none"],
    forecastBullets: ["First lamprey expected at Bonneville in June", "Lamprey migrate more slowly than salmon", "Will distribute into tributary systems", "Tribal monitoring programs supplement dam counts"],
    note: "Fish counts from DART mg.php. DART tracks daytime window counts and LPS counts separately at Bonneville.",
    dartKey: "lamprey", seasonStart: "June", seasonNote: "Arrives June — peaks July",
  },
  {
    id: "chum", label: "Chum", title: "Chum Salmon",
    runStatus: "none", statusLabel: "Not yet",
    phase: "Not yet running", peak: "Peak: Oct – Nov",
    summary: "Chum salmon are a fall species not yet running. They primarily use lower Columbia tributaries — the Cowlitz, Grays, and Kalama rivers — and do not migrate as far upriver as Chinook or steelhead.",
    fishingTip: null,
    segments: ["none", "none", "none", "none", "none", "none", "none", "none"],
    forecastBullets: ["Chum return in October–November", "Primarily use lower Columbia tributaries", "Do not typically reach upper river sections", "Watch for fall run reports in lower river"],
    note: "Fish counts from DART mg.php. Chum primarily use lower Columbia tributaries.",
    dartKey: "chum", seasonStart: "October", seasonNote: "Arrives October — peaks late October",
  },
  {
    id: "pink", label: "Pink", title: "Pink Salmon",
    runStatus: "none", statusLabel: "Odd years only",
    phase: "Not a 2026 run year", peak: "Next run: 2027",
    summary: "Pink salmon only return to the Columbia in significant numbers during odd-numbered years. 2026 is an even year, so no meaningful pink salmon run is expected. Plan for 2027.",
    fishingTip: null,
    segments: ["none", "none", "none", "none", "none", "none", "none", "none"],
    forecastBullets: ["Next significant pink run: summer/fall 2027", "Pink salmon are the smallest Pacific salmon", "Plan for mid-August to September timing in 2027", "Check 2025 run reports for recent reference"],
    note: "Pink salmon return on a strict 2-year cycle. Current year is 2026 (even year).",
    dartKey: "pink", seasonStart: "Odd years only", seasonNote: "Even year — no significant run",
  },
];

// ============================================================
// HELPERS
// ============================================================
function dotColor(status: RunStatus): string {
  if (status === "strong")   return "bg-green-600";
  if (status === "building") return "bg-amber-500";
  if (status === "light")    return "bg-blue-400";
  return "bg-gray-300";
}
function segColor(status: SegmentStatus): string {
  if (status === "past")     return "bg-blue-100 border-blue-300 text-blue-800";
  if (status === "now")      return "bg-green-100 border-green-300 text-green-800";
  if (status === "forecast") return "bg-amber-100 border-amber-300 text-amber-800";
  return "bg-gray-100 border-gray-200 text-gray-500";
}
function segLabel(status: SegmentStatus): string {
  if (status === "past")     return "recently";
  if (status === "now")      return "now";
  if (status === "forecast") return "forecast";
  return "";
}
function confColor(conf: Confidence): string {
  if (conf === "High")   return "text-green-700";
  if (conf === "Medium") return "text-amber-600";
  return "text-gray-500";
}
function trendColor(type: "up" | "down" | "neutral"): string {
  if (type === "up")   return "text-green-700";
  if (type === "down") return "text-red-600";
  return "text-gray-500";
}
function fmtCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "k";
  return n.toLocaleString();
}
function formatDartDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    // Handle both YYYY-MM-DD and MM/DD formats
    let d: Date;
    if (dateStr.includes("-")) {
      d = new Date(dateStr + "T12:00:00");
    } else {
      const [mo, dy] = dateStr.split("/");
      d = new Date(new Date().getFullYear(), parseInt(mo) - 1, parseInt(dy));
    }
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  } catch { return dateStr; }
}

function countToRunStatus(count: number): { status: RunStatus; label: string } {
  if (count > 5000)  return { status: "strong",   label: "Strong run" };
  if (count > 1000)  return { status: "strong",   label: "Strong run" };
  if (count > 200)   return { status: "building", label: "Building" };
  if (count > 25)    return { status: "light",    label: "Active" };
  if (count > 0)     return { status: "light",    label: "Low counts" };
  return { status: "none", label: "Not yet" };
}

function getTempLabel(t: number): string {
  if (t >= 72) return "⛔ Thermal barrier";
  if (t >= 68) return "⚠️ Heat stress";
  if (t >= 64) return "Warm — slowing";
  if (t >= 52) return "✅ Optimal";
  if (t >= 46) return "Cool — decent";
  return "Cold — sluggish";
}

function getFlowLabel(f: number): string {
  if (f > 200) return "High flow — boosting speed";
  if (f < 100) return "Low flow — slowing fish";
  return "Normal";
}

function badgeColor(type: "good" | "warn" | "neutral"): string {
  if (type === "good") return "bg-green-100 border-green-300 text-green-800";
  if (type === "warn") return "bg-amber-100 border-amber-300 text-amber-800";
  return "bg-gray-100 border-gray-300 text-gray-600";
}

function compareToAvg(thisYear: number, avg: number): {
  pct: number; label: string; badgeClass: string; barColor: string;
} {
  if (avg === 0 || thisYear === 0) return { pct: 0, label: "No data yet this season", badgeClass: "bg-gray-100 border-gray-300 text-gray-600", barColor: "bg-gray-300" };
  const pct = Math.round(((thisYear - avg) / avg) * 100);
  if (pct >= 15)  return { pct, label: `+${pct}% above 10-yr avg`, badgeClass: "bg-green-100 border-green-300 text-green-800", barColor: "bg-green-500" };
  if (pct >= 0)   return { pct, label: `+${pct}% above 10-yr avg`, badgeClass: "bg-green-100 border-green-300 text-green-800", barColor: "bg-green-400" };
  if (pct >= -15) return { pct, label: `${pct}% below 10-yr avg`,  badgeClass: "bg-amber-100 border-amber-300 text-amber-800", barColor: "bg-amber-400" };
  return { pct, label: `${pct}% below 10-yr avg`, badgeClass: "bg-red-100 border-red-300 text-red-800", barColor: "bg-red-400" };
}

// ============================================================
// DATA BANNER — consistent across all pages
// ============================================================
function DataBanner({ isRealData, dataThrough, isLoading, fetchedAt }: {
  isRealData: boolean; dataThrough: string;
  isLoading: boolean; fetchedAt: string | null;
}) {
  if (isLoading) return null;

  const updatedAt = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : null;

  if (!isRealData) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-semibold">⚠️ Could not reach DART</span> — showing estimated values.
          DART fish counts update daily. Check back after 9 AM Pacific.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs text-blue-700 leading-relaxed">
          <span className="font-semibold">✅ Live data</span> — Fish counts from{" "}
          <span className="font-semibold">DART</span> (cbr.washington.edu){dataThrough
            ? <span className="text-blue-600"> · data through {formatDartDate(dataThrough)}</span>
            : null
          }. Water temp + flow from USGS + DART scroll case sensor.
          {updatedAt && <span className="text-blue-500"> · Fetched {updatedAt}</span>}
        </p>
        <a href="https://www.cbr.washington.edu/dart/query/adult_graph_text"
          target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline flex-shrink-0">
          View raw DART data →
        </a>
      </div>
    </div>
  );
}

// ============================================================
// HISTORICAL COMPARISON PANEL
// ============================================================
function HistoricalPanel({ speciesId, bonCount, mcnaryCount, isRealData, dataThrough }: {
  speciesId: string; bonCount: number; mcnaryCount: number;
  isRealData: boolean; dataThrough: string;
}) {
  const hist = HISTORICAL[speciesId];
  if (!hist) return null;

  const comparison   = compareToAvg(bonCount, hist.avgPeakDaily);
  const progressPct  = hist.avgPeakDaily > 0
    ? Math.min(100, Math.round((bonCount / hist.avgPeakDaily) * 100))
    : 0;

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
        Historical comparison — 10-year average (2015–2024)
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
        <div className="space-y-2">
          {[
            ["10-yr avg peak date",   hist.avgPeakDate],
            ["10-yr avg peak daily",  `${fmtCount(hist.avgPeakDaily)}/day`],
            ["10-yr avg annual total",fmtCount(hist.avgAnnualTotal)],
            ["Typical peak window",   hist.avgPeakWindow],
            ["Season window",         `${hist.seasonStart} – ${hist.seasonEnd}`],
            ["Today vs avg peak",     null],
          ].map(([label, value], i) => (
            <div key={i} className="flex justify-between text-xs border-b border-gray-100 pb-1">
              <span className="text-gray-500">{label}</span>
              {value !== null
                ? <span className="font-medium text-gray-800">{value}</span>
                : <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${comparison.badgeClass}`}>
                    {isRealData ? comparison.label : "No data yet"}
                  </span>
              }
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Today vs average peak</span>
              <span className="text-gray-700 font-medium">
                {isRealData && bonCount > 0
                  ? `${fmtCount(bonCount)} / ${fmtCount(hist.avgPeakDaily)}`
                  : "No data yet"
                }
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className={`h-3 rounded-full transition-all ${comparison.barColor}`}
                style={{ width: `${isRealData ? progressPct : 0}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-0.5 text-gray-400">
              <span>0</span>
              <span>Avg peak: {fmtCount(hist.avgPeakDaily)}/day</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 leading-relaxed">{hist.timingNote}</p>
          </div>
          <p className="text-xs text-gray-400">
            Source: DART Quick Look · 10-yr avg 2015–2024
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function Home() {
  const [selectedId, setSelectedId] = useState("steelhead");
  const [conditions, setConditions] = useState<DamCondition[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [dataError, setDataError]   = useState(false);
  const [fetchedAt, setFetchedAt]   = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const res  = await fetch("/api/conditions");
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        if (json.conditions) setConditions(json.conditions);
        if (json.fetchedAt)  setFetchedAt(json.fetchedAt);
        setDataError(false);
      } catch { setDataError(true); }
      finally  { setIsLoading(false); }
    }
    load();
  }, []);

  // Get Bonneville and McNary conditions
  const bonData    = conditions.find(c => c.damId === "bonneville");
  const mcnaryData = conditions.find(c => c.damId === "mcnary");
  const isRealData = bonData?.isRealData ?? false;
  const dataThrough = bonData?.dataThrough ?? "";

  // ============================================================
  // Enrich species with real counts from API
  // ============================================================
  const enrichedSpecies = ALL_SPECIES.map(sp => {
    if (sp.id === "pink") return sp; // even year

    const bonCount  = bonData  ? (bonData[sp.dartKey  as keyof DamCondition]  as number ?? 0) : 0;
    const max3Count = bonData  ? (bonData[`max3day_${sp.dartKey}` as keyof DamCondition] as number ?? 0) : 0;
    const { status, label } = countToRunStatus(max3Count || bonCount);

    return { ...sp, runStatus: status, statusLabel: label };
  });

  const selected = enrichedSpecies.find(s => s.id === selectedId)!;

  // Live counts
  const bonCount    = bonData    ? (bonData[selected.dartKey    as keyof DamCondition] as number ?? 0) : 0;
  const mcnaryCount = mcnaryData ? (mcnaryData[selected.dartKey as keyof DamCondition] as number ?? 0) : 0;
  const waterTempF  = bonData?.waterTempF ?? null;
  const flowKcfs    = bonData?.flowKcfs   ?? null;
  const gasPct      = bonData?.gasPct     ?? null;
  const baromPres   = bonData?.baromPres  ?? null;
  const spillPct    = bonData?.spillPct   ?? null;

  // Build BON badge
  const bonBadge = isRealData
    ? (bonCount > 0
        ? `BON: ${fmtCount(bonCount)}${bonData?.hasLadderData ? "/day" : " YTD"}${dataThrough ? " · " + formatDartDate(dataThrough) : ""}`
        : `BON: 0${dataThrough ? " · " + formatDartDate(dataThrough) : ""}`)
    : "BON: —";

  const lastUpdated = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : null;

  // ============================================================
  // Build dynamic past bullets from real data
  // ============================================================
  function buildPastBullets(): string[] {
    const bullets: string[] = [];
    if (bonCount > 0) {
      bullets.push(`${fmtCount(bonCount)} ${selected.label} at Bonneville${bonData?.hasLadderData ? " (latest daily count)" : " (YTD season total)"} · ${formatDartDate(dataThrough)}`);
    } else if (isRealData) {
      bullets.push(`0 ${selected.label} recorded at Bonneville — ${formatDartDate(dataThrough)}`);
    }
    if (mcnaryCount > 0) {
      bullets.push(`${fmtCount(mcnaryCount)} at McNary${mcnaryData?.hasLadderData ? " (latest day)" : " (YTD)"} — fish moving mid-river`);
    }
    if (waterTempF !== null) {
      bullets.push(`Water temp at Bonneville: ${waterTempF}°F — ${getTempLabel(waterTempF)}`);
    }
    if (flowKcfs !== null) {
      bullets.push(`River flow: ${flowKcfs}k cfs — ${getFlowLabel(flowKcfs)}`);
    }
    if (gasPct !== null) {
      const gasWarning = gasPct > 110 ? " ⚠️ above stress threshold" : " ✅ below stress threshold";
      bullets.push(`Dissolved gas: ${gasPct.toFixed(1)}%${gasWarning}`);
    }
    // Fill with context bullets if needed
    if (bullets.length < 3) {
      bullets.push(`Season: ${selected.seasonNote}`);
    }
    return bullets.slice(0, 4);
  }

  const pastBullets    = buildPastBullets();
  const pastLocation   = bonCount > 0 ? "Lower Columbia — Below Bonneville" : "No confirmed passage yet";
  const pastConfidence: Confidence = isRealData ? (bonCount > 100 ? "High" : bonCount > 0 ? "Medium" : "Low") : "Low";

  return (
    <main className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-3xl">🐟</span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Columbia Salmon Tracker</h1>
            <p className="text-sm text-gray-500">
              {isLoading
                ? "Loading live data..."
                : dataError
                ? <span className="text-amber-600">Could not reach DART — check connection</span>
                : <span>
                    <span className="text-green-600 font-medium">✅ Live — DART + USGS</span>
                    {lastUpdated && <span className="text-gray-400"> · {lastUpdated}</span>}
                  </span>
              }
            </p>
          </div>
          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap gap-x-4 gap-y-1">
            <a href="/map"            className="text-sm text-blue-600 hover:underline">River Map</a>
            <a href="/dams"           className="text-sm text-blue-600 hover:underline">Dam Reference</a>
            <a href="/fishfinder"     className="text-sm text-blue-600 hover:underline">FishFinder</a>
            <a href="/season-updates" className="text-sm text-blue-600 hover:underline">Season Updates</a>
          </div>
        </div>

        {/* DATA BANNER */}
        <DataBanner
          isRealData={isRealData}
          dataThrough={dataThrough}
          isLoading={isLoading}
          fetchedAt={fetchedAt}
        />

        {/* TOP BAR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

          {/* Species selector */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Select species</p>
            <p className="text-xs text-gray-400 mb-2">Salmon</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {enrichedSpecies
                .filter(s => ["chinook_spring","chinook_summer","chinook_fall","coho","sockeye","chum","pink"].includes(s.id))
                .map(s => (
                  <button key={s.id} onClick={() => setSelectedId(s.id)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      selectedId === s.id ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 text-gray-500 hover:bg-gray-50"
                    }`}>{s.label}</button>
                ))}
            </div>
            <p className="text-xs text-gray-400 mb-2">Trout &amp; Other</p>
            <div className="flex flex-wrap gap-2">
              {enrichedSpecies
                .filter(s => ["steelhead","shad","lamprey"].includes(s.id))
                .map(s => (
                  <button key={s.id} onClick={() => setSelectedId(s.id)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      selectedId === s.id ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 text-gray-500 hover:bg-gray-50"
                    }`}>{s.label}</button>
                ))}
            </div>
          </div>

          {/* Running Now panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Running now</p>
            <p className="text-xs mb-3">
              {isRealData
                ? <span className="text-green-500">
                    ✓ Live Bonneville counts
                    {dataThrough && <span className="text-gray-400"> · {formatDartDate(dataThrough)}</span>}
                  </span>
                : <span className="text-amber-400">Awaiting DART data</span>
              }
            </p>
            <div className="grid grid-cols-2 gap-2">
              {enrichedSpecies.map(s => {
                const cnt = bonData ? (bonData[s.dartKey as keyof DamCondition] as number ?? 0) : 0;
                return (
                  <button key={s.id} onClick={() => setSelectedId(s.id)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-left transition-all">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor(s.runStatus)}`} />
                    <span className="text-xs font-medium text-gray-700 truncate">{s.label}</span>
                    <span className="text-xs text-gray-400 ml-auto truncate">
                      {isRealData && cnt > 0 ? fmtCount(cnt) + (bonData?.hasLadderData ? "/day" : " YTD") : s.statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SPECIES REPORT */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">

          {/* Report header */}
          <div className="border-b border-gray-100 pb-4 mb-5">
            <h2 className="text-lg font-semibold text-gray-900">{selected.title}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-1 rounded-full text-xs bg-blue-50 border border-blue-200 text-blue-700">
                {selected.phase}
              </span>
              <span className="px-2 py-1 rounded-full text-xs border border-gray-200 text-gray-500">
                {selected.peak}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs border ${
                isRealData ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"
              }`}>
                {bonBadge}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{selected.summary}</p>
            {selected.fishingTip && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                🎣 <strong>Fishing tip:</strong> {selected.fishingTip}
              </div>
            )}
          </div>

          {/* River sections */}
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
            River sections — estimated fish location
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {RIVER_SECTIONS.map((name, i) => (
              <div key={i} className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs ${segColor(selected.segments[i])}`}>
                <div className="font-medium">{name}</div>
                {segLabel(selected.segments[i]) && (
                  <div className="text-xs opacity-75 mt-0.5">{segLabel(selected.segments[i])}</div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-4 mb-5 flex-wrap">
            {[
              { color: "bg-blue-200",  label: "Recently" },
              { color: "bg-green-200", label: "Currently" },
              { color: "bg-amber-200", label: "3-day forecast" },
              { color: "bg-gray-200",  label: "Not reached / past" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className={`w-3 h-3 rounded ${item.color}`} />
                {item.label}
              </div>
            ))}
          </div>

          {/* Live data + Forecast */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

            {/* Live data panel */}
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
                Live conditions — Bonneville Dam
                {isRealData && dataThrough && (
                  <span className="text-green-500 ml-1 normal-case">
                    · {formatDartDate(dataThrough)}
                  </span>
                )}
              </p>
              <p className={`text-xs mb-3 ${confColor(pastConfidence)}`}>
                Data confidence: {pastConfidence}
              </p>
              <ul className="space-y-1.5">
                {pastBullets.map((b, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-gray-300 mt-0.5">·</span><span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Forecast panel */}
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Outlook — next 3 days</p>
              <p className="font-medium text-gray-900 text-sm mb-1">
                {selected.seasonStart === "Year-round" || bonCount > 25
                  ? "Continued upstream migration"
                  : `Watch for first ${selected.label} arrivals`}
              </p>
              <p className="text-xs mb-3 text-amber-600">
                Confidence: {bonCount > 100 ? "Medium" : "Low"}
              </p>
              <ul className="space-y-1">
                {selected.forecastBullets.map((b, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-gray-300 mt-0.5">·</span><span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Stats — ALL from live API */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {/* Bonneville daily count */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-lg font-semibold text-gray-900">
                {isRealData ? fmtCount(bonCount) : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {bonData?.hasLadderData ? "Bonneville (latest day)" : "Bonneville (YTD total)"}
              </div>
              <div className={`text-xs mt-0.5 ${isRealData ? "text-green-600" : "text-gray-400"}`}>
                {isRealData ? (bonData?.hasLadderData ? `Daily · DART${dataThrough ? " · " + formatDartDate(dataThrough) : ""}` : `YTD Jan 1–${dataThrough ? formatDartDate(dataThrough) : "—"}`) : "Awaiting data"}
              </div>
            </div>

            {/* McNary daily count */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-lg font-semibold text-gray-900">
                {isRealData ? fmtCount(mcnaryCount) : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {mcnaryData?.hasLadderData ? "McNary (latest day)" : "McNary (YTD total)"}
              </div>
              <div className={`text-xs mt-0.5 ${mcnaryCount > 0 ? "text-green-600" : "text-gray-400"}`}>
                {isRealData ? "Live · DART" : "Awaiting data"}
              </div>
            </div>

            {/* Water temp */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-lg font-semibold text-gray-900">
                {waterTempF !== null ? `${waterTempF}°F` : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Water temp (BON)</div>
              <div className="text-xs mt-0.5 text-gray-600">
                {waterTempF !== null ? getTempLabel(waterTempF) : "USGS + DART"}
              </div>
            </div>

            {/* River flow */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-lg font-semibold text-gray-900">
                {flowKcfs !== null ? `${flowKcfs}k` : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Outflow (kcfs)</div>
              <div className="text-xs mt-0.5 text-gray-600">
                {flowKcfs !== null ? getFlowLabel(flowKcfs) : "DART outflow"}
              </div>
            </div>
          </div>

          {/* Environmental conditions — from DART mg.php */}
          {(gasPct !== null || baromPres !== null || spillPct !== null) && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {gasPct !== null && (
                <div className={`rounded-xl p-3 ${gasPct > 110 ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                  <div className={`text-lg font-semibold ${gasPct > 110 ? "text-red-700" : "text-gray-900"}`}>
                    {gasPct.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Dissolved gas</div>
                  <div className={`text-xs mt-0.5 ${gasPct > 110 ? "text-red-600" : "text-gray-500"}`}>
                    {gasPct > 110 ? "⚠️ Stress level" : "✅ Safe"}
                  </div>
                </div>
              )}
              {baromPres !== null && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-lg font-semibold text-gray-900">{Math.round(baromPres)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Pressure (mmHg)</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {baromPres > 765 ? "Rising — fish active" : baromPres < 755 ? "Falling — fish moving" : "Stable"}
                  </div>
                </div>
              )}
              {spillPct !== null && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-lg font-semibold text-gray-900">{spillPct.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500 mt-0.5">Spill percent</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {spillPct > 30 ? "High spill — check gas" : "Normal"}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historical comparison */}
          <div className="mb-4">
            <HistoricalPanel
              speciesId={selected.id}
              bonCount={bonCount}
              mcnaryCount={mcnaryCount}
              isRealData={isRealData}
              dataThrough={dataThrough}
            />
          </div>

          {/* Data source note */}
          <p className="text-xs text-gray-400">{selected.note}</p>
        </div>
      </div>
    </main>
  );
}
