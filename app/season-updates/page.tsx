"use client";
// ============================================================
// COLUMBIA SALMON TRACKER - Season Updates Page
// File: app/season-updates/page.tsx
//
// Live WDFW emergency rule updates (filtered to Columbia/Snake River
// salmon & steelhead) via /api/regulations, plus a hand-maintained
// season overview, key regulatory links, and a month-by-month
// regulation calendar. Section 1 degrades gracefully if the RSS
// feed is unreachable server-side.
// ============================================================

import { useEffect, useState } from "react";

// ============================================================
// TYPES
// ============================================================
interface RegulationItem {
  guid: string;
  title: string;
  link: string;
  description: string;
  effectiveDate: string | null;
  pubDate: string;
  daysAgo: number;
  category: "red" | "green" | "yellow";
}

interface RegulationsResponse {
  items: RegulationItem[];
  fetchedAt: string;
  ok: boolean;
  error?: string;
}

// ============================================================
// STATIC REFERENCE DATA
// ============================================================
const SEASON_CARDS = [
  {
    name: "Columbia River Mainstem",
    area: "Megler-Astoria Bridge to Priest Rapids Dam",
    note: "Salmon & steelhead open with reach-specific limits — most sections currently allow hatchery Chinook and limited steelhead retention. Several reaches near dams are closed or sockeye-only through July. See Emergency Rules above for exact boundaries and dates.",
    href: "https://www.eregulations.com/washington/fishing/",
  },
  {
    name: "Snake River",
    area: "Mouth to Hells Canyon Dam",
    note: "Summer Chinook and steelhead seasons vary significantly by reach and are updated frequently through emergency rule. Confirm the current reach-by-reach status before fishing.",
    href: "https://www.eregulations.com/washington/fishing/",
  },
  {
    name: "Washington Coast / Puget Sound",
    area: "Marine Areas 1-13",
    note: "Salmon seasons are set through the North of Falcon process and vary by marine area and month. Several coastal marine areas have summer Chinook/coho openings — check your specific marine area.",
    href: "https://wdfw.wa.gov/fishing/regulations",
  },
  {
    name: "Oregon Columbia River",
    area: "Oregon-side boundary waters",
    note: "Oregon manages the south shore and boundary waters jointly with Washington via the Columbia River Compact. Rules generally mirror WDFW emergency rules but confirm directly with ODFW.",
    href: "https://myodfw.com/fishing/species/salmon-steelhead",
  },
];

const KEY_LINKS = [
  { label: "WDFW Emergency Rules",             href: "https://wdfw.wa.gov/fishing/regulations/emergency-rules" },
  { label: "WDFW Salmon Fishing Current Blog",  href: "https://wdfw.medium.com/the-salmon-fishing-current-blog-summer-and-fall-2026-edition" },
  { label: "ODFW Salmon & Steelhead Regs",      href: "https://myodfw.com/fishing/species/salmon-steelhead" },
  { label: "North of Falcon Process",           href: "https://wdfw.wa.gov/fishing/management/north-falcon" },
  { label: "PFMC (Pacific Fishery Mgmt Council)", href: "https://www.pcouncil.org" },
  { label: "Columbia River Treaty Tribes (CRITFC)", href: "https://www.critfc.org" },
  { label: "2026-2027 WA Sport Fishing Rules",  href: "https://wdfw.wa.gov/fishing/regulations" },
];

interface CalendarRun {
  label: string;
  months: number[];   // 1-12, months typically open
  peakMonths?: number[];
  location: string;
}

const CALENDAR: CalendarRun[] = [
  { label: "Spring Chinook", months: [3, 4, 5, 6],                      location: "Bonneville to McNary" },
  { label: "Summer Chinook", months: [6, 7, 8],                         location: "Upper Columbia" },
  { label: "Sockeye",        months: [6, 7, 8],                         location: "Bonneville to Okanogan" },
  { label: "Steelhead",      months: [1,2,3,4,5,6,7,8,9,10,11,12],      location: "Year-round, varies by section" },
  { label: "Fall Chinook",   months: [8, 9, 10, 11], peakMonths: [9,10], location: "Hanford Reach peak Sep-Oct" },
  { label: "Coho",           months: [9, 10, 11],                       location: "Lower & mid Columbia" },
  { label: "Shad",           months: [5, 6, 7],                         location: "Lower Columbia" },
];

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// ============================================================
// HELPERS
// ============================================================
const CATEGORY_STYLES: Record<RegulationItem["category"], { border: string; badge: string; label: string }> = {
  red:    { border: "border-l-red-500",    badge: "bg-red-100 text-red-700",       label: "Closure / Reduction" },
  green:  { border: "border-l-green-500",  badge: "bg-green-100 text-green-700",   label: "Opening" },
  yellow: { border: "border-l-amber-500",  badge: "bg-amber-100 text-amber-700",   label: "Modification" },
};

function formatDaysAgo(daysAgo: number): string {
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "1 day ago";
  return `${daysAgo} days ago`;
}

function formatRelativeMinutes(fetchedAt: string, nowMs: number): string {
  const diffMs = nowMs - new Date(fetchedAt).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1)  return "just now";
  if (mins === 1) return "1 minute ago";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "1 hour ago";
  return `${hrs} hours ago`;
}

// ============================================================
// COMPONENT
// ============================================================
export default function SeasonUpdatesPage() {
  const [data, setData]       = useState<RegulationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [now, setNow]         = useState(() => Date.now());

  const currentMonth = new Date().getMonth() + 1; // 1-12

  async function loadRegulations() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/regulations");
      if (!res.ok) throw new Error("failed");
      const json: RegulationsResponse = await res.json();
      setData(json);
      setFetchError(false);
    } catch {
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRegulations();
  }, []);

  // Keep "X minutes ago" fresh without needing a manual refresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const showFallback = !isLoading && (fetchError || !data?.ok);
  const items = data?.items ?? [];

  return (
    <main className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-3xl">🐟</span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Season Updates</h1>
            <p className="text-sm text-gray-600">
              Live regulation updates for Columbia River salmon &amp; steelhead
            </p>
          </div>
          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap gap-x-4 gap-y-1">
            <a href="/"           className="text-sm text-blue-600 hover:underline">Species</a>
            <a href="/map"        className="text-sm text-blue-600 hover:underline">River Map</a>
            <a href="/dams"       className="text-sm text-blue-600 hover:underline">Dam Reference</a>
            <a href="/fishfinder" className="text-sm text-blue-600 hover:underline">FishFinder</a>
          </div>
        </div>

        {/* LIVE BADGE */}
        <div className="mb-4 text-sm">
          {isLoading ? (
            <span className="text-gray-600">Loading live rule updates...</span>
          ) : showFallback ? (
            <span className="text-amber-600 font-medium">⚠ Could not reach WDFW — showing reference info below</span>
          ) : (
            <span>
              <span className="text-green-600 font-medium">✅ Live — WDFW</span>
              {data?.fetchedAt && (
                <span className="text-gray-600"> · fetched {formatRelativeMinutes(data.fetchedAt, now)}</span>
              )}
            </span>
          )}
        </div>

        {/* ============================================================
            SECTION 1 — EMERGENCY RULES
        ============================================================ */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Emergency Rules</h2>
            <button
              onClick={loadRegulations}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {isLoading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {isLoading ? (
            <EmergencyRulesSkeleton />
          ) : showFallback ? (
            <div className="bg-white border border-amber-200 rounded-xl p-5 text-center">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Live rule updates available at WDFW
              </p>
              <p className="text-sm text-gray-600 mb-3">
                {data?.error ?? "We couldn't reach the WDFW emergency rules feed from here."}
                {" "}Check the official source directly, or try refreshing.
              </p>
              <a
                href="https://wdfw.wa.gov/fishing/regulations/emergency-rules"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-blue-600 hover:underline font-medium"
              >
                View WDFW Emergency Rules →
              </a>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl p-4 text-center">
              No current emergency rules affecting Columbia/Snake River salmon &amp; steelhead.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map(item => {
                const style = CATEGORY_STYLES[item.category];
                return (
                  <div
                    key={item.guid}
                    className={`bg-white border border-gray-200 border-l-4 ${style.border} rounded-xl p-4`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>
                    {item.effectiveDate && (
                      <p className="text-xs text-gray-600 mb-1.5">
                        <span className="font-medium">Effective:</span> {item.effectiveDate}
                      </p>
                    )}
                    <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        View full rule →
                      </a>
                      <span className="text-xs text-gray-500">Posted {formatDaysAgo(item.daysAgo)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ============================================================
            SECTION 2 — SEASON SUMMARY CARDS
        ============================================================ */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Season Summary</h2>
          <p className="text-xs text-gray-600 mb-3">
            ⚠ General overview only — always verify current regulations before fishing.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SEASON_CARDS.map(card => (
              <div key={card.name} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900">{card.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{card.area}</p>
                <p className="text-sm text-gray-700 mb-3 flex-1">{card.note}</p>
                <a
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Check current regs →
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================
            SECTION 3 — KEY LINKS
        ============================================================ */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Key Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {KEY_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 hover:border-blue-300 flex items-center justify-between gap-2"
              >
                {link.label}
                <span className="text-blue-600 flex-shrink-0">→</span>
              </a>
            ))}
          </div>
        </section>

        {/* ============================================================
            SECTION 4 — REGULATION CALENDAR
        ============================================================ */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2026 Regulation Calendar</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-4 overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Month header row */}
              <div className="grid grid-cols-[140px_repeat(12,1fr)] gap-1 mb-1.5">
                <div />
                {MONTH_LABELS.map((m, i) => (
                  <div
                    key={i}
                    className={`text-center text-xs font-semibold rounded ${
                      i + 1 === currentMonth ? "bg-blue-600 text-white" : "text-gray-600"
                    }`}
                  >
                    {m}
                  </div>
                ))}
              </div>

              {/* Run rows */}
              <div className="flex flex-col gap-1">
                {CALENDAR.map(run => (
                  <div key={run.label} className="grid grid-cols-[140px_repeat(12,1fr)] gap-1 items-center">
                    <div>
                      <p className="text-xs font-medium text-gray-800 leading-tight">{run.label}</p>
                      <p className="text-[10px] text-gray-500 leading-tight">{run.location}</p>
                    </div>
                    {MONTH_LABELS.map((_, i) => {
                      const month = i + 1;
                      const active = run.months.includes(month);
                      const peak   = run.peakMonths?.includes(month);
                      const isCurrent = month === currentMonth;
                      return (
                        <div
                          key={i}
                          className={[
                            "h-4 rounded-sm",
                            active
                              ? peak
                                ? "bg-green-600"
                                : "bg-green-300"
                              : "bg-gray-100",
                            isCurrent ? "ring-2 ring-blue-500 ring-offset-1" : "",
                          ].join(" ")}
                          title={`${run.label} — ${MONTH_LABELS[i]}${active ? (peak ? " (peak)" : "") : " (typically closed)"}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Darker green = peak activity. Highlighted column = current month. Actual dates vary by
            location and year — see Emergency Rules above for current, binding dates.
          </p>
        </section>

      </div>
    </main>
  );
}

// ============================================================
// LOADING SKELETON
// ============================================================
function EmergencyRulesSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/3 mb-3" />
          <div className="space-y-1.5">
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}
