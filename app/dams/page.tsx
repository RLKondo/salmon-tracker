"use client";
// ============================================================
// COLUMBIA SALMON TRACKER - Dam Quick Reference Page
// File: app/dams/page.tsx
//
// 2-column grid of all dams.
// Click a dam → detail panel appears inline below that row.
// All species counts shown regardless of count level.
// Flow labels are river-aware (Snake vs Columbia thresholds).
// ============================================================

import { useState, useEffect, useRef } from "react";

// ============================================================
// TYPES
// ============================================================
interface DamInfo {
  id: string;
  name: string;
  shortName: string;
  river: "columbia" | "snake" | "clearwater";
  riverMile: number;
  hasLadder: boolean;
  hasCounting: boolean;
  lat: number;
  lon: number;
  operator: string;
  access: string;
  techniques: string[];
  bestMonths: string;
  regulations: string;
  nearbyLaunches: string;
  fishingNotes: string;
}

interface DamConditions {
  damId: string;
  waterTempF: number;
  flowKcfs: number;
  fishCount: number;
  isRealData?: boolean;
  dataThrough?: string;
  hasLadderData?: boolean;
  hasBasinData?: boolean;
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
  ytd_total?: number;
  max3day_chinookSpring?: number;
  max3day_chinookSummer?: number;
  max3day_chinookFall?: number;
  max3day_coho?: number;
  max3day_sockeye?: number;
  max3day_steelhead?: number;
  max3day_shad?: number;
  max3day_lamprey?: number;
  max3day_chum?: number;
  max3day_pink?: number;
}

interface WeatherDay {
  dateLabel: string;
  high: number;
  low: number;
  precip: number;
  shortLabel: string;
  code: number;
}

// ============================================================
// ALL DAMS
// ============================================================
const ALL_DAMS: DamInfo[] = [
  // ===== COLUMBIA RIVER =====
  {
    id: "bonneville",
    name: "Bonneville Dam", shortName: "Bonneville",
    river: "columbia", riverMile: 146,
    hasLadder: true, hasCounting: true,
    lat: 45.644, lon: -121.940, operator: "USACE",
    access: "Both",
    techniques: ["Drift fishing", "Back-trolling", "Bank fishing", "Boat trolling"],
    bestMonths: "April–October",
    regulations: "Check ODFW/WDFW regs. Many sections hatchery-only for Chinook. Wild steelhead C&R in some areas.",
    nearbyLaunches: "Tanner Creek Boat Ramp (OR), Beacon Rock State Park (WA)",
    fishingNotes: "First dam on the Columbia — every fish headed upriver passes here. Bradford Island tailrace is legendary for spring Chinook. Washington shore has excellent bank access. Fall Chinook stack in the tailrace August–October.",
  },
  {
    id: "dalles",
    name: "The Dalles Dam", shortName: "The Dalles",
    river: "columbia", riverMile: 191,
    hasLadder: true, hasCounting: true,
    lat: 45.614, lon: -121.134, operator: "USACE",
    access: "Both",
    techniques: ["Back-trolling", "Drift fishing", "Trolling"],
    bestMonths: "April–September",
    regulations: "Check ODFW regs for south bank, WDFW for north bank. Hatchery Chinook retention varies by season.",
    nearbyLaunches: "The Dalles Marina (OR), Lyle (WA)",
    fishingNotes: "Lake Celilo pool extends from Bonneville to The Dalles. Spring Chinook fishing excellent in April–May. Shad fishing in June is popular and underutilized.",
  },
  {
    id: "johnday",
    name: "John Day Dam", shortName: "John Day",
    river: "columbia", riverMile: 215,
    hasLadder: true, hasCounting: true,
    lat: 45.715, lon: -120.694, operator: "USACE",
    access: "Both",
    techniques: ["Trolling", "Back-trolling", "Drift fishing"],
    bestMonths: "April–September",
    regulations: "Check ODFW/WDFW regs. Hatchery-only for Chinook in most areas.",
    nearbyLaunches: "Giles French Park (OR), Maryhill State Park (WA)",
    fishingNotes: "Lake Umatilla extends 76 miles from John Day to McNary. Good spring Chinook and summer steelhead trolling throughout the pool. Less pressure than lower river dams.",
  },
  {
    id: "mcnary",
    name: "McNary Dam", shortName: "McNary",
    river: "columbia", riverMile: 292,
    hasLadder: true, hasCounting: true,
    lat: 45.934, lon: -119.298, operator: "USACE",
    access: "Both",
    techniques: ["Trolling", "Back-trolling", "Bank fishing"],
    bestMonths: "April–October",
    regulations: "Check WDFW regs. Fork point — fish split between Snake and upper Columbia. Verify which fishery you are targeting.",
    nearbyLaunches: "McNary Wildlife Refuge Ramp, Umatilla Marina (OR)",
    fishingNotes: "Critical fork point — fish heading to Idaho split off here toward the Snake River. Fish heading to Wenatchee, Okanogan, or Brewster continue upriver. The tailrace below McNary is excellent for fall Chinook August–October.",
  },
  {
    id: "priestrapids",
    name: "Priest Rapids Dam", shortName: "Priest Rapids",
    river: "columbia", riverMile: 397,
    hasLadder: true, hasCounting: true,
    lat: 46.660, lon: -119.905, operator: "Grant County PUD",
    access: "Both",
    techniques: ["Trolling", "Back-trolling", "Drift fishing", "Bank fishing"],
    bestMonths: "May–September",
    regulations: "Check WDFW regs. Upper Columbia — regulations differ from lower river. Hatchery-only in many sections.",
    nearbyLaunches: "Priest Rapids Park boat ramp, Vernita Bridge area",
    fishingNotes: "Fish here are definitively upper Columbia-bound. The Hanford Reach below Priest Rapids is world-class fall Chinook habitat. August–October for fall Chinook in the Reach.",
  },
  {
    id: "wanapum",
    name: "Wanapum Dam", shortName: "Wanapum",
    river: "columbia", riverMile: 415,
    hasLadder: true, hasCounting: true,
    lat: 46.857, lon: -119.987, operator: "Grant County PUD",
    access: "Both",
    techniques: ["Trolling", "Back-trolling"],
    bestMonths: "May–September",
    regulations: "Check WDFW regulations. Upper Columbia rules apply.",
    nearbyLaunches: "Wanapum State Park boat ramp, Vantage area ramps",
    fishingNotes: "Wanapum pool between Priest Rapids and Rock Island. Vantage Bridge area is a popular access point. Summer Chinook and steelhead trolling throughout the pool June–August.",
  },
  {
    id: "rockisland",
    name: "Rock Island Dam", shortName: "Rock Island",
    river: "columbia", riverMile: 453,
    hasLadder: true, hasCounting: true,
    lat: 47.368, lon: -120.078, operator: "Chelan County PUD",
    access: "Both",
    techniques: ["Trolling", "Bank fishing", "Back-trolling"],
    bestMonths: "May–September",
    regulations: "Check WDFW regulations. Wenatchee River confluence nearby — separate regs may apply.",
    nearbyLaunches: "Rock Island Campground ramp, Wenatchee waterfront ramps",
    fishingNotes: "Near Wenatchee, WA. Wenatchee River confluence is a major Chinook and steelhead spawning tributary. Oldest dam on the Columbia (1933). Good bank access near the dam.",
  },
  {
    id: "rockyreach",
    name: "Rocky Reach Dam", shortName: "Rocky Reach",
    river: "columbia", riverMile: 473,
    hasLadder: true, hasCounting: true,
    lat: 47.526, lon: -120.248, operator: "Chelan County PUD",
    access: "Both",
    techniques: ["Trolling", "Back-trolling"],
    bestMonths: "May–September",
    regulations: "Check WDFW regulations. Entiat River confluence nearby.",
    nearbyLaunches: "Rocky Reach Dam park ramp, Entiat City Park ramp",
    fishingNotes: "Fish have traveled ~325 river miles from the ocean. Entiat River is a key steelhead and Chinook spawning tributary. Lake Entiat offers good trolling throughout the season.",
  },
  {
    id: "wells",
    name: "Wells Dam (Brewster)", shortName: "Wells/Brewster",
    river: "columbia", riverMile: 515,
    hasLadder: true, hasCounting: true,
    lat: 47.975, lon: -119.672, operator: "Douglas County PUD",
    access: "Both",
    techniques: ["Trolling", "Back-trolling", "Drift fishing", "Bank fishing"],
    bestMonths: "May–September",
    regulations: "Check WDFW regs. Okanogan River confluence — sockeye and Chinook rules vary.",
    nearbyLaunches: "Brewster City Park ramp, Bridgeport State Park ramp",
    fishingNotes: "Brewster Pool is famous for summer Chinook — one of the best upper Columbia fisheries. Okanogan River confluence brings in a separate sockeye run. Fish have traveled ~365 miles from the ocean.",
  },
  {
    id: "chiefjoseph",
    name: "Chief Joseph Dam", shortName: "Chief Joseph",
    river: "columbia", riverMile: 545,
    hasLadder: false, hasCounting: false,
    lat: 48.007, lon: -119.625, operator: "USACE",
    access: "Both",
    techniques: ["Walleye", "Bass", "Rainbow trout"],
    bestMonths: "Year-round for resident fish",
    regulations: "No anadromous fish above Chief Joseph. Resident fish rules — check WDFW.",
    nearbyLaunches: "Rufus Woods Lake ramps near Bridgeport",
    fishingNotes: "Fish passage ends here. Rufus Woods Lake offers excellent trophy rainbow trout, walleye, and smallmouth bass. No salmon or steelhead above this point.",
  },
  {
    id: "grandcoulee",
    name: "Grand Coulee Dam", shortName: "Grand Coulee",
    river: "columbia", riverMile: 596,
    hasLadder: false, hasCounting: false,
    lat: 47.957, lon: -118.981, operator: "US Bureau of Reclamation",
    access: "Both",
    techniques: ["Walleye", "Bass", "Kokanee", "Rainbow trout"],
    bestMonths: "Year-round",
    regulations: "No anadromous fish. Lake Roosevelt resident fish rules — check WDFW.",
    nearbyLaunches: "Multiple Lake Roosevelt ramps throughout the reservoir",
    fishingNotes: "Largest hydroelectric dam in the US. Lake Roosevelt stretches 150 miles behind Grand Coulee into Canada. Excellent walleye, smallmouth bass, and kokanee. No salmon or steelhead.",
  },
  // ===== SNAKE RIVER =====
  {
    id: "iceharbor",
    name: "Ice Harbor Dam", shortName: "Ice Harbor",
    river: "snake", riverMile: 9,
    hasLadder: true, hasCounting: true,
    lat: 46.249, lon: -118.878, operator: "USACE",
    access: "Both",
    techniques: ["Trolling", "Back-trolling", "Bank fishing", "Drift fishing"],
    bestMonths: "April–October",
    regulations: "Check WDFW Snake River regulations. Spring Chinook season varies. Steelhead hatchery-only in many sections.",
    nearbyLaunches: "Ice Harbor Dam park ramp, Sacajawea State Park (Pasco)",
    fishingNotes: "First Snake River dam — all Idaho-bound fish pass here. Spring Chinook excellent in the tailrace April–May. Fall Chinook strong August–September.",
  },
  {
    id: "lowermonumental",
    name: "Lower Monumental Dam", shortName: "Lower Monumental",
    river: "snake", riverMile: 41,
    hasLadder: true, hasCounting: true,
    lat: 46.563, lon: -118.536, operator: "USACE",
    access: "Boat",
    techniques: ["Trolling", "Back-trolling"],
    bestMonths: "April–September",
    regulations: "Check WDFW Snake River regulations.",
    nearbyLaunches: "Lower Monumental Dam boat ramp",
    fishingNotes: "Remote Snake River canyon. Good steelhead and Chinook with less pressure than the lower Columbia. Scenic canyon setting. Primarily boat access.",
  },
  {
    id: "littlegoose",
    name: "Little Goose Dam", shortName: "Little Goose",
    river: "snake", riverMile: 70,
    hasLadder: true, hasCounting: true,
    lat: 46.585, lon: -118.026, operator: "USACE",
    access: "Both",
    techniques: ["Trolling", "Back-trolling", "Bank fishing"],
    bestMonths: "April–September",
    regulations: "Check WDFW Snake River regulations. Grande Ronde River confluence — separate tributary regs apply.",
    nearbyLaunches: "Little Goose Dam park ramp, Illia Dunes area",
    fishingNotes: "Grande Ronde River enters the Snake nearby — a famous steelhead tributary. Little Goose pool and the Grande Ronde confluence are excellent steelhead fishing spots in late summer and fall.",
  },
  {
    id: "lowergranite",
    name: "Lower Granite Dam", shortName: "Lower Granite",
    river: "snake", riverMile: 107,
    hasLadder: true, hasCounting: true,
    lat: 46.661, lon: -117.429, operator: "USACE",
    access: "Both",
    techniques: ["Drift fishing", "Bobber fishing", "Bank fishing", "Trolling"],
    bestMonths: "April–October",
    regulations: "Check WDFW (WA) and IDFG (ID) regs. State line runs through the river — both states' regs may apply.",
    nearbyLaunches: "Swallows Park (Clarkston WA), Hells Gate State Park (Lewiston ID)",
    fishingNotes: "Last USACE Snake River dam. Above here the Snake and Clearwater are free-flowing. Lewiston/Clarkston area is a world-class steelhead and Chinook destination. Clearwater River confluence is nearby.",
  },
  {
    id: "hellscanyon",
    name: "Hells Canyon Dam", shortName: "Hells Canyon",
    river: "snake", riverMile: 247,
    hasLadder: false, hasCounting: false,
    lat: 45.257, lon: -116.698, operator: "Idaho Power",
    access: "Boat",
    techniques: ["Drift fishing", "Jet boat", "Steelhead", "Sturgeon"],
    bestMonths: "September–March for steelhead",
    regulations: "Check IDFG regulations. Steelhead and Chinook below the dam. Sturgeon fishing with special permit.",
    nearbyLaunches: "Hells Canyon Creek campground ramp, Pittsburg Landing",
    fishingNotes: "Fish passage ends at Hells Canyon. Below the dam — world-class steelhead and Chinook in one of North America's deepest gorges. Jet boat access required for most of the canyon.",
  },
  // ===== CLEARWATER =====
  {
    id: "dworshak",
    name: "Dworshak Dam", shortName: "Dworshak",
    river: "clearwater", riverMile: 3,
    hasLadder: false, hasCounting: false,
    lat: 46.516, lon: -116.296, operator: "USACE",
    access: "Both",
    techniques: ["Kokanee", "Rainbow trout", "Smallmouth bass"],
    bestMonths: "Year-round",
    regulations: "No anadromous fish above Dworshak. Check IDFG for resident fish rules.",
    nearbyLaunches: "Dworshak State Park ramp, Freeman Creek ramp",
    fishingNotes: "No fish ladder — large hatchery at base produces millions of steelhead smolts. Cold water releases from Dworshak help cool the Snake River in summer — critical for downstream fish survival. Mainstem Clearwater below Dworshak is excellent for steelhead and Chinook.",
  },
];

// ============================================================
// MOCK CONDITIONS — all species zero counts for early April
// ============================================================
const MOCK_CONDITIONS: DamConditions[] = ALL_DAMS.map(dam => ({
  damId: dam.id,
  waterTempF: { bonneville: 47, dalles: 47, johnday: 50, mcnary: 48, priestrapids: 46, wanapum: 44, rockisland: 43, rockyreach: 43, wells: 43, chiefjoseph: 43, grandcoulee: 41, iceharbor: 42, lowermonumental: 42, littlegoose: 42, lowergranite: 43, hellscanyon: 44, dworshak: 42 }[dam.id] ?? 45,
  flowKcfs:   { bonneville: 149, dalles: 149, johnday: 145, mcnary: 140, priestrapids: 133, wanapum: 130, rockisland: 128, rockyreach: 125, wells: 120, chiefjoseph: 118, grandcoulee: 115, iceharbor: 37, lowermonumental: 37, littlegoose: 37, lowergranite: 34, hellscanyon: 30, dworshak: 9 }[dam.id] ?? 100,
  fishCount: 0, isRealData: false,
  chinookSpring: 0, chinookSummer: 0, chinookFall: 0,
  coho: 0, sockeye: 0, steelhead: 0, shad: 0,
  lamprey: 0, chum: 0, pink: 0,
  max3day_chinookSpring: 0, max3day_chinookSummer: 0, max3day_chinookFall: 0,
  max3day_coho: 0, max3day_sockeye: 0, max3day_steelhead: 0,
  max3day_shad: 0, max3day_lamprey: 0, max3day_chum: 0, max3day_pink: 0,
}));

// Species rows — all 10 shown regardless of count
const SPECIES_ROWS = [
  { key: "chinookSpring", avg3key: "avg3day_chinookSpring", ytdKey: "ytd_chinook",   label: "Chinook Spring", season: "Apr–Jun" },
  { key: "chinookSummer", avg3key: "avg3day_chinookSummer", ytdKey: "ytd_chinook",   label: "Chinook Summer", season: "Jun–Aug" },
  { key: "chinookFall",   avg3key: "avg3day_chinookFall",   ytdKey: "ytd_chinook",   label: "Chinook Fall",   season: "Aug–Oct" },
  { key: "coho",          avg3key: "avg3day_coho",          ytdKey: "ytd_coho",      label: "Coho",           season: "Aug–Oct" },
  { key: "sockeye",       avg3key: "avg3day_sockeye",       ytdKey: "ytd_sockeye",   label: "Sockeye",        season: "Jun–Jul" },
  { key: "steelhead",     avg3key: "avg3day_steelhead",     ytdKey: "ytd_steelhead", label: "Steelhead",      season: "Jun–Oct" },
  { key: "shad",          avg3key: "avg3day_shad",          ytdKey: "ytd_shad",      label: "Shad",           season: "May–Jul" },
  { key: "lamprey",       avg3key: "avg3day_lamprey",       ytdKey: "ytd_lamprey",   label: "Lamprey",        season: "Jun–Aug" },
  { key: "chum",          avg3key: "avg3day_chum",          ytdKey: "ytd_chum",      label: "Chum",           season: "Oct–Nov" },
  { key: "pink",          avg3key: "avg3day_pink",          ytdKey: "ytd_pink",      label: "Pink",           season: "Odd yrs" },
];

// ============================================================
// HELPERS
// ============================================================
function getTempColor(t: number): string {
  if (t >= 72) return "#DC2626"; if (t >= 68) return "#EA580C";
  if (t >= 64) return "#D97706"; if (t >= 52) return "#16A34A";
  if (t >= 46) return "#2563EB"; return "#1D4ED8";
}
function getTempLabel(t: number): string {
  if (t >= 72) return "⛔ Barrier"; if (t >= 68) return "⚠️ Heat stress";
  if (t >= 64) return "Warm"; if (t >= 52) return "✅ Optimal";
  if (t >= 46) return "Cool"; return "Cold";
}

// River-aware flow labels — Snake/Clearwater have different normal ranges than Columbia
function flowLabel(f: number, river: string): string {
  if (river === "snake" || river === "clearwater") {
    if (f > 80)  return "High";
    if (f < 15)  return "Low";
    return "Normal";
  }
  // Columbia River
  if (f > 200) return "High";
  if (f < 80)  return "Low";
  return "Normal";
}

function flowColor(f: number, river: string): string {
  const label = flowLabel(f, river);
  if (label === "High") return "#16A34A";
  if (label === "Low")  return "#EA580C";
  return "#6B7280";
}

function riverLabel(r: string): string {
  if (r === "columbia")    return "Columbia";
  if (r === "snake")       return "Snake";
  if (r === "clearwater")  return "Clearwater";
  return r;
}

function riverBadge(r: string): string {
  if (r === "columbia")    return "bg-blue-100 text-blue-700 border-blue-200";
  if (r === "snake")       return "bg-green-100 text-green-700 border-green-200";
  if (r === "clearwater")  return "bg-amber-100 text-amber-700 border-amber-200";
  return "";
}

function countColor(count: number): string {
  if (count > 1000) return "text-green-600 font-semibold";
  if (count > 100)  return "text-blue-600";
  if (count > 0)    return "text-amber-600";
  return "text-gray-400";
}

// Returns all species with any count in the last 3 days (no threshold)
function getActiveSpecies(cond: DamConditions | undefined) {
  if (!cond) return [];
  return SPECIES_ROWS.filter(sp => {
    const today = cond[sp.key as keyof DamConditions] as number ?? 0;
    const max3  = cond[sp.avg3key as keyof DamConditions] as number ?? 0;
    return today > 0 || max3 > 0;
  });
}

// ============================================================
// DAM CARD
// ============================================================
function DamCard({ dam, cond, isSelected, onClick }: {
  dam: DamInfo; cond: DamConditions | undefined;
  isSelected: boolean; onClick: () => void;
}) {
  const activeSpecies = getActiveSpecies(cond);

  return (
    <div onClick={onClick}
      className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
      }`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm">{dam.name}</h3>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded border ${riverBadge(dam.river)}`}>
              {riverLabel(dam.river)}
            </span>
            <span className="text-xs text-gray-400">RM {dam.riverMile}</span>
            {!dam.hasLadder && <span className="text-xs text-red-500 font-medium">⛔ No ladder</span>}

          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
          isSelected ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
        }`}>
          {isSelected ? "▲ Close" : "▼ Details"}
        </span>
      </div>

      {/* Temp + Flow */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-400 mb-0.5">Water temp</p>
          {cond ? (
            <>
              <p className="text-base font-semibold" style={{ color: getTempColor(cond.waterTempF) }}>
                {cond.waterTempF}°F
              </p>
              <p className="text-xs" style={{ color: getTempColor(cond.waterTempF) }}>
                {getTempLabel(cond.waterTempF)}
              </p>
            </>
          ) : <p className="text-base text-gray-300">—</p>}
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-400 mb-0.5">Flow</p>
          {cond ? (
            <>
              <p className="text-base font-semibold" style={{ color: flowColor(cond.flowKcfs, dam.river) }}>
                {cond.flowKcfs}k cfs
              </p>
              <p className="text-xs text-gray-400">{flowLabel(cond.flowKcfs, dam.river)}</p>
            </>
          ) : <p className="text-base text-gray-300">—</p>}
        </div>
      </div>

      {/* Species counts — all shown, no threshold */}
      <div className="border-t border-gray-100 pt-2">
        {!dam.hasCounting ? (
          <p className="text-xs text-gray-400 italic">
            {dam.hasLadder ? "No counting at this dam" : "No fish passage — resident fish only"}
          </p>
        ) : activeSpecies.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            No species counted yet
            {cond?.isRealData ? "" : " · Mock data"}
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-1.5">
              Species counts/day
              {cond?.isRealData
                ? <span className="text-green-500 ml-1">✓ live</span>
                : <span className="text-amber-400 ml-1">mock</span>
              }
            </p>
            <div className="space-y-0.5">
              {activeSpecies.map(sp => {
                const today = cond![sp.key as keyof DamConditions] as number ?? 0;
                const max3  = cond![sp.avg3key as keyof DamConditions] as number ?? 0;
                return (
                  <div key={sp.key} className="flex justify-between items-center">
                    <span className="text-xs text-gray-700">{sp.label}</span>
                    <div className="text-right">
                      <span className={`text-xs tabular-nums ${countColor(today)}`}>
                        {today.toLocaleString()}
                      </span>
                      {max3 > today && (
                        <span className="text-xs text-gray-400 ml-1">
                          (peak {max3.toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// DETAIL PANEL
// ============================================================
function DamDetailPanel({ dam, cond, weather, weatherLoading, onClose }: {
  dam: DamInfo; cond: DamConditions | undefined;
  weather: WeatherDay[] | null; weatherLoading: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setTimeout(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 50);
  }, [dam.id]);

  const activeSpecies = getActiveSpecies(cond);

  return (
    <div ref={ref} className="col-span-1 md:col-span-2 bg-white border border-blue-300 rounded-xl p-5 shadow-sm">

      {/* Header */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-gray-900">{dam.name}</h2>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${riverBadge(dam.river)}`}>
              {riverLabel(dam.river)} · RM {dam.riverMile}
            </span>
            {!dam.hasLadder && <span className="text-xs text-red-500 font-medium">⛔ No ladder</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{dam.operator}</p>

        </div>
        <button onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-all flex-shrink-0">
          ✕ Close
        </button>
      </div>

      {/* Stats */}
      {cond && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">Water temp</p>
            <p className="text-xl font-semibold mt-1" style={{ color: getTempColor(cond.waterTempF) }}>
              {cond.waterTempF}°F
            </p>
            <p className="text-xs mt-0.5" style={{ color: getTempColor(cond.waterTempF) }}>
              {getTempLabel(cond.waterTempF)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">River flow</p>
            <p className="text-xl font-semibold mt-1" style={{ color: flowColor(cond.flowKcfs, dam.river) }}>
              {cond.flowKcfs}k cfs
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{flowLabel(cond.flowKcfs, dam.river)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">Total fish/day</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">
              {dam.hasCounting ? (cond.fishCount || 0).toLocaleString() : "—"}
            </p>
            <p className={`text-xs mt-0.5 ${cond.isRealData ? "text-green-600" : "text-amber-500"}`}>
              {cond.isRealData ? "Live — DART" : "Mock data"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">Access</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{dam.access}</p>
            <p className="text-xs text-gray-400 mt-0.5">{dam.operator}</p>
          </div>
        </div>
      )}

      {/* Two-column detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* LEFT: fishing info */}
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-green-700 mb-1">🎣 Fishing notes</p>
            <p className="text-xs text-green-800 leading-relaxed">{dam.fishingNotes}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-600">Details</p>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Best months</span>
              <span className="text-gray-800 font-medium">{dam.bestMonths}</span>
            </div>
            <div className="flex justify-between text-xs gap-2">
              <span className="text-gray-500 flex-shrink-0">Techniques</span>
              <span className="text-gray-800 font-medium text-right">{dam.techniques.join(", ")}</span>
            </div>
            <div className="flex justify-between text-xs gap-2">
              <span className="text-gray-500 flex-shrink-0">Launches</span>
              <span className="text-gray-800 font-medium text-right">{dam.nearbyLaunches}</span>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">📋 Regulations note</p>
            <p className="text-xs text-amber-800 leading-relaxed">{dam.regulations}</p>
            <p className="text-xs text-amber-600 mt-1 font-medium">
              Always verify at WDFW.wa.gov or IDFG.idaho.gov
            </p>
          </div>
        </div>

        {/* RIGHT: species counts + weather */}
        <div className="space-y-3">

          {/* Species breakdown — all counts shown */}
          {dam.hasCounting && cond && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">
                Species counts
                {cond.isRealData
                  ? <span className="text-green-500 ml-1 font-normal">✓ Live — DART</span>
                  : <span className="text-amber-400 ml-1 font-normal">Awaiting DART data</span>
                }
              </p>
              {/* Column headers */}
              <div className="flex justify-between text-xs text-gray-400 mb-1 pb-1 border-b border-gray-200">
                <span>Species</span>
                <div className="flex gap-4">
                  <span className="w-16 text-right">{cond.hasLadderData ? "Today" : "YTD total"}</span>
                  <span className="w-16 text-right">{cond.hasLadderData ? "3-day avg" : "—"}</span>
                </div>
              </div>
              <div className="space-y-1">
                {SPECIES_ROWS.map(sp => {
                  const daily = cond[sp.key as keyof DamConditions] as number ?? 0;
                  const avg3  = cond[sp.avg3key as keyof DamConditions] as number ?? 0;
                  const hasAny = daily > 0 || avg3 > 0;
                  return (
                    <div key={sp.key}
                      className={`flex justify-between items-center py-0.5 border-b border-gray-100 last:border-0 ${!hasAny ? "opacity-35" : ""}`}>
                      <div>
                        <span className={`text-xs ${hasAny ? "text-gray-800 font-medium" : "text-gray-500"}`}>
                          {sp.label}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">({sp.season})</span>
                      </div>
                      <div className="flex gap-4">
                        <span className={`text-xs w-16 text-right tabular-nums ${hasAny ? countColor(daily) : "text-gray-400"}`}>
                          {daily > 0 ? daily.toLocaleString() : "0"}
                        </span>
                        <span className={`text-xs w-16 text-right tabular-nums ${avg3 > 0 ? "text-gray-600" : "text-gray-300"}`}>
                          {cond.hasLadderData ? (avg3 > 0 ? avg3.toLocaleString() : "0") : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Data source note */}
              <p className="text-xs text-gray-400 mt-2 pt-1 border-t border-gray-200">
                {cond.hasLadderData
                  ? `Today = single day count · 3-day avg = last 3 days average · data through ${cond.dataThrough ?? "—"}`
                  : `YTD total = Jan 1 – ${cond.dataThrough ?? "—"} cumulative · daily data pending`
                }
              </p>
            </div>
          )}

          {/* 5-day weather */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-700 mb-2">🌤️ 5-day forecast at this dam</p>
            {weatherLoading ? (
              <p className="text-xs text-gray-400 animate-pulse">Loading local weather...</p>
            ) : weather ? (
              <div className="grid grid-cols-5 gap-1">
                {weather.slice(0, 5).map((day, i) => (
                  <div key={i} className={`text-center rounded-lg p-1.5 ${i === 0 ? "bg-blue-100" : "bg-white bg-opacity-60"}`}>
                    <p className="text-xs text-gray-500 truncate">{day.dateLabel}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{day.shortLabel}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${day.high > 85 ? "text-red-600" : day.high > 75 ? "text-amber-600" : "text-gray-800"}`}>
                      {day.high}°
                    </p>
                    <p className="text-xs text-blue-400">{day.low}°</p>
                    {day.precip > 0 && <p className="text-xs text-blue-400">💧</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Weather unavailable</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function DamsPage() {
  const [conditions, setConditions]         = useState<DamConditions[]>(MOCK_CONDITIONS);
  const [isLoading, setIsLoading]           = useState(true);
  const [dataError, setDataError]           = useState(false);
  const [fetchedAt, setFetchedAt]           = useState<string | null>(null);
  const [dataThrough, setDataThrough]       = useState<string>("");
  const [selectedDamId, setSelectedDamId]   = useState<string | null>(null);
  const [weather, setWeather]               = useState<WeatherDay[] | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [riverFilter, setRiverFilter]       = useState<"all"|"columbia"|"snake"|"clearwater">("all");
  const [showNoLadder, setShowNoLadder]     = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const res  = await fetch("/api/conditions");
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        if (json.conditions) setConditions(json.conditions);
        if (json.fetchedAt)    setFetchedAt(json.fetchedAt);
        if (json.dataThrough)  setDataThrough(json.dataThrough);
        setDataError(false);
      } catch { setDataError(true); } finally { setIsLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedDamId) { setWeather(null); return; }
    const dam = ALL_DAMS.find(d => d.id === selectedDamId);
    if (!dam) return;
    async function loadWeather() {
      setWeatherLoading(true); setWeather(null);
      try {
        const res  = await fetch(`/api/conditions?lat=${dam!.lat}&lon=${dam!.lon}&name=${encodeURIComponent(dam!.name)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.days) setWeather(json.days);
      } catch { /* silent */ } finally { setWeatherLoading(false); }
    }
    loadWeather();
  }, [selectedDamId]);

  const filteredDams = ALL_DAMS.filter(dam => {
    if (riverFilter !== "all" && dam.river !== riverFilter) return false;
    if (!showNoLadder && !dam.hasLadder) return false;
    return true;
  });

  const selectedDam  = selectedDamId ? ALL_DAMS.find(d => d.id === selectedDamId) : null;
  const selectedCond = selectedDamId ? conditions.find(c => c.damId === selectedDamId) : undefined;
  const realCount    = conditions.filter(c => c.isRealData).length;
  const lastUpdated  = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : null;

  // Build grid with inline detail panel after clicked row
  const gridItems: React.ReactNode[] = [];
  for (let i = 0; i < filteredDams.length; i += 2) {
    const leftDam  = filteredDams[i];
    const rightDam = filteredDams[i + 1];
    const rowContainsSelected = leftDam?.id === selectedDamId || rightDam?.id === selectedDamId;

    gridItems.push(
      <DamCard key={leftDam.id} dam={leftDam}
        cond={conditions.find(c => c.damId === leftDam.id)}
        isSelected={selectedDamId === leftDam.id}
        onClick={() => setSelectedDamId(selectedDamId === leftDam.id ? null : leftDam.id)}
      />
    );
    if (rightDam) {
      gridItems.push(
        <DamCard key={rightDam.id} dam={rightDam}
          cond={conditions.find(c => c.damId === rightDam.id)}
          isSelected={selectedDamId === rightDam.id}
          onClick={() => setSelectedDamId(selectedDamId === rightDam.id ? null : rightDam.id)}
        />
      );
    }
    if (rowContainsSelected && selectedDam) {
      gridItems.push(
        <DamDetailPanel key={`detail-${selectedDam.id}`}
          dam={selectedDam} cond={selectedCond}
          weather={weather} weatherLoading={weatherLoading}
          onClose={() => setSelectedDamId(null)}
        />
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-2xl">🏗️</span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Dam Quick Reference</h1>
            <p className="text-sm text-gray-500">
              {isLoading ? "Loading live data..." : dataError
                ? <span className="text-amber-600">Using mock data</span>
                : <span>
                    <span className="text-green-600 font-medium">✅ Live — DART + USGS</span>
                    {dataThrough && <span className="text-gray-400"> · data through {dataThrough}</span>}
                    {lastUpdated && <span className="text-gray-400"> · {lastUpdated}</span>}
                  </span>
              }
            </p>
          </div>
          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap gap-x-4 gap-y-1">
            <a href="/"               className="text-sm text-blue-600 hover:underline">← Species</a>
            <a href="/map"            className="text-sm text-blue-600 hover:underline">River Map</a>
            <a href="/fishfinder"     className="text-sm text-blue-600 hover:underline">FishFinder</a>
            <a href="/season-updates" className="text-sm text-blue-600 hover:underline">Season Updates</a>
          </div>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin">⏳</div>
              <p className="text-sm text-blue-700">Loading live water temps and fish counts...</p>
            </div>
          </div>
        )}

        {/* FILTERS */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Filter</p>
            {(["all", "columbia", "snake", "clearwater"] as const).map(r => (
              <button key={r} onClick={() => setRiverFilter(r)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  riverFilter === r ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 text-gray-500 hover:bg-gray-50"
                }`}>
                {r === "all" ? "All rivers" : riverLabel(r) + " River"}
              </button>
            ))}
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer ml-2">
              <input type="checkbox" checked={showNoLadder}
                onChange={e => setShowNoLadder(e.target.checked)} className="rounded"/>
              Show dams without fish ladder
            </label>
            <p className="text-xs text-gray-400 ml-auto">
              {filteredDams.length} dams · click any for details
            </p>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {gridItems}
        </div>

        {/* DATA NOTE */}
        <div className={`rounded-xl p-4 border ${dataError ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
          <p className={`text-xs leading-relaxed ${dataError ? "text-amber-600" : "text-green-600"}`}>
            {dataError
              ? "⚠️ Could not reach DART or USGS. Check your connection and try refreshing."
              : `✅ Fish counts from DART mg.php (cbr.washington.edu) — updates daily. Water temps + flow from USGS + DART scroll case sensor. All species shown with any count. Weather from Open-Meteo at each dam's exact coordinates.`
            }
          </p>
        </div>

      </div>
    </main>
  );
}
