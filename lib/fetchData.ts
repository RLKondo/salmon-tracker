// ============================================================
// lib/fetchData.ts
//
// Data sources:
// 1. DART adult_daily.php — TRUE daily counts per species per dam
//    CONFIRMED WORKING: returns clean CSV
//    Format: Project,Date,ChinookRun,Chin,JChin,Stlhd,WStlhd,
//            Sock,Coho,JCoho,Shad,LmpryDay,LmpryNight,LmpryLPS,
//            BTrout,Chum,Pink,TempC
//    URL: adult_daily.php?sc=1&outputFormat=csv&year=YYYY&proj=BON
//
// 2. DART adult_basin_sum.php — YTD season totals (backup/cross-ref)
//    Used when daily data unavailable
//
// 3. USGS — hourly water temp + flow
//
// 4. Open-Meteo — 7-day air temp forecast
//
// CORRECT PROJECT CODES (confirmed from DART Daily Counts query page):
// BON=Bonneville, TDA=The Dalles, JDA=John Day, MCN=McNary
// PRD=Priest Rapids, WAN=Wanapum, RIS=Rock Island
// RRH=Rocky Reach, WEL=Wells, IHR=Ice Harbor
// LMN=Lower Monumental, LGS=Little Goose, LWG=Lower Granite
// ============================================================

// ============================================================
// DART PROJECT CODES — verified correct for adult_daily.php
// ============================================================
export const DART_PROJECTS: Record<string, string> = {
  bonneville:      "BON",
  dalles:          "TDA",
  johnday:         "JDA",
  mcnary:          "MCN",
  priestrapids:    "PRD",  // was PRA — now correct
  wanapum:         "WAN",
  rockisland:      "RIS",
  rockyreach:      "RRH",
  wells:           "WEL",
  iceharbor:       "IHR",
  lowermonumental: "LMN",
  littlegoose:     "LGS",
  lowergranite:    "LWG",  // was LGR — now correct
};

// ============================================================
// USGS GAUGE IDs
// ============================================================
export const USGS_GAUGES: Record<string, string> = {
  bonneville:      "14105700",
  dalles:          "14105700",
  johnday:         "14105700",
  mcnary:          "14019220",
  priestrapids:    "12472800",
  wanapum:         "12462600",
  rockisland:      "12462600",
  rockyreach:      "12453700",
  wells:           "12452990",
  iceharbor:       "13334300",
  lowermonumental: "13334300",
  littlegoose:     "13334300",
  lowergranite:    "13342500",
  hellscanyon:     "13290450",
  dworshak:        "13341050",
};

const FLOW_ONLY_GAUGES = new Set([
  "mcnary", "priestrapids", "wells",
  "hellscanyon", "chiefjoseph", "grandcoulee", "dworshak",
]);

// ============================================================
// SEASONAL MOCK FALLBACKS
// Updated for late May / early June conditions
// ============================================================
const MOCK_TEMPS: Record<string, number> = {
  bonneville: 58, dalles: 58, johnday: 60, mcnary: 59,
  priestrapids: 56, wanapum: 54, rockisland: 53, rockyreach: 52,
  wells: 52, chiefjoseph: 51, grandcoulee: 50,
  iceharbor: 55, lowermonumental: 55, littlegoose: 54,
  lowergranite: 54, hellscanyon: 56, dworshak: 50,
};

const MOCK_FLOWS: Record<string, number> = {
  bonneville: 185, dalles: 182, johnday: 178, mcnary: 165,
  priestrapids: 155, wanapum: 152, rockisland: 148, rockyreach: 144,
  wells: 140, chiefjoseph: 136, grandcoulee: 130,
  iceharbor: 50, lowermonumental: 50, littlegoose: 49,
  lowergranite: 47, hellscanyon: 38, dworshak: 12,
};

// Basin summary column → damId
const BASIN_COL_TO_DAM: Record<string, string> = {
  "Bonneville":        "bonneville",
  "The Dalles":        "dalles",
  "John Day":          "johnday",
  "McNary":            "mcnary",
  "Ice Harbor":        "iceharbor",
  "Lower Monumental":  "lowermonumental",
  "Little Goose":      "littlegoose",
  "Lower Granite":     "lowergranite",
  "Priest Rapids":     "priestrapids",
  "Wanapum":           "wanapum",
  "Rock Island":       "rockisland",
  "Rocky Reach":       "rockyreach",
  "Wells":             "wells",
};

const BASIN_SPECIES_MAP: Record<string, string> = {
  "Chinook":             "chinook",
  "Jack Chinook":        "chinookJack",
  "Steelhead":           "steelhead",
  "Wild Steelhead":      "steelheadWild",
  "Sockeye":             "sockeye",
  "Coho":                "coho",
  "Jack Coho":           "cohoJack",
  "Shad":                "shad",
  "Lamprey (daytime)":   "lamprey",
  "Lamprey (Nighttime)": "lampreyNight",
  "Lamprey (LPS)":       "lampreyLPS",
  "Chum":                "chum",
  "Pink":                "pink",
  "Bull Trout":          "bullTrout",
};

// ============================================================
// TYPES
// ============================================================
export interface DailyRow {
  date: string;        // YYYY-MM-DD
  // The "Chin" column is a single count whose run is told apart only by
  // the separate "Chinook Run" column (Sp/Su/Fa) on the same row — DART
  // does not report concurrent per-run counts. Split here at parse time
  // so every downstream consumer gets the run that was actually reported,
  // instead of every day's count defaulting into one bucket.
  chinookSpring: number;
  chinookSummer: number;
  chinookFall: number;
  steelhead: number;   // Stlhd column
  steelheadWild: number;
  sockeye: number;
  coho: number;
  shad: number;
  lamprey: number;     // LmpryDay + LmpryNight + LmpryLPS
  chum: number;
  pink: number;
  tempC: number | null;
  tempF: number | null;
  total: number;
  hasData: boolean;    // false = row is a not-yet-reported placeholder (all counts blank)
}

export interface DayCount {
  date: string;
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
  total: number;
}

export interface Dam3DayCounts {
  damId: string;
  days: DayCount[];
  max3day: {
    chinookSpring: number; chinookSummer: number; chinookFall: number;
    coho: number; sockeye: number; steelhead: number; shad: number;
    lamprey: number; chum: number; pink: number; total: number;
  };
  today: DayCount | null;
  isRealData: boolean;
  dataThrough: string;
  baromPres: number | null;
  gasPct: number | null;
  outflowKcfs: number | null;
  spillPct: number | null;
  dartTempF: number | null;
}

// ============================================================
// PARSE adult_daily.php CSV
//
// IMPORTANT: the column layout is NOT identical across projects.
// Bonneville includes LmpryDay/LmpryNight/LmpryCombined/LmpryLPS
// (19 columns) while upriver projects like Priest Rapids and
// Wanapum only report LmpryDay (16 columns) — no LmpryNight/
// LmpryCombined/LmpryLPS at all. Reading columns by fixed index
// silently misaligns Chum/Pink/TempC for those projects. Column
// positions are therefore resolved from the header row on every
// fetch instead of being hardcoded.
// ============================================================
function parseDailyCSV(text: string): DailyRow[] {
  const rows: DailyRow[] = [];

  // Check if we got HTML instead of CSV (blocked)
  if (text.trimStart().startsWith("<")) {
    console.log("adult_daily: got HTML — blocked");
    return rows;
  }

  const lines = text.split("\n").map(l => l.trim());

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("Project,Date,")) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    console.log("adult_daily: no header row found");
    return rows;
  }

  const headerCols = lines[headerIdx].split(",").map(h => h.trim());
  const iOf = (name: string) => headerCols.indexOf(name);

  const iChinookRun = iOf("Chinook Run");
  const iChin       = iOf("Chin");
  const iStlhd      = iOf("Stlhd");
  const iWStlhd     = iOf("WStlhd");
  const iSock       = iOf("Sock");
  const iCoho       = iOf("Coho");
  const iShad       = iOf("Shad");
  const iLmpryDay   = iOf("LmpryDay");
  const iLmpryNight = iOf("LmpryNight");
  const iLmpryLPS   = iOf("LmpryLPS");
  const iChum       = iOf("Chum");
  const iPink       = iOf("Pink");
  const iTempC      = iOf("TempC");

  const rawAt = (cols: string[], idx: number): string | undefined =>
    idx >= 0 ? cols[idx]?.trim() : undefined;

  const parseNum = (s: string | undefined): number => {
    if (!s || s === "" || s === "NA") return 0;
    const n = parseInt(s, 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  };

  const parseFloat2 = (s: string | undefined): number | null => {
    if (!s || s === "" || s === "NA") return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const cols = line.split(",");
    const dateRaw = cols[1]?.trim();
    if (!dateRaw?.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

    const chinookRunRaw = rawAt(cols, iChinookRun);
    const chinRaw       = rawAt(cols, iChin);
    const stlhdRaw      = rawAt(cols, iStlhd);
    const wstlhdRaw     = rawAt(cols, iWStlhd);
    const sockRaw       = rawAt(cols, iSock);
    const cohoRaw       = rawAt(cols, iCoho);
    const shadRaw       = rawAt(cols, iShad);
    const lmpryDayRaw   = rawAt(cols, iLmpryDay);
    const lmpryNightRaw = rawAt(cols, iLmpryNight);
    const lmpryLPSRaw   = rawAt(cols, iLmpryLPS);
    const chumRaw       = rawAt(cols, iChum);
    const pinkRaw       = rawAt(cols, iPink);

    // DART reports one Chinook count per day, tagged with which run it
    // belongs to in the separate "Chinook Run" column ("Sp"/"Su"/"Fa") —
    // it is NOT three concurrent counts. Route that day's count into the
    // matching bucket instead of always treating it as Spring. A handful
    // of stray winter fish sometimes post with a blank run label before
    // DART formally opens the spring window — those are conventionally
    // attributed to the oncoming spring run, same as DART's own reporting.
    const chinCount = parseNum(chinRaw);
    const chinookSpring = chinookRunRaw === "Su" || chinookRunRaw === "Fa" ? 0 : chinCount;
    const chinookSummer = chinookRunRaw === "Su" ? chinCount : 0;
    const chinookFall   = chinookRunRaw === "Fa" ? chinCount : 0;
    const steelhead     = parseNum(stlhdRaw);
    const steelheadWild = parseNum(wstlhdRaw);
    const sockeye       = parseNum(sockRaw);
    const coho          = parseNum(cohoRaw);
    const shad          = parseNum(shadRaw);
    const lmpryDay       = parseNum(lmpryDayRaw);
    const lmpryNight     = parseNum(lmpryNightRaw);
    const lmpryLPS       = parseNum(lmpryLPSRaw);
    const chum           = parseNum(chumRaw);
    const pink           = parseNum(pinkRaw);
    const lamprey        = lmpryDay + lmpryNight + lmpryLPS;

    const tempC = parseFloat2(rawAt(cols, iTempC));
    const tempF = tempC !== null ? Math.round(tempC * 9 / 5 + 32) : null;

    const total = chinookSpring + chinookSummer + chinookFall + steelhead + sockeye + coho + shad + lamprey + chum + pink;

    // A row is "reported" if at least one count column is non-blank.
    // DART often posts placeholder rows for the most recent 1-4 days
    // (all counts blank, sometimes only TempC present) before the
    // actual count is processed — those rows must not be treated as
    // "today's count = 0".
    const hasData = [
      chinRaw, stlhdRaw, wstlhdRaw, sockRaw, cohoRaw, shadRaw,
      lmpryDayRaw, lmpryNightRaw, lmpryLPSRaw, chumRaw, pinkRaw,
    ].some(v => v !== undefined && v !== "" && v !== "NA");

    rows.push({
      date: dateRaw, chinookSpring, chinookSummer, chinookFall, steelhead, steelheadWild,
      sockeye, coho, shad, lamprey, chum, pink,
      tempC, tempF, total, hasData,
    });
  }

  return rows;
}

// ============================================================
// FETCH adult_daily.php FOR ONE DAM
// Returns last 3 days of true daily counts + 3-day averages
// ============================================================
async function fetchDailyForDam(
  projectCode: string,
  damId: string,
  year: number
): Promise<{
  latest: DailyRow;
  last3: DailyRow[];
  avg3day: DailyRow;
  dataThrough: string;
  dartTempF: number | null;
} | null> {
  try {
    // NOTE: span=no with a narrow date window silently returns an EMPTY
    // response for some projects (confirmed for Rock Island / Rocky Reach —
    // likely because they lack the "Chinook Run" (Sp/Su/Fa) classification
    // that span=no's per-run query expects). span=yes with a full-year
    // range works uniformly across every project, so use it for all dams
    // rather than special-casing the ones known to break. The response is
    // larger (~10-14KB vs ~1KB) but is cached for an hour and hasData
    // filtering below still finds the correct most-recent reported day.
    const url = [
      "https://www.cbr.washington.edu/dart/cs/php/rpt/adult_daily.php",
      `?sc=1&outputFormat=csv&year=${year}&proj=${projectCode}`,
      `&span=yes&startdate=1%2F1&enddate=12%2F31`,
      `&syear=${year}&eyear=${year + 1}`,
    ].join("");

    console.log(`Fetching adult_daily for ${projectCode}...`);
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) {
      console.log(`adult_daily ${projectCode}: HTTP ${response.status}`);
      return null;
    }

    const text = await response.text();
    console.log(`adult_daily ${projectCode}: ${text.length} chars, starts: ${text.substring(0, 50).replace(/\n/g, "|")}`);

    const rows = parseDailyCSV(text);
    console.log(`adult_daily ${projectCode}: parsed ${rows.length} rows`);

    if (rows.length === 0) return null;

    // Some projects (e.g. Priest Rapids, Wanapum) post the most recent
    // 1-4 days as blank placeholders before counts are processed —
    // exclude those so "latest" reflects the last day actually reported,
    // not an unreported day that would otherwise look like a true zero.
    const reportedRows = rows.filter(r => r.hasData);
    if (reportedRows.length === 0) return null;

    // Get last 3 reported rows with actual data
    const last3   = reportedRows.slice(-3);
    const latest  = last3[last3.length - 1];

    // Compute 3-day average
    const avg = (key: keyof DailyRow): number => {
      const vals = last3.map(r => r[key] as number);
      return Math.round(vals.reduce((a, b) => a + b, 0) / last3.length);
    };

    const avg3day: DailyRow = {
      date:          latest.date,
      chinookSpring: avg("chinookSpring"),
      chinookSummer: avg("chinookSummer"),
      chinookFall:   avg("chinookFall"),
      steelhead:     avg("steelhead"),
      steelheadWild: avg("steelheadWild"),
      sockeye:       avg("sockeye"),
      coho:          avg("coho"),
      shad:          avg("shad"),
      lamprey:       avg("lamprey"),
      chum:          avg("chum"),
      pink:          avg("pink"),
      tempC:         null,
      tempF:         null,
      total:         avg("total"),
      hasData:       true,
    };

    console.log(`adult_daily ${projectCode}: latest=${latest.date} stlhd=${latest.steelhead} chinSp=${latest.chinookSpring} chinSu=${latest.chinookSummer} chinFa=${latest.chinookFall} avg3_stlhd=${avg3day.steelhead}`);

    return {
      latest,
      last3,
      avg3day,
      dataThrough: latest.date,
      dartTempF:   latest.tempF,
    };

  } catch (error) {
    console.error(`adult_daily fetch failed for ${projectCode}:`, error);
    return null;
  }
}

// ============================================================
// PARSE river_daily.php CSV
// Columns: Project,Date,Outflow (kcfs),Spill (kcfs),Spill Percent (%),
//          Inflow (kcfs),Temp (Scroll Case) (C),Temperature (C),
//          Barometric Pressure (mmHg),Dissolved Gas (mmHg),
//          Dissolved Gas Percent (%),Turbidity (ft),Elevation (ft)
// Col idx:  0      1    2               3            4
//           5             6                       7
//           8                          9                    10
//           11                12
// ============================================================
export interface RiverDailyRow {
  date: string;         // YYYY-MM-DD
  outflowKcfs: number | null;
  spillKcfs: number | null;
  spillPct: number | null;
  inflowKcfs: number | null;
  scrollTempC: number | null;
  scrollTempF: number | null;
  tempC: number | null;
  baromPres: number | null;
  gasMmHg: number | null;
  gasPct: number | null;
  turbidity: number | null;
  elevationFt: number | null;
}

function parseRiverDailyCSV(text: string): RiverDailyRow[] {
  const rows: RiverDailyRow[] = [];

  if (text.trimStart().startsWith("<")) {
    console.log("river_daily: got HTML — blocked");
    return rows;
  }

  const lines = text.split("\n").map(l => l.trim());

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("Project,Date,")) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    console.log("river_daily: no header row found");
    return rows;
  }

  const parseNumOrNull = (s: string | undefined): number | null => {
    if (!s || s.trim() === "" || s.trim() === "NA") return null;
    const n = parseFloat(s.trim());
    return isNaN(n) ? null : n;
  };

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.match(/^[A-Za-z].*,\d{4}-\d{2}-\d{2}/)) continue;

    const cols = line.split(",");
    if (cols.length < 13) continue;

    const dateRaw = cols[1]?.trim();
    if (!dateRaw?.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

    const outflowKcfs = parseNumOrNull(cols[2]);
    const spillKcfs    = parseNumOrNull(cols[3]);
    const spillPct     = parseNumOrNull(cols[4]);
    const inflowKcfs   = parseNumOrNull(cols[5]);
    const scrollTempC  = parseNumOrNull(cols[6]);
    const tempC        = parseNumOrNull(cols[7]);
    const baromPres    = parseNumOrNull(cols[8]);
    const gasMmHg       = parseNumOrNull(cols[9]);
    const gasPct        = parseNumOrNull(cols[10]);
    const turbidity     = parseNumOrNull(cols[11]);
    const elevationFt   = parseNumOrNull(cols[12]);

    const scrollTempF = scrollTempC !== null ? Math.round(scrollTempC * 9 / 5 + 32) : null;

    rows.push({
      date: dateRaw, outflowKcfs, spillKcfs, spillPct, inflowKcfs,
      scrollTempC, scrollTempF, tempC, baromPres, gasMmHg, gasPct,
      turbidity, elevationFt,
    });
  }

  return rows;
}

// ============================================================
// FETCH river_daily.php FOR ONE DAM
// Returns the most recent row (within the last 7 days) that
// actually has data — some rows come back with every
// environmental column blank while sensors are offline.
// ============================================================
async function fetchRiverDailyForDam(
  projectCode: string,
  damId: string,
  year: number
): Promise<RiverDailyRow | null> {
  try {
    const endDate   = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const startStr = `${startDate.getMonth() + 1}%2F${startDate.getDate()}`;
    const endStr   = `${endDate.getMonth() + 1}%2F${endDate.getDate()}`;

    const url = [
      "https://www.cbr.washington.edu/dart/cs/php/rpt/river_daily.php",
      `?sc=1&outputFormat=csv&year=${year}&proj=${projectCode}`,
      `&span=no&startdate=${startStr}&enddate=${endStr}`,
      `&run=&syear=${year}&eyear=${year}`,
    ].join("");

    console.log(`Fetching river_daily for ${projectCode}...`);
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) {
      console.log(`river_daily ${projectCode}: HTTP ${response.status}`);
      return null;
    }

    const text = await response.text();
    const rows = parseRiverDailyCSV(text);
    console.log(`river_daily ${projectCode}: parsed ${rows.length} rows`);

    if (rows.length === 0) return null;

    // Walk backwards from most recent day, skip rows where every
    // environmental field is blank, use the first row with data.
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const hasData = [
        r.outflowKcfs, r.spillPct, r.baromPres,
        r.gasPct, r.turbidity, r.scrollTempF,
      ].some(v => v !== null);
      if (hasData) return r;
    }

    return null;

  } catch (error) {
    console.error(`river_daily fetch failed for ${projectCode}:`, error);
    return null;
  }
}

// ============================================================
// FETCH river_daily.php HISTORY FOR ONE DAM
// Unlike fetchRiverDailyForDam (which returns only the latest
// reported row), this returns every row DART reports across the
// requested window — used to drive the Flow & Water Level graphs.
// ============================================================
export async function fetchRiverHistory(
  projectCode: string,
  days: number
): Promise<RiverDailyRow[]> {
  try {
    const year      = new Date().getFullYear();
    const endDate   = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startStr = `${startDate.getMonth() + 1}%2F${startDate.getDate()}`;
    const endStr   = `${endDate.getMonth() + 1}%2F${endDate.getDate()}`;

    const url = [
      "https://www.cbr.washington.edu/dart/cs/php/rpt/river_daily.php",
      `?sc=1&outputFormat=csv&year=${year}&proj=${projectCode}`,
      `&span=no&startdate=${startStr}&enddate=${endStr}`,
      `&run=&syear=${year}&eyear=${year}`,
    ].join("");

    console.log(`Fetching river_daily history for ${projectCode} (${days}d)...`);
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) {
      console.log(`river_daily history ${projectCode}: HTTP ${response.status}`);
      return [];
    }

    const text = await response.text();
    const rows = parseRiverDailyCSV(text);
    console.log(`river_daily history ${projectCode}: parsed ${rows.length} rows`);
    return rows;

  } catch (error) {
    console.error(`river_daily history fetch failed for ${projectCode}:`, error);
    return [];
  }
}

// ============================================================
// FETCH DART BASIN SUMMARY — YTD totals fallback
// ============================================================
async function fetchDARTBasinSummary(year: number): Promise<{
  counts: Map<string, Record<string, number>>;
  dataThrough: string;
}> {
  const counts = new Map<string, Record<string, number>>();
  let dataThrough = "";

  try {
    const url = `https://www.cbr.washington.edu/dart/cs/php/rpt/adult_basin_sum.php?sc=1&outputFormat=csv&year=${year}`;
    console.log("Fetching basin summary...");
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return { counts, dataThrough };

    const text = await response.text();
    if (text.trimStart().startsWith("<")) {
      console.log("Basin summary: blocked");
      return { counts, dataThrough };
    }

    const lines   = text.split("\n").map(l => l.trim()).filter(Boolean);
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));

    const colToDam = new Map<number, string>();
    for (let i = 0; i < headers.length; i++) {
      const damId = BASIN_COL_TO_DAM[headers[i]];
      if (damId) colToDam.set(i, damId);
    }

    for (const damId of Object.values(BASIN_COL_TO_DAM)) {
      counts.set(damId, {
        chinook: 0, steelhead: 0, sockeye: 0, coho: 0,
        shad: 0, lamprey: 0, lampreyNight: 0, lampreyLPS: 0,
        chum: 0, pink: 0,
      });
    }

    for (const line of lines) {
      const m = line.match(/Data for .+ - (\d{2}\/\d{2})/);
      if (m) { dataThrough = m[1]; break; }
    }

    const parseNum = (s: string): number => {
      const n = parseInt((s ?? "").replace(/,/g, "").trim(), 10);
      return isNaN(n) ? 0 : Math.max(0, n);
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.match(/^\d{4},/)) continue;
      const cols    = line.split(",");
      const species = cols[1]?.trim().replace(/"/g, "");
      const field   = BASIN_SPECIES_MAP[species];
      if (!field) continue;
      colToDam.forEach((damId, colIdx) => {
        const c = counts.get(damId);
        if (c) c[field] = parseNum(cols[colIdx] ?? "0");
      });
    }

    const bon = counts.get("bonneville");
    console.log(`Basin summary: BON stlhd YTD=${bon?.steelhead}, through=${dataThrough}`);

  } catch (error) {
    console.error("Basin summary failed:", error);
  }

  return { counts, dataThrough };
}

// ============================================================
// USGS WATER TEMP + FLOW
// ============================================================
export async function fetchUSGSConditions(gaugeId: string): Promise<{
  waterTempF: number | null;
  flowKcfs: number | null;
} | null> {
  try {
    const url = [
      "https://waterservices.usgs.gov/nwis/iv/",
      "?sites=" + gaugeId,
      "&parameterCd=00010,00060",
      "&format=json",
      "&siteStatus=all",
    ].join("");
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const data   = await response.json();
    const series = data?.value?.timeSeries;
    if (!series?.length) return null;
    let waterTempC: number | null = null;
    let flowCfs:    number | null = null;
    for (const s of series) {
      const param = s.variable?.variableCode?.[0]?.value;
      const val   = s.values?.[0]?.value?.[0]?.value;
      if (param === "00010" && val !== undefined) {
        const n = parseFloat(val);
        if (!isNaN(n) && n >= 1 && n <= 25) waterTempC = n;
      }
      if (param === "00060" && val !== undefined) {
        const n = parseFloat(val);
        if (!isNaN(n) && n > 0) flowCfs = n;
      }
    }
    const waterTempF = waterTempC !== null ? Math.round(waterTempC * 9 / 5 + 32) : null;
    const flowKcfs   = flowCfs   !== null ? Math.round(flowCfs / 1000) : null;
    if (waterTempF === null && flowKcfs === null) return null;
    return { waterTempF, flowKcfs };
  } catch { return null; }
}

// ============================================================
// WEATHER FORECAST
// ============================================================
export async function fetchWeatherForecast(): Promise<number[] | null> {
  try {
    const url = [
      "https://api.open-meteo.com/v1/forecast",
      "?latitude=45.64&longitude=-121.94",
      "&daily=temperature_2m_max",
      "&temperature_unit=fahrenheit",
      "&forecast_days=7",
      "&timezone=America%2FLos_Angeles",
    ].join("");
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.daily?.temperature_2m_max ?? null;
  } catch { return null; }
}

// Backward compat
export async function fetchDART3DayCounts(
  projectCode: string,
  damId: string
): Promise<Dam3DayCounts | null> {
  return null;
}

// ============================================================
// FETCH ALL CONDITIONS — main entry point
// Called by /api/conditions
// ============================================================
export async function fetchAllConditions() {

  const ALL_DAM_IDS = [
    "bonneville", "dalles", "johnday", "mcnary",
    "priestrapids", "wanapum", "rockisland", "rockyreach",
    "wells", "chiefjoseph", "grandcoulee",
    "iceharbor", "lowermonumental", "littlegoose",
    "lowergranite", "hellscanyon", "dworshak",
  ];

  const dartDamIds = Object.keys(DART_PROJECTS);
  const year       = new Date().getFullYear();

  try {
    const uniqueGauges = [...new Set(Object.values(USGS_GAUGES))];

    // Run all fetches in parallel
    const [gaugeResults, basinResult, dailyResults, riverDailyResults] = await Promise.all([
      Promise.all(uniqueGauges.map(async gaugeId => ({
        gaugeId,
        data: await fetchUSGSConditions(gaugeId),
      }))),
      fetchDARTBasinSummary(year),
      Promise.all(dartDamIds.map(async damId => ({
        damId,
        daily: await fetchDailyForDam(DART_PROJECTS[damId], damId, year),
      }))),
      Promise.all(dartDamIds.map(async damId => ({
        damId,
        river: await fetchRiverDailyForDam(DART_PROJECTS[damId], damId, year),
      }))),
    ]);

    // Build gauge lookup
    const gaugeMap: Record<string, { waterTempF: number | null; flowKcfs: number | null }> = {};
    for (const r of gaugeResults) {
      if (r.data) gaugeMap[r.gaugeId] = r.data;
    }

    // Build daily lookup
    const dailyMap: Record<string, NonNullable<Awaited<ReturnType<typeof fetchDailyForDam>>>> = {};
    for (const r of dailyResults) {
      if (r.daily) dailyMap[r.damId] = r.daily;
    }

    // Build river_daily lookup (environmental data)
    const riverDailyMap: Record<string, RiverDailyRow> = {};
    for (const r of riverDailyResults) {
      if (r.river) riverDailyMap[r.damId] = r.river;
    }

    const { counts: basinCounts, dataThrough: basinThrough } = basinResult;
    const dailyWorked = Object.keys(dailyMap).length > 0;
    const basinWorked = basinCounts.size > 0;

    console.log(`Results: daily=${dailyWorked}(${Object.keys(dailyMap).length} dams) basin=${basinWorked}`);

    const conditions = ALL_DAM_IDS.map(damId => {
      const gaugeId  = USGS_GAUGES[damId];
      const usgsData = gaugeId ? gaugeMap[gaugeId] : null;
      const daily    = dailyMap[damId];
      const basin    = basinCounts.get(damId);
      const river    = riverDailyMap[damId];

      // Water temp — prefer river_daily scroll case temp, then DART daily TempC, then USGS, then mock
      const scrollTemp = river?.scrollTempF;
      const dartTemp = daily?.dartTempF;
      const usgsTemp = FLOW_ONLY_GAUGES.has(damId) ? null : usgsData?.waterTempF;
      const waterTempF =
        (scrollTemp != null && scrollTemp >= 34 && scrollTemp <= 80) ? scrollTemp :
        (dartTemp != null && dartTemp >= 34 && dartTemp <= 80) ? dartTemp :
        (usgsTemp != null && usgsTemp >= 34 && usgsTemp <= 80) ? usgsTemp :
        (MOCK_TEMPS[damId] ?? 55);

      // Flow — USGS, reject implausible
      const usgsFlow = usgsData?.flowKcfs;
      const isSnake  = ["iceharbor","lowermonumental","littlegoose","lowergranite","hellscanyon","dworshak"].includes(damId);
      const flowKcfs = (usgsFlow != null && usgsFlow >= (isSnake ? 5 : 10))
        ? usgsFlow : (MOCK_FLOWS[damId] ?? 130);

      // ── DAILY COUNTS (true daily from adult_daily.php) ──
      // If daily data available use it; otherwise fall back to basin YTD
      const hasDailyData = !!daily;
      const latestDate   = daily?.dataThrough ?? basinThrough ?? "";

      const dailyChinookSpring = daily?.latest.chinookSpring ?? 0;
      const dailyChinookSummer = daily?.latest.chinookSummer ?? 0;
      const dailyChinookFall   = daily?.latest.chinookFall   ?? 0;
      const dailySteelhead  = daily?.latest.steelhead ?? 0;
      const dailyCoho       = daily?.latest.coho      ?? 0;
      const dailySockeye    = daily?.latest.sockeye   ?? 0;
      const dailyShad       = daily?.latest.shad      ?? 0;
      const dailyLamprey    = daily?.latest.lamprey   ?? 0;
      const dailyChum       = daily?.latest.chum      ?? 0;
      const dailyPink       = daily?.latest.pink      ?? 0;
      const dailyTotal      = dailyChinookSpring + dailyChinookSummer + dailyChinookFall +
                              dailySteelhead + dailyCoho +
                              dailySockeye + dailyShad + dailyLamprey +
                              dailyChum + dailyPink;

      // ── 3-DAY AVERAGES ──
      const avg3ChinookSpring = daily?.avg3day.chinookSpring ?? 0;
      const avg3ChinookSummer = daily?.avg3day.chinookSummer ?? 0;
      const avg3ChinookFall   = daily?.avg3day.chinookFall   ?? 0;
      const avg3Steelhead  = daily?.avg3day.steelhead ?? 0;
      const avg3Coho       = daily?.avg3day.coho      ?? 0;
      const avg3Sockeye    = daily?.avg3day.sockeye   ?? 0;
      const avg3Shad       = daily?.avg3day.shad      ?? 0;
      const avg3Lamprey    = daily?.avg3day.lamprey   ?? 0;
      const avg3Chum       = daily?.avg3day.chum      ?? 0;
      const avg3Pink       = daily?.avg3day.pink      ?? 0;
      const avg3Total      = avg3ChinookSpring + avg3ChinookSummer + avg3ChinookFall +
                             avg3Steelhead + avg3Coho +
                             avg3Sockeye + avg3Shad + avg3Lamprey +
                             avg3Chum + avg3Pink;

      // ── YTD TOTALS (from basin summary) ──
      const ytdChinook    = basin?.chinook   ?? 0;
      const ytdSteelhead  = basin?.steelhead ?? 0;
      const ytdCoho       = basin?.coho      ?? 0;
      const ytdSockeye    = basin?.sockeye   ?? 0;
      const ytdShad       = basin?.shad      ?? 0;
      const ytdLamprey    = (basin?.lamprey ?? 0) + (basin?.lampreyNight ?? 0) + (basin?.lampreyLPS ?? 0);
      const ytdChum       = basin?.chum      ?? 0;
      const ytdPink       = basin?.pink      ?? 0;
      const ytdTotal      = ytdChinook + ytdSteelhead + ytdCoho + ytdSockeye +
                            ytdShad + ytdLamprey + ytdChum + ytdPink;

      const hasRealTemp = (scrollTemp != null && scrollTemp >= 34) || (dartTemp != null && dartTemp >= 34) || (usgsTemp != null && usgsTemp >= 34);
      const isRealData  = hasRealTemp || hasDailyData || basinWorked || !!river;

      return {
        damId,
        waterTempF,
        flowKcfs,
        isRealData,
        dataThrough:   latestDate,
        hasLadderData: hasDailyData,  // true = daily counts available
        hasBasinData:  !!basin,

        // Daily counts — TRUE daily from adult_daily.php
        chinookSpring: dailyChinookSpring,
        chinookSummer: dailyChinookSummer,
        chinookFall:   dailyChinookFall,
        coho:          dailyCoho,
        sockeye:       dailySockeye,
        steelhead:     dailySteelhead,
        shad:          dailyShad,
        lamprey:       dailyLamprey,
        chum:          dailyChum,
        pink:          dailyPink,
        fishCount:     dailyTotal,

        // 3-day averages
        avg3day_chinookSpring: avg3ChinookSpring,
        avg3day_chinookSummer: avg3ChinookSummer,
        avg3day_chinookFall:   avg3ChinookFall,
        avg3day_coho:          avg3Coho,
        avg3day_sockeye:       avg3Sockeye,
        avg3day_steelhead:     avg3Steelhead,
        avg3day_shad:          avg3Shad,
        avg3day_lamprey:       avg3Lamprey,
        avg3day_chum:          avg3Chum,
        avg3day_pink:          avg3Pink,
        avg3day_total:         avg3Total,

        // Keep max3day as alias for avg3day (backward compat)
        max3day_chinookSpring: avg3ChinookSpring,
        max3day_chinookSummer: avg3ChinookSummer,
        max3day_chinookFall:   avg3ChinookFall,
        max3day_coho:          avg3Coho,
        max3day_sockeye:       avg3Sockeye,
        max3day_steelhead:     avg3Steelhead,
        max3day_shad:          avg3Shad,
        max3day_lamprey:       avg3Lamprey,
        max3day_chum:          avg3Chum,
        max3day_pink:          avg3Pink,

        // YTD season totals
        ytd_chinook:   ytdChinook,
        ytd_steelhead: ytdSteelhead,
        ytd_coho:      ytdCoho,
        ytd_sockeye:   ytdSockeye,
        ytd_shad:      ytdShad,
        ytd_lamprey:   ytdLamprey,
        ytd_chum:      ytdChum,
        ytd_pink:      ytdPink,
        ytd_total:     ytdTotal,

        // ── ENVIRONMENTAL DATA (from river_daily.php) ──
        baromPres:   river?.baromPres   ?? null,
        gasPct:      river?.gasPct      ?? null,
        spillPct:    river?.spillPct    ?? null,
        outflowKcfs: river?.outflowKcfs ?? null,
        turbidity:   river?.turbidity   ?? null,
        history:     [],
      };
    });

    return conditions;

  } catch (error) {
    console.error("fetchAllConditions failed:", error);
    return ALL_DAM_IDS.map(damId => ({
      damId,
      waterTempF:    MOCK_TEMPS[damId] ?? 55,
      flowKcfs:      MOCK_FLOWS[damId] ?? 130,
      isRealData:    false,
      dataThrough:   "",
      hasLadderData: false,
      hasBasinData:  false,
      chinookSpring: 0, chinookSummer: 0, chinookFall: 0,
      coho: 0, sockeye: 0, steelhead: 0, shad: 0,
      lamprey: 0, chum: 0, pink: 0, fishCount: 0,
      avg3day_chinookSpring: 0, avg3day_chinookSummer: 0, avg3day_chinookFall: 0,
      avg3day_coho: 0, avg3day_sockeye: 0, avg3day_steelhead: 0,
      avg3day_shad: 0, avg3day_lamprey: 0, avg3day_chum: 0,
      avg3day_pink: 0, avg3day_total: 0,
      max3day_chinookSpring: 0, max3day_chinookSummer: 0, max3day_chinookFall: 0,
      max3day_coho: 0, max3day_sockeye: 0, max3day_steelhead: 0,
      max3day_shad: 0, max3day_lamprey: 0, max3day_chum: 0, max3day_pink: 0,
      ytd_chinook: 0, ytd_steelhead: 0, ytd_coho: 0, ytd_sockeye: 0,
      ytd_shad: 0, ytd_lamprey: 0, ytd_chum: 0, ytd_pink: 0, ytd_total: 0,
      baromPres: null, gasPct: null, spillPct: null,
      outflowKcfs: null, turbidity: null, history: [],
    }));
  }
}
