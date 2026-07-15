"use client";
// ============================================================
// COLUMBIA SALMON TRACKER - River Map Page
// File: app/map/page.tsx
//
// Phase 5: Fish location auto-calculated from real DART counts
// - Fish icon shown whenever any count > 0
// - Fish emoji flipped to face upstream (right)
// - Location derived from dam count data, not hardcoded miles
// ============================================================

import { useState, useEffect } from "react";

// ============================================================
// TYPES
// ============================================================
type RiverType = "columbia" | "snake";

interface DamInfo {
  id: string;
  name: string;
  shortName: string;
  riverMile: number;
  river: RiverType;
  hasLadder: boolean;
  hasCounting: boolean;
  svgX: number;
  labelAbove: boolean;
  lat: number;
  lon: number;
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

interface SpeciesConfig {
  id: string;
  label: string;
  river: RiverType;
  optimalTempMin: number;
  optimalTempMax: number;
  baseSpeed: number;
  description: string;
  dartKey: string;       // today's count field
  max3dayKey: string;    // 3-day max field
  // Fallback starting mile if no real data
  fallbackMile: number;
}

interface ForecastDay {
  label: string;
  emoji: string;
  riverMile: number;
  svgX: number;
  svgY: number;
  nearestDam: string;
  tempF: number;
  flowKcfs: number;
  speedMiPerDay: number;
  thermalWarning: boolean;
  thermalBarrier: boolean;
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

interface WeatherPanel {
  damName: string;
  damId: string;
  days: WeatherDay[];
  waterTempF?: number;
  flowKcfs?: number;
}

// ============================================================
// SVG LAYOUT CONSTANTS
// ============================================================
const COLUMBIA_Y = 148;
const SNAKE_Y    = 228;
const SVG_HEIGHT = 310;

// ============================================================
// ALL DAMS
// ============================================================
const ALL_DAMS: DamInfo[] = [
  { id: "bonneville", name: "Bonneville Dam", shortName: "Bonneville", riverMile: 146, river: "columbia", hasLadder: true, hasCounting: true, svgX: 90, labelAbove: true, lat: 45.644, lon: -121.940 },
  { id: "dalles", name: "The Dalles Dam", shortName: "The Dalles", riverMile: 191, river: "columbia", hasLadder: true, hasCounting: true, svgX: 152, labelAbove: false, lat: 45.614, lon: -121.134 },
  { id: "johnday", name: "John Day Dam", shortName: "John Day", riverMile: 215, river: "columbia", hasLadder: true, hasCounting: true, svgX: 212, labelAbove: true, lat: 45.715, lon: -120.694 },
  { id: "mcnary", name: "McNary Dam", shortName: "McNary", riverMile: 292, river: "columbia", hasLadder: true, hasCounting: true, svgX: 305, labelAbove: false, lat: 45.934, lon: -119.298 },
  { id: "priestrapids", name: "Priest Rapids Dam", shortName: "Priest Rapids", riverMile: 397, river: "columbia", hasLadder: true, hasCounting: true, svgX: 392, labelAbove: true, lat: 46.660, lon: -119.905 },
  { id: "wanapum", name: "Wanapum Dam", shortName: "Wanapum", riverMile: 415, river: "columbia", hasLadder: true, hasCounting: true, svgX: 450, labelAbove: false, lat: 46.857, lon: -119.987 },
  { id: "rockisland", name: "Rock Island Dam", shortName: "Rock Island", riverMile: 453, river: "columbia", hasLadder: true, hasCounting: true, svgX: 510, labelAbove: true, lat: 47.368, lon: -120.078 },
  { id: "rockyreach", name: "Rocky Reach Dam", shortName: "Rocky Reach", riverMile: 473, river: "columbia", hasLadder: true, hasCounting: true, svgX: 568, labelAbove: false, lat: 47.526, lon: -120.248 },
  { id: "wells", name: "Wells Dam (Brewster)", shortName: "Wells/Brewster", riverMile: 515, river: "columbia", hasLadder: true, hasCounting: true, svgX: 628, labelAbove: true, lat: 47.975, lon: -119.672 },
  { id: "chiefjoseph", name: "Chief Joseph Dam — NO LADDER", shortName: "Chief Joseph ⛔", riverMile: 545, river: "columbia", hasLadder: false, hasCounting: false, svgX: 690, labelAbove: false, lat: 48.007, lon: -119.625 },
  { id: "grandcoulee", name: "Grand Coulee Dam — NO LADDER", shortName: "Grand Coulee ⛔", riverMile: 596, river: "columbia", hasLadder: false, hasCounting: false, svgX: 750, labelAbove: true, lat: 47.957, lon: -118.981 },
  { id: "iceharbor", name: "Ice Harbor Dam", shortName: "Ice Harbor", riverMile: 9, river: "snake", hasLadder: true, hasCounting: true, svgX: 372, labelAbove: true, lat: 46.249, lon: -118.878 },
  { id: "lowermonumental", name: "Lower Monumental Dam", shortName: "Lower Mon.", riverMile: 41, river: "snake", hasLadder: true, hasCounting: true, svgX: 445, labelAbove: false, lat: 46.563, lon: -118.536 },
  { id: "littlegoose", name: "Little Goose Dam", shortName: "Little Goose", riverMile: 70, river: "snake", hasLadder: true, hasCounting: true, svgX: 523, labelAbove: true, lat: 46.585, lon: -118.026 },
  { id: "lowergranite", name: "Lower Granite Dam", shortName: "Lower Granite", riverMile: 107, river: "snake", hasLadder: true, hasCounting: true, svgX: 608, labelAbove: false, lat: 46.661, lon: -117.429 },
  { id: "hellscanyon", name: "Hells Canyon Dam — NO LADDER", shortName: "Hells Canyon ⛔", riverMile: 247, river: "snake", hasLadder: false, hasCounting: false, svgX: 690, labelAbove: true, lat: 45.257, lon: -116.698 },
];

// ============================================================
// MOCK CONDITIONS FALLBACK
// ============================================================
const MOCK_CONDITIONS: DamConditions[] = [
  { damId: "bonneville",      waterTempF: 47, flowKcfs: 139, fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "dalles",          waterTempF: 47, flowKcfs: 139, fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "johnday",         waterTempF: 52, flowKcfs: 135, fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "mcnary",          waterTempF: 65, flowKcfs: 175, fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "priestrapids",    waterTempF: 67, flowKcfs: 160, fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "wanapum",         waterTempF: 68, flowKcfs: 158, fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "rockisland",      waterTempF: 42, flowKcfs: 6,   fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "rockyreach",      waterTempF: 42, flowKcfs: 6,   fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "wells",           waterTempF: 65, flowKcfs: 148, fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "iceharbor",       waterTempF: 42, flowKcfs: 39,  fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "lowermonumental", waterTempF: 42, flowKcfs: 39,  fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "littlegoose",     waterTempF: 42, flowKcfs: 39,  fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
  { damId: "lowergranite",    waterTempF: 45, flowKcfs: 35,  fishCount: 0, chinookSpring: 0, chinookSummer: 0, chinookFall: 0, coho: 0, sockeye: 0, steelhead: 0, shad: 0, lamprey: 0, chum: 0, pink: 0, max3day_steelhead: 0 },
];

// ============================================================
// SPECIES — with dartKey for real data lookup
// ============================================================
const SPECIES_LIST: SpeciesConfig[] = [
  { id: "chinook_summer", label: "Chinook Summer", river: "columbia", optimalTempMin: 52, optimalTempMax: 64, baseSpeed: 28, description: "Summer Chinook — arrives June, peaks late July", dartKey: "chinookSummer", max3dayKey: "max3day_chinookSummer", fallbackMile: 390 },
  { id: "chinook_spring", label: "Chinook Spring", river: "columbia", optimalTempMin: 48, optimalTempMax: 60, baseSpeed: 30, description: "Spring Chinook — active now, peaks early May", dartKey: "chinookSpring", max3dayKey: "max3day_chinookSpring", fallbackMile: 295 },
  { id: "chinook_fall",   label: "Chinook Fall",   river: "columbia", optimalTempMin: 52, optimalTempMax: 64, baseSpeed: 26, description: "Fall run — not yet running", dartKey: "chinookFall", max3dayKey: "max3day_chinookFall", fallbackMile: 146 },
  { id: "steelhead",      label: "Steelhead",      river: "columbia", optimalTempMin: 50, optimalTempMax: 64, baseSpeed: 32, description: "Steelhead — active year-round, summer peak August", dartKey: "steelhead", max3dayKey: "max3day_steelhead", fallbackMile: 185 },
  { id: "sockeye",        label: "Sockeye",        river: "columbia", optimalTempMin: 48, optimalTempMax: 60, baseSpeed: 25, description: "Not yet running — arrives May–June", dartKey: "sockeye", max3dayKey: "max3day_sockeye", fallbackMile: 146 },
  { id: "coho",           label: "Coho",           river: "columbia", optimalTempMin: 50, optimalTempMax: 62, baseSpeed: 22, description: "Not yet running — arrives August", dartKey: "coho", max3dayKey: "max3day_coho", fallbackMile: 146 },
  { id: "chum",           label: "Chum",           river: "columbia", optimalTempMin: 48, optimalTempMax: 58, baseSpeed: 20, description: "Fall species — not yet running", dartKey: "chum", max3dayKey: "max3day_chum", fallbackMile: 146 },
  { id: "pink",           label: "Pink",           river: "columbia", optimalTempMin: 48, optimalTempMax: 58, baseSpeed: 22, description: "Even year — no significant run in 2026", dartKey: "pink", max3dayKey: "max3day_pink", fallbackMile: 146 },
  { id: "shad",           label: "Shad",           river: "columbia", optimalTempMin: 55, optimalTempMax: 70, baseSpeed: 35, description: "Not yet running — arrives May", dartKey: "shad", max3dayKey: "max3day_shad", fallbackMile: 146 },
  { id: "lamprey",        label: "Lamprey",        river: "columbia", optimalTempMin: 50, optimalTempMax: 65, baseSpeed: 18, description: "Not yet running — arrives June", dartKey: "lamprey", max3dayKey: "max3day_lamprey", fallbackMile: 146 },
];

// Minimum 3-day max count to show fish on map
const MIN_COUNT_TO_SHOW = 0; // Show fish icon for any count > 0

// ============================================================
// SPEED CALCULATION
// ============================================================
function calcSpeed(tempF: number, flowKcfs: number, sp: SpeciesConfig): number {
  let base: number;
  if (tempF < 42) { base = 5; }
  else if (tempF < sp.optimalTempMin) { const t = (tempF - 42) / (sp.optimalTempMin - 42); base = Math.round(8 + t * (sp.baseSpeed - 8)); }
  else if (tempF <= sp.optimalTempMax) { base = sp.baseSpeed; }
  else if (tempF < 68) { const t = (tempF - sp.optimalTempMax) / (68 - sp.optimalTempMax); base = Math.round(sp.baseSpeed - t * (sp.baseSpeed - 10)); }
  else if (tempF < 72) { base = Math.max(3, Math.round(10 - (tempF - 68) * 1.5)); }
  else { base = 2; }
  let flowMod = 0;
  if (flowKcfs > 250) flowMod = +4; else if (flowKcfs > 200) flowMod = +2;
  else if (flowKcfs < 120) flowMod = -4; else if (flowKcfs < 150) flowMod = -2;
  return Math.max(2, Math.min(45, base + flowMod));
}

// ============================================================
// HELPERS
// ============================================================
function getTempColor(t: number): string {
  if (t >= 72) return "#DC2626"; if (t >= 68) return "#EA580C";
  if (t >= 64) return "#D97706"; if (t >= 52) return "#16A34A";
  if (t >= 46) return "#2563EB"; return "#1D4ED8";
}
function getTempLabel(t: number): string {
  if (t >= 72) return "⛔ Thermal barrier"; if (t >= 68) return "⚠️ Heat stress";
  if (t >= 64) return "Warm — slowing"; if (t >= 52) return "✅ Optimal";
  if (t >= 46) return "Cool — decent"; return "Cold — sluggish";
}
function mileToSvgX(mile: number, river: RiverType): number {
  const dams = ALL_DAMS.filter(d => d.river === river && d.hasCounting).sort((a, b) => a.riverMile - b.riverMile);
  if (mile <= dams[0].riverMile) return dams[0].svgX;
  if (mile >= dams[dams.length - 1].riverMile) return dams[dams.length - 1].svgX;
  for (let i = 0; i < dams.length - 1; i++) {
    if (mile >= dams[i].riverMile && mile <= dams[i + 1].riverMile) {
      const t = (mile - dams[i].riverMile) / (dams[i + 1].riverMile - dams[i].riverMile);
      return Math.round(dams[i].svgX + t * (dams[i + 1].svgX - dams[i].svgX));
    }
  }
  return dams[0].svgX;
}
function getCondAtMile(mile: number, river: RiverType, conds: DamConditions[]) {
  const dams = ALL_DAMS.filter(d => d.river === river && d.hasCounting).sort((a, b) => a.riverMile - b.riverMile);
  let nearest = dams[0]; let minDist = Math.abs(dams[0].riverMile - mile);
  for (const d of dams) { const dist = Math.abs(d.riverMile - mile); if (dist < minDist) { minDist = dist; nearest = d; } }
  return conds.find(c => c.damId === nearest.id) ?? null;
}
function getNearestDamName(mile: number, river: RiverType): string {
  const dams = ALL_DAMS.filter(d => d.river === river && d.hasCounting).sort((a, b) => a.riverMile - b.riverMile);
  let nearest = dams[0]; let minDist = Math.abs(dams[0].riverMile - mile);
  for (const d of dams) { const dist = Math.abs(d.riverMile - mile); if (dist < minDist) { minDist = dist; nearest = d; } }
  return nearest.shortName;
}
function getNextDamUpstream(damId: string, river: RiverType): DamInfo | null {
  const dams = ALL_DAMS.filter(d => d.river === river && d.hasCounting).sort((a, b) => a.riverMile - b.riverMile);
  const idx = dams.findIndex(d => d.id === damId);
  if (idx === -1 || idx >= dams.length - 1) return null;
  return dams[idx + 1];
}

// ============================================================
// PHASE 5: AUTO FISH LOCATION FROM DART COUNTS
//
// Logic:
// 1. Find the highest-count dam = front of run
// 2. Find the sharpest count drop = bulk of fish just below
// 3. Estimate current river mile = midpoint above bulk dam
// 4. If all counts are zero = return null (hide fish icon)
// ============================================================
function calcFishMileFromCounts(
  conds: DamConditions[],
  species: SpeciesConfig
): number | null {
  const dams = ALL_DAMS
    .filter(d => d.river === species.river && d.hasCounting)
    .sort((a, b) => a.riverMile - b.riverMile);

  // Get counts for this specific species at each dam
  const counts = dams.map(d => {
    const cond = conds.find(c => c.damId === d.id);
    const max3 = cond ? (cond[species.max3dayKey as keyof DamConditions] as number ?? 0) : 0;
    return { dam: d, max3 };
  });

  // Check if any dam has real counts above threshold
  const hasRealCounts = counts.some(c => c.max3 > 0);
  if (!hasRealCounts) return null; // Hide fish icon if truly zero everywhere

  // Find the highest count dam = front of run
  const front = counts.reduce((max, cur) => cur.max3 > max.max3 ? cur : max);

  // Find the sharpest count drop going downstream→upstream
  // This tells us where the bulk of fish are
  let maxDrop = 0;
  let bulkIdx = counts.indexOf(front);
  for (let i = 0; i < counts.length - 1; i++) {
    if (counts[i].max3 > 0) {
      const drop = counts[i].max3 - counts[i + 1].max3;
      if (drop > maxDrop) {
        maxDrop = drop;
        bulkIdx = i;
      }
    }
  }

  const bulkDam = counts[bulkIdx].dam;
  const nextDam = counts[bulkIdx + 1]?.dam;

  // Estimate fish position:
  // If there's a next dam, fish are roughly halfway between bulk dam and next dam
  // Otherwise fish are just above the bulk dam
  if (nextDam) {
    const midMile = Math.round((bulkDam.riverMile + nextDam.riverMile) / 2);
    return midMile;
  }

  // Front of run is the last counting dam — estimate slightly above
  return Math.min(bulkDam.riverMile + 20, species.river === "columbia" ? 545 : 107);
}

function findBulk(conds: DamConditions[], river: RiverType, dartKey: string) {
  const dams = ALL_DAMS.filter(d => d.river === river && d.hasCounting).sort((a, b) => a.riverMile - b.riverMile);
  const counts = dams.map(d => {
    const c = conds.find(x => x.damId === d.id);
    return { dam: d, count: c ? ((c[dartKey as keyof DamConditions] as number) ?? 0) : 0 };
  });
  const front = counts.reduce((max, cur) => cur.count > max.count ? cur : max);
  let maxDrop = 0; let bulkIdx = counts.indexOf(front);
  for (let i = 0; i < counts.length - 1; i++) {
    const drop = counts[i].count - counts[i + 1].count;
    if (drop > maxDrop && counts[i].count > 0) { maxDrop = drop; bulkIdx = i; }
  }
  const bulk = counts[bulkIdx];
  const prev  = bulkIdx > 0 ? counts[bulkIdx - 1] : null;
  const next1 = counts[bulkIdx + 1] ?? null;
  const next2 = counts[bulkIdx + 2] ?? null;
  return {
    frontDam: front.dam, frontCount: front.count,
    bulkDam: bulk.dam, bulkCount: bulk.count,
    tempSrcDam:  prev?.dam ?? bulk.dam,
    tempSrcCond: conds.find(c => c.damId === (prev?.dam ?? bulk.dam).id) ?? null,
    next1Dam: next1?.dam ?? null, next1Cond: next1 ? conds.find(c => c.damId === next1.dam.id) ?? null : null,
    next2Dam: next2?.dam ?? null, next2Cond: next2 ? conds.find(c => c.damId === next2.dam.id) ?? null : null,
  };
}

function buildForecast(
  startMile: number,
  river: RiverType,
  species: SpeciesConfig,
  conds: DamConditions[]
): { days: ForecastDay[]; avgSpeed: number } {
  const maxMile = river === "columbia" ? 545 : 107;
  const svgY    = river === "columbia" ? COLUMBIA_Y : SNAKE_Y;
  const offsets = [0, 1, 3, 5];
  const labels  = ["Now", "+1 day", "+3 days", "+5 days"];
  const emojis  = ["🐟", "🔵", "🟡", "🟠"];
  const days: ForecastDay[] = [];
  let mile = startMile;
  for (let i = 0; i < offsets.length; i++) {
    const cond = getCondAtMile(mile, river, conds);
    const tempF = cond?.waterTempF ?? 47; const flowKcfs = cond?.flowKcfs ?? 180;
    const speed = calcSpeed(tempF, flowKcfs, species);
    const capped = Math.round(Math.min(mile, maxMile));
    days.push({
      label: labels[i], emoji: emojis[i],
      riverMile: capped, svgX: mileToSvgX(capped, river), svgY,
      nearestDam: getNearestDamName(mile, river),
      tempF, flowKcfs, speedMiPerDay: speed,
      thermalWarning: tempF >= 68 && tempF < 72,
      thermalBarrier: tempF >= 72,
    });
    if (i < offsets.length - 1) {
      mile = Math.min(mile + speed * (offsets[i + 1] - offsets[i]), maxMile);
    }
  }
  return { days, avgSpeed: Math.round(days.reduce((s, d) => s + d.speedMiPerDay, 0) / days.length) };
}

function condColor(code: number): string {
  if (code === 0) return "text-amber-500"; if (code <= 2) return "text-sky-400";
  if (code <= 3) return "text-gray-400"; if (code <= 69) return "text-blue-500";
  if (code <= 79) return "text-blue-300"; if (code <= 99) return "text-purple-500";
  return "text-gray-400";
}

function WeatherDayCard({ day, index, isFirst }: { day: WeatherDay; index: number; isFirst: boolean }) {
  return (
    <div className={`text-center rounded-xl p-2.5 flex flex-col gap-0.5 ${index === 0 && isFirst ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-100"}`}>
      <p className={`text-xs font-medium truncate ${index === 0 && isFirst ? "text-blue-600" : "text-gray-500"}`}>{day.dateLabel}</p>
      <p className={`text-xs font-medium ${condColor(day.code)}`}>{day.shortLabel}</p>
      <p className={`text-base font-semibold ${day.high > 85 ? "text-red-600" : day.high > 75 ? "text-amber-600" : "text-gray-900"}`}>{day.high}°</p>
      <p className="text-xs text-blue-500">{day.low}°</p>
      {day.precip > 0 && <p className="text-xs text-blue-400">💧 {day.precip}"</p>}
    </div>
  );
}

function WeatherForecastPanel({ panel, label, color, isLoading, waterTempF, flowKcfs }: {
  panel: WeatherPanel | null; label: string; color: "blue" | "green";
  isLoading: boolean; waterTempF?: number; flowKcfs?: number;
}) {
  const borderClass  = color === "blue" ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50";
  const headerColor  = color === "blue" ? "text-blue-700" : "text-green-700";
  const subColor     = color === "blue" ? "text-blue-500" : "text-green-500";
  const fishingTip = () => {
    if (!panel) return "";
    const avg  = Math.round(panel.days.reduce((s, d) => s + d.high, 0) / panel.days.length);
    const rain = panel.days.filter(d => d.precip > 0.1).length;
    const hot  = panel.days.filter(d => d.high > 85).length;
    if (hot >= 2)  return `⚠️ Hot stretch (${hot} days above 85°F) — river will warm. Fish may slow or stack below.`;
    if (rain >= 3) return `🌧️ Rainy week ahead — runoff boosts flow and can trigger fish movement. Good conditions.`;
    if (avg < 60)  return `❄️ Cool week (avg ${avg}°F) — stable, comfortable fishing conditions.`;
    return `✅ Mild conditions (avg ${avg}°F high) — stable weather, predictable fish behavior.`;
  };
  return (
    <div className={`border rounded-xl p-4 flex-1 min-w-0 ${borderClass}`}>
      <div className="mb-3">
        <p className={`text-xs font-semibold uppercase tracking-wide ${headerColor}`}>{label}</p>
        {panel && <p className="text-sm font-medium text-gray-900 mt-0.5">{panel.damName}</p>}
        {waterTempF !== undefined && (
          <p className={`text-xs mt-0.5 ${subColor}`}>
            Water: <span className="font-semibold" style={{ color: getTempColor(waterTempF) }}>{waterTempF}°F — {getTempLabel(waterTempF)}</span>
          </p>
        )}
        {flowKcfs !== undefined && (
          <p className={`text-xs mt-0.5 ${subColor}`}>
            Flow: <span className="font-semibold text-gray-700">{flowKcfs}k cfs</span>
            <span className="text-gray-400 ml-1">{flowKcfs > 200 ? "— High · boosting speed" : flowKcfs < 130 ? "— Low · slowing fish" : "— Normal"}</span>
          </p>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 py-4"><div className="animate-spin text-sm">⏳</div><p className="text-xs text-gray-400">Loading forecast...</p></div>
      ) : panel ? (
        <>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {panel.days.slice(0, 5).map((day, i) => <WeatherDayCard key={i} day={day} index={i} isFirst={color === "blue"} />)}
          </div>
          <p className="text-xs text-gray-600 leading-relaxed bg-white bg-opacity-60 rounded-lg p-2">{fishingTip()}</p>
        </>
      ) : <p className="text-xs text-gray-400 py-2">No forecast available</p>}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function MapPage() {
  const [spId, setSpId]                     = useState("steelhead");
  const [selectedDamId, setSelectedDamId]   = useState<string | null>(null);
  const [conditions, setConditions]          = useState<DamConditions[]>(MOCK_CONDITIONS);
  const [isLoading, setIsLoading]           = useState(true);
  const [dataError, setDataError]           = useState(false);
  const [fetchedAt, setFetchedAt]           = useState<string | null>(null);
  const [dataThrough, setDataThrough]       = useState<string>("");
  const [currentPanel, setCurrentPanel]     = useState<WeatherPanel | null>(null);
  const [nextPanel, setNextPanel]           = useState<WeatherPanel | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    async function loadConditions() {
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
    loadConditions();
  }, []);

  const species = SPECIES_LIST.find(s => s.id === spId)!;

  // ============================================================
  // PHASE 5: Calculate fish mile from real DART counts
  // Returns null if counts are below threshold (hides fish icon)
  // ============================================================
  const fishMile = calcFishMileFromCounts(conditions, species);
  const hasRealFishLocation = fishMile !== null;

  // Build forecast only if we have a valid fish location
  const forecast = hasRealFishLocation
    ? buildForecast(fishMile!, species.river, species, conditions)
    : null;

  const bonData    = conditions.find(c => c.damId === "bonneville");
  const bulk = findBulk(conditions, species.river, species.dartKey);

  useEffect(() => {
    if (isLoading) return;
    async function loadWeather() {
      setWeatherLoading(true); setCurrentPanel(null); setNextPanel(null);
      try {
        const bulkInfo   = findBulk(conditions, species.river, species.dartKey);
        const currentDam = ALL_DAMS.find(d => d.id === bulkInfo.bulkDam.id);
        if (!currentDam) return;
        const nextDam = getNextDamUpstream(currentDam.id, species.river);
        const fetches = [
          fetch(`/api/conditions?lat=${currentDam.lat}&lon=${currentDam.lon}&name=${encodeURIComponent(currentDam.name)}`),
          nextDam ? fetch(`/api/conditions?lat=${nextDam.lat}&lon=${nextDam.lon}&name=${encodeURIComponent(nextDam.name)}`) : Promise.resolve(null),
        ];
        const [res1, res2] = await Promise.all(fetches);
        if (res1 && res1.ok) {
          const json = await res1.json();
          if (json.days) setCurrentPanel({ damName: currentDam.name, damId: currentDam.id, days: json.days, waterTempF: conditions.find(c => c.damId === currentDam.id)?.waterTempF, flowKcfs: conditions.find(c => c.damId === currentDam.id)?.flowKcfs });
        }
        if (res2 && res2.ok && nextDam) {
          const json = await res2.json();
          if (json.days) setNextPanel({ damName: nextDam.name, damId: nextDam.id, days: json.days, waterTempF: conditions.find(c => c.damId === nextDam.id)?.waterTempF, flowKcfs: conditions.find(c => c.damId === nextDam.id)?.flowKcfs });
        }
      } catch { /* silent */ } finally { setWeatherLoading(false); }
    }
    loadWeather();
  }, [spId, isLoading]);

  const hasWarning  = forecast?.days.some(d => d.thermalWarning || d.thermalBarrier) ?? false;
  const barrierDay  = forecast?.days.find(d => d.thermalBarrier);
  const selDam      = selectedDamId ? ALL_DAMS.find(d => d.id === selectedDamId) : null;
  const selCond     = selectedDamId ? conditions.find(c => c.damId === selectedDamId) : null;
  const realCount   = conditions.filter(c => c.isRealData).length;
  const lastUpdated = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : null;

  return (
    <main className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-2xl">🗺️</span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Columbia Basin — River Map</h1>
            <p className="text-sm text-gray-500">
              {isLoading ? "Loading live data..." : dataError
                ? <span className="text-amber-600">Using mock data</span>
                : <span>
                    <span className="text-green-600 font-medium">✅ Live — {realCount} dams</span>
                    {lastUpdated && <span className="text-gray-400"> · Updated {lastUpdated}</span>}
                  </span>
              }
            </p>
          </div>
          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap gap-x-4 gap-y-1">
            <a href="/"               className="text-sm text-blue-600 hover:underline">← Species</a>
            <a href="/dams"           className="text-sm text-blue-600 hover:underline">Dam Reference</a>
            <a href="/fishfinder"     className="text-sm text-blue-600 hover:underline">FishFinder</a>
            <a href="/season-updates" className="text-sm text-blue-600 hover:underline">Season Updates</a>
          </div>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin text-xl">⏳</div>
              <div><p className="text-sm font-medium text-blue-700">Fetching live data...</p><p className="text-xs text-blue-600 mt-0.5">Connecting to USGS + DART</p></div>
            </div>
          </div>
        )}

        {/* SPECIES SELECTOR */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Select species</p>
            {bonData?.isRealData && bonData?.dataThrough && (
              <span className="text-xs text-green-600">✓ Live Bonneville counts · {bonData.dataThrough}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SPECIES_LIST.map(s => {
              const daily = bonData ? ((bonData[s.dartKey as keyof DamConditions] as number) ?? 0) : 0;
              const isActive = daily > 0;
              const isSelected = spId === s.id;
              const dotColor = isActive ? "bg-green-500" : "bg-gray-300";
              const countLabel = isActive
                ? `${daily.toLocaleString()}/day`
                : s.id === "pink" ? "Odd years only" : "Not yet";
              return (
                <button key={s.id} onClick={() => setSpId(s.id)}
                  className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "bg-blue-50 border-blue-300"
                      : "border-gray-100 hover:bg-gray-50"
                  }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    <span className={`text-xs font-medium truncate ${isSelected ? "text-blue-700" : isActive ? "text-gray-800" : "text-gray-500"}`}>
                      {s.label}
                    </span>
                  </div>
                  <span className={`text-xs flex-shrink-0 ${isActive ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                    {countLabel}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">{species.description}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
            River map — click any dam for details
          </p>
          <div className="flex gap-4 flex-wrap mb-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-400 opacity-70" />Columbia dam</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-400 opacity-70" />Snake River dam</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-400" />No fish ladder</div>
            {hasRealFishLocation && ["🐟 Now", "🔵 +1 day", "🟡 +3 days", "🟠 +5 days"].map(l => <span key={l}>{l}</span>)}
            {!hasRealFishLocation && <span className="text-amber-500">⏳ Fish icon hidden — no counts recorded yet</span>}
          </div>
          <div className="overflow-x-auto">
            <svg width="840" height={SVG_HEIGHT} viewBox={`0 0 840 ${SVG_HEIGHT}`}
              xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>

              {/* Ocean label */}
              <text x="20" y={COLUMBIA_Y - 10} fontSize="9" fill="#93C5FD" fontFamily="sans-serif">← ocean · fish travel right →</text>

              {/* Columbia River */}
              <line x1="55" y1={COLUMBIA_Y} x2="790" y2={COLUMBIA_Y} stroke="#BFDBFE" strokeWidth="10" opacity="0.2"/>
              <line x1="55" y1={COLUMBIA_Y} x2="790" y2={COLUMBIA_Y} stroke={hasWarning ? "#FB923C" : "#60A5FA"} strokeWidth="2" opacity="0.65"/>
              <text x="57" y={COLUMBIA_Y + 14} fontSize="9" fill="#93C5FD" opacity="0.8" fontFamily="sans-serif">Columbia River</text>

              {/* Canada border */}
              <line x1="790" y1={COLUMBIA_Y - 40} x2="790" y2={COLUMBIA_Y + 20} stroke="#D1D5DB" strokeWidth="0.5" strokeDasharray="3,3"/>
              <text x="793" y={COLUMBIA_Y - 28} fontSize="7" fill="#9CA3AF" fontFamily="sans-serif">Canada</text>
              <circle cx="800" cy={COLUMBIA_Y} r="4" fill="#BFDBFE" stroke="white" strokeWidth="1"/>
              <text x="800" y={COLUMBIA_Y - 10} textAnchor="middle" fontSize="7" fill="#9CA3AF" fontFamily="sans-serif">Keenleyside BC</text>

              {/* Snake River */}
              <path d={`M305,${COLUMBIA_Y} Q310,180 335,${SNAKE_Y} L720,${SNAKE_Y}`} stroke="#BBF7D0" strokeWidth="6" fill="none" opacity="0.2"/>
              <path d={`M305,${COLUMBIA_Y} Q310,180 335,${SNAKE_Y} L720,${SNAKE_Y}`} stroke="#4ADE80" strokeWidth="2" fill="none" opacity="0.6"/>
              <text x="348" y={SNAKE_Y - 8} fontSize="9" fill="#4ADE80" opacity="0.9" fontFamily="sans-serif">Snake River</text>

              {/* Clearwater */}
              <path d={`M608,${SNAKE_Y} Q612,${SNAKE_Y} 614,${SNAKE_Y - 20} L614,${COLUMBIA_Y + 18}`} stroke="#FDE68A" strokeWidth="1.5" fill="none" opacity="0.6"/>
              <text x="618" y={SNAKE_Y - 38} fontSize="8" fill="#D97706" fontFamily="sans-serif">Clearwater</text>
              <rect x={610} y={COLUMBIA_Y + 20} width={7} height={12} rx={2} fill="#F87171" opacity={0.75}/>
              <text x={613} y={COLUMBIA_Y + 17} textAnchor="middle" fontSize={7} fill="#DC2626" fontFamily="sans-serif">Dworshak ⛔</text>

              {/* Columbia dams */}
              {ALL_DAMS.filter(d => d.river === "columbia").map(dam => {
                const c = conditions.find(x => x.damId === dam.id);
                const sel = selectedDamId === dam.id;
                const col = dam.hasLadder ? "#60A5FA" : "#F87171";
                const lblY = dam.labelAbove ? COLUMBIA_Y - 24 : COLUMBIA_Y + 26;
                const tmpY = dam.labelAbove ? COLUMBIA_Y - 34 : COLUMBIA_Y + 36;
                return (
                  <g key={dam.id} style={{ cursor: "pointer" }} onClick={() => setSelectedDamId(selectedDamId === dam.id ? null : dam.id)}>
                    {sel && <circle cx={dam.svgX} cy={COLUMBIA_Y} r={14} fill="none" stroke="#1D4ED8" strokeWidth={2} opacity={0.5}/>}
                    <rect x={dam.svgX - 4} y={COLUMBIA_Y - 20} width={8} height={40} rx={2} fill={col} opacity={dam.hasLadder ? 0.75 : 0.9}/>
                    <text x={dam.svgX} y={lblY} textAnchor="middle" fontSize={8} fill={dam.hasLadder ? "#374151" : "#DC2626"} fontFamily="sans-serif" fontWeight={sel ? "700" : "400"}>{dam.shortName}</text>
                    {c && <text x={dam.svgX} y={tmpY} textAnchor="middle" fontSize={7} fontFamily="sans-serif" fontWeight="600" fill={getTempColor(c.waterTempF)}>{c.waterTempF}°F{c.isRealData ? " ✓" : ""}</text>}
                  </g>
                );
              })}

              {/* Snake dams */}
              {ALL_DAMS.filter(d => d.river === "snake").map(dam => {
                const c = conditions.find(x => x.damId === dam.id);
                const sel = selectedDamId === dam.id;
                const col = dam.hasLadder ? "#4ADE80" : "#F87171";
                const lblY = dam.labelAbove ? SNAKE_Y - 20 : SNAKE_Y + 22;
                const tmpY = dam.labelAbove ? SNAKE_Y - 30 : SNAKE_Y + 32;
                return (
                  <g key={dam.id} style={{ cursor: "pointer" }} onClick={() => setSelectedDamId(selectedDamId === dam.id ? null : dam.id)}>
                    {sel && <circle cx={dam.svgX} cy={SNAKE_Y} r={12} fill="none" stroke="#15803D" strokeWidth={2} opacity={0.5}/>}
                    <rect x={dam.svgX - 4} y={SNAKE_Y - 14} width={8} height={28} rx={2} fill={col} opacity={dam.hasLadder ? 0.75 : 0.9}/>
                    <text x={dam.svgX} y={lblY} textAnchor="middle" fontSize={8} fill={dam.hasLadder ? "#374151" : "#DC2626"} fontFamily="sans-serif" fontWeight={sel ? "700" : "400"}>{dam.shortName}</text>
                    {c && <text x={dam.svgX} y={tmpY} textAnchor="middle" fontSize={7} fontFamily="sans-serif" fontWeight="600" fill={getTempColor(c.waterTempF)}>{c.waterTempF}°F{c.isRealData ? " ✓" : ""}</text>}
                  </g>
                );
              })}

              {/* ============================================================
                  FISH ICONS — only rendered when counts > 25/day
                  Fish emoji mirrored with scaleX(-1) to face upstream (right)
                  ============================================================ */}
              {hasRealFishLocation && forecast && (
                <>
                  {/* Dashed trail line */}
                  {forecast.days.length >= 2 && (
                    <path d={[`M${forecast.days[0].svgX},${forecast.days[0].svgY}`, ...forecast.days.slice(1).map(d => `L${d.svgX},${d.svgY}`)].join(" ")}
                      stroke="#3B82F6" strokeWidth={1.5} fill="none" strokeDasharray="5,3" opacity={0.4}/>
                  )}

                  {/* Fish position icons */}
                  {forecast.days.map((day, i) => {
                    const isNow        = i === 0;
                    const lblOff       = i % 2 === 0 ? -24 : 24;
                    const spdOff       = i % 2 === 0 ? -34 : 34;
                    const circleFill   = i === 1 ? "#DBEAFE" : i === 2 ? "#FEF9C3" : "#FFEDD5";
                    const circleStroke = i === 1 ? "#60A5FA"  : i === 2 ? "#FDE047" : "#FB923C";
                    return (
                      <g key={i}>
                        {!isNow && <circle cx={day.svgX} cy={day.svgY} r={13} fill={circleFill} stroke={circleStroke} strokeWidth={1.5}/>}

                        {/* Fish emoji — mirrored with transform to face upstream (right →) */}
                        <g transform={`translate(${day.svgX}, ${day.svgY}) scale(-1, 1)`}>
                          <text x="0" y="0"
                            textAnchor="middle" dominantBaseline="central"
                            fontSize={isNow ? 22 : 14}>
                            {day.emoji}
                          </text>
                        </g>

                        <text x={day.svgX} y={day.svgY + lblOff} textAnchor="middle" fontSize={8} fill="#1F2937" fontFamily="sans-serif" fontWeight={isNow ? "700" : "400"}>{day.label}</text>
                        <text x={day.svgX} y={day.svgY + spdOff} textAnchor="middle" fontSize={7} fill={day.thermalWarning || day.thermalBarrier ? "#EA580C" : "#9CA3AF"} fontFamily="sans-serif">{day.speedMiPerDay}mi/d · {day.tempF}°F</text>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>
          </div>
        </div>


        {/* DAM DETAIL PANEL */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 min-h-20">
          {selDam ? (
            <>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{selDam.name}</h3>
                    {selCond?.isRealData && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">✅ Live data</span>}
                    {selCond && !selCond.isRealData && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Mock data</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{selDam.river === "columbia" ? "Columbia" : "Snake"} RM {selDam.riverMile} · {selDam.hasLadder ? "✅ Fish ladder" : "⛔ No fish ladder"} · {selDam.hasCounting ? "📊 Active counting" : "No counting"}</p>
                </div>
                <button onClick={() => setSelectedDamId(null)} className="text-xs text-gray-400 hover:text-gray-600 ml-4">✕ Close</button>
              </div>
              {selCond ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-lg font-semibold" style={{ color: getTempColor(selCond.waterTempF) }}>{selCond.waterTempF}°F</p><p className="text-xs text-gray-500">Water temp</p><p className="text-xs mt-0.5" style={{ color: getTempColor(selCond.waterTempF) }}>{getTempLabel(selCond.waterTempF)}</p></div>
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-lg font-semibold text-gray-900">{selCond.flowKcfs}k</p><p className="text-xs text-gray-500">Flow (cfs)</p><p className="text-xs text-gray-400 mt-0.5">{selCond.flowKcfs > 200 ? "High" : selCond.flowKcfs < 130 ? "Low" : "Normal"}</p></div>
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-lg font-semibold text-gray-900">{selCond.fishCount.toLocaleString()}</p><p className="text-xs text-gray-500">Fish/day</p><p className={`text-xs mt-0.5 ${selCond.isRealData ? "text-green-600" : "text-amber-600"}`}>{selCond.isRealData ? "Live — DART" : "Mock data"}</p></div>
                  <div className="bg-gray-50 rounded-xl p-3"><p className="text-lg font-semibold text-gray-900">{calcSpeed(selCond.waterTempF, selCond.flowKcfs, species)}</p><p className="text-xs text-gray-500">Est. mi/day here</p><p className="text-xs text-gray-400 mt-0.5">For {species.label}</p></div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">{selDam.hasLadder ? "No conditions data for this dam." : "No fish ladder — fish cannot pass here."}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 py-1">👆 Click any dam to see its live water temperature, flow, fish counts, and estimated fish speed.</p>
          )}
        </div>


        {/* SPECIES COUNTS — Bonneville counts for all species */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">
            Species counts
            {bonData?.isRealData
              ? <span className="text-green-500 ml-1 font-normal">✓ Live — DART</span>
              : <span className="text-amber-400 ml-1 font-normal">Awaiting data</span>
            }
          </p>
          {/* Column headers */}
          <div className="flex justify-between text-xs text-gray-400 mb-1 pb-1 border-b border-gray-200">
            <span>Species</span>
            <div className="flex gap-4">
              <span className="w-20 text-right">Latest day</span>
              <span className="w-20 text-right">3-day avg</span>
            </div>
          </div>
          <div className="space-y-0.5">
            {[
              { key: "chinookSpring", avg3key: "avg3day_chinookSpring", label: "Chinook Spring", season: "Apr–Jun" },
              { key: "chinookSummer", avg3key: "avg3day_chinookSummer", label: "Chinook Summer", season: "Jun–Aug" },
              { key: "chinookFall",   avg3key: "avg3day_chinookFall",   label: "Chinook Fall",   season: "Aug–Oct" },
              { key: "coho",          avg3key: "avg3day_coho",          label: "Coho",           season: "Aug–Oct" },
              { key: "sockeye",       avg3key: "avg3day_sockeye",       label: "Sockeye",        season: "Jun–Jul" },
              { key: "steelhead",     avg3key: "avg3day_steelhead",     label: "Steelhead",      season: "Jun–Oct" },
              { key: "shad",          avg3key: "avg3day_shad",          label: "Shad",           season: "May–Jul" },
              { key: "lamprey",       avg3key: "avg3day_lamprey",       label: "Lamprey",        season: "Jun–Aug" },
              { key: "chum",          avg3key: "avg3day_chum",          label: "Chum",           season: "Oct–Nov" },
              { key: "pink",          avg3key: "avg3day_pink",          label: "Pink",           season: "Odd yrs" },
            ].map(sp => {
              const daily = bonData ? ((bonData[sp.key as keyof DamConditions] as number) ?? 0) : 0;
              const avg3  = bonData ? ((bonData[sp.avg3key as keyof DamConditions] as number) ?? 0) : 0;
              const hasAny = daily > 0 || avg3 > 0;
              const countColor = daily > 1000 ? "text-green-600 font-semibold"
                : daily > 100 ? "text-green-600" : daily > 0 ? "text-blue-600" : "text-gray-400";
              return (
                <div key={sp.key}
                  className={`flex justify-between items-center py-0.5 border-b border-gray-100 last:border-0 ${!hasAny ? "opacity-35" : ""}`}>
                  <div>
                    <span className={`text-xs ${hasAny ? "text-gray-800 font-medium" : "text-gray-500"}`}>{sp.label}</span>
                    <span className="text-xs text-gray-400 ml-1">({sp.season})</span>
                  </div>
                  <div className="flex gap-4">
                    <span className={`text-xs w-20 text-right tabular-nums ${countColor}`}>
                      {daily > 0 ? daily.toLocaleString() : "0"}
                    </span>
                    <span className={`text-xs w-20 text-right tabular-nums ${avg3 > 0 ? "text-gray-600" : "text-gray-300"}`}>
                      {avg3 > 0 ? avg3.toLocaleString() : "0"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2 pt-1 border-t border-gray-200">
            Latest day = most recent count · 3-day avg = last 3 days · data through {bonData?.dataThrough ?? "—"}
          </p>
        </div>


        {/* THERMAL WARNING */}
        {hasWarning && !isLoading && (
          <div className={`rounded-xl p-4 mb-4 border ${barrierDay ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className={`font-semibold text-sm ${barrierDay ? "text-red-700" : "text-orange-700"}`}>
                  {barrierDay ? `Thermal barrier near ${barrierDay.nearestDam} — fish stacking` : "Heat stress in forecast path — fish slowing"}
                </p>
                <p className={`text-xs mt-1 ${barrierDay ? "text-red-600" : "text-orange-600"}`}>
                  {barrierDay
                    ? `Water reaches ${barrierDay.tempF}°F near ${barrierDay.nearestDam}. Fish likely holding below.`
                    : `Water hits ${forecast?.days.find(d => d.thermalWarning)?.tempF}°F — above 68°F stress threshold.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WHERE ARE THE FISH */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Where are the fish?</p>
          {hasRealFishLocation ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Front of run</p>
                <p className="font-semibold text-blue-900 text-sm">{bulk.frontDam.name}</p>
                <p className="text-xs text-blue-700 mt-1">Highest count: {bulk.frontCount.toLocaleString()}{conditions.find(c=>c.damId===bulk.frontDam.id)?.hasLadderData ? "/day" : " YTD"}</p>
                <p className="text-xs text-blue-400 mt-1">Method: highest single dam count</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs text-green-600 font-medium mb-1">Bulk of fish</p>
                <p className="font-semibold text-green-900 text-sm">Above {bulk.bulkDam.name}</p>
                <p className="text-xs text-green-700 mt-1">Sharpest drop: {bulk.bulkCount.toLocaleString()}{conditions.find(c=>c.damId===bulk.bulkDam.id)?.hasLadderData ? "/day" : " YTD"}</p>
                <p className="text-xs text-green-400 mt-1">✅ Fish icon auto-positioned from counts</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-600 font-medium mb-1">Water temps</p>
                <div className="space-y-1.5 mt-1">
                  {[
                    { dam: bulk.tempSrcDam, cond: bulk.tempSrcCond, dir: "↓", label: "1 below bulk" },
                    { dam: bulk.next1Dam,   cond: bulk.next1Cond,   dir: "↑", label: "next 1 upstream" },
                    { dam: bulk.next2Dam,   cond: bulk.next2Cond,   dir: "↑", label: "next 2 upstream" },
                  ].map((row, i) => row.dam && (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-xs text-amber-700">{row.dir} {row.dam.shortName}</span>
                      <span className="text-xs font-semibold" style={{ color: getTempColor(row.cond?.waterTempF ?? 62) }}>{row.cond?.waterTempF ?? "—"}°F</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">
                ⏳ No {species.label} counts recorded yet at any dam.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Fish icon will appear automatically when DART posts counts above the threshold.
                DART updates daily by ~9 AM Pacific.
              </p>
            </div>
          )}
        </div>

        {/* SPEED CARDS — only show if fish location is known */}
        {forecast && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
              Travel speed — recalculated each day using real local water temperatures
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">5-day avg</p>
                <p className="text-2xl font-semibold text-gray-900">{forecast.avgSpeed}</p>
                <p className="text-xs text-gray-500 mt-0.5">mi/day</p>
              </div>
              {forecast.days.map((day, i) => (
                <div key={i} className={`rounded-xl p-3 border ${day.thermalBarrier ? "bg-red-50 border-red-200" : day.thermalWarning ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"}`}>
                  <p className="text-xs text-gray-400 mb-1">{day.label}</p>
                  <p className={`text-xl font-semibold ${day.thermalBarrier ? "text-red-700" : day.thermalWarning ? "text-orange-600" : "text-gray-900"}`}>{day.speedMiPerDay}</p>
                  <p className="text-xs text-gray-500 mt-0.5">mi/day</p>
                  <p className="text-xs mt-1 font-medium" style={{ color: getTempColor(day.tempF) }}>{day.tempF}°F</p>
                  <p className="text-xs text-gray-400">{day.nearestDam}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-gray-100 pt-3">
              {forecast.days.map((day, i) => (
                <p key={i} className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-gray-700">{day.emoji} {day.label}:</span>{" "}
                  RM {day.riverMile} near {day.nearestDam} · {day.tempF}°F · {day.flowKcfs}k cfs · {getTempLabel(day.tempF)} · {day.speedMiPerDay} mi/day
                  {day.thermalBarrier && " · ⛔ fish holding"}{day.thermalWarning && " · ⚠️ slowing"}
                </p>
              ))}
            </div>
          </div>
        )}


        {/* RIVER MAP SVG — moved here, just below species + counts */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="mb-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">5-day weather forecast — fish location vs. next dam upstream</p>
            <p className="text-xs text-gray-500 mt-1">Use these to predict whether fish will speed up, slow down, or stack before reaching the next dam.</p>
          </div>
          <div className="flex gap-3 flex-col md:flex-row">
            <WeatherForecastPanel panel={currentPanel} label="🐟 Where fish are now" color="blue" isLoading={weatherLoading} waterTempF={currentPanel?.waterTempF} flowKcfs={currentPanel?.flowKcfs} />
            <div className="flex items-center justify-center flex-shrink-0">
              <div className="text-gray-300 text-2xl hidden md:block">→</div>
              <div className="text-gray-300 text-xl md:hidden">↓</div>
            </div>
            <WeatherForecastPanel panel={nextPanel} label="⬆️ Next dam upstream" color="green" isLoading={weatherLoading} waterTempF={nextPanel?.waterTempF} flowKcfs={nextPanel?.flowKcfs} />
          </div>
          {currentPanel && nextPanel && !weatherLoading && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-xs font-semibold text-gray-700 mb-1">🎣 Movement prediction</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {(() => {
                  const currAvg  = Math.round(currentPanel.days.slice(0, 5).reduce((s, d) => s + d.high, 0) / 5);
                  const nextAvg  = Math.round(nextPanel.days.slice(0, 5).reduce((s, d) => s + d.high, 0) / 5);
                  const tempDiff = nextAvg - currAvg;
                  const nextWater = nextPanel.waterTempF ?? 60;
                  if (nextWater >= 72) return `⛔ Thermal barrier ahead at ${nextPanel.damName} (${nextWater}°F). Fish likely stacking below. Best fishing at ${currentPanel.damName} right now.`;
                  if (nextWater >= 68) return `⚠️ Warm water ahead at ${nextPanel.damName} (${nextWater}°F). Fish movement will slow. Current location near ${currentPanel.damName} may be the better bet.`;
                  if (tempDiff > 8)   return `⚠️ Air temps at ${nextPanel.damName} run ${tempDiff}°F warmer. Fish may slow before arriving. Plan for current location now, upstream later.`;
                  if (tempDiff < -5)  return `✅ Cooler air ahead at ${nextPanel.damName} (${Math.abs(tempDiff)}°F cooler). Fish should move actively. Good week to fish both locations.`;
                  return `✅ Similar conditions at both locations (${currAvg}°F vs ${nextAvg}°F avg highs). Fish should move steadily from ${currentPanel.damName} toward ${nextPanel.damName} this week.`;
                })()}
              </p>
            </div>
          )}
        </div>

        {/* DATA STATUS */}
        <div className={`rounded-xl p-4 border ${dataError ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
          <p className={`text-xs font-semibold mb-1 ${dataError ? "text-amber-700" : "text-green-700"}`}>
            {dataError ? "⚠️ Could not reach DART" : "✅ Live — DART adult_daily.php + USGS"}
          </p>
          <p className={`text-xs leading-relaxed ${dataError ? "text-amber-600" : "text-green-600"}`}>
            {dataError
              ? "Could not reach USGS or DART APIs. Try refreshing."
              : `Real water temps + flow from USGS. Fish counts from DART (posts daily ~9 AM Pacific). ${realCount} of ${conditions.length} dams have live data. Fish icon auto-positioned from DART counts — appears when any count > 0. Weather from Open-Meteo.`
            }
          </p>
        </div>

      </div>
    </main>
  );
}
