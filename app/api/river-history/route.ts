// ============================================================
// app/api/river-history/route.ts
//
// Multi-day river_daily.php history for one DART project — powers
// the Flow & Water Level graphs on the FishFinder page.
// Usage: /api/river-history?proj=BON&days=3
// ============================================================

import { NextResponse } from "next/server";
import { fetchRiverHistory } from "../../../lib/fetchData";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const proj      = searchParams.get("proj");
    const daysParam = searchParams.get("days");
    const days      = daysParam ? parseInt(daysParam, 10) : 3;

    if (!proj) {
      return NextResponse.json({ error: "Missing proj parameter" }, { status: 400 });
    }

    const rows = await fetchRiverHistory(proj, Number.isFinite(days) && days > 0 ? days : 3);
    const reported = rows.filter(r => r.outflowKcfs !== null || r.elevationFt !== null);
    const dataThrough = reported.length > 0 ? reported[reported.length - 1].date : "";

    return NextResponse.json({
      proj,
      rows,
      dataThrough,
      isRealData: reported.length > 0,
      fetchedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("river-history API error:", error);
    return NextResponse.json({ error: "Failed to fetch river history" }, { status: 500 });
  }
}
