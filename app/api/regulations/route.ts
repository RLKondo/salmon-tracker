// ============================================================
// app/api/regulations/route.ts
//
// Fetches the WDFW Emergency Rules RSS feed, filters for items
// relevant to Columbia/Snake River salmon & steelhead, and
// returns them as structured JSON for the Season Updates page.
// ============================================================

import { NextResponse } from "next/server";

const RSS_URL = "https://wdfw.wa.gov/fishing/regulations/emergency-rules/rss";

// Only surface rule updates relevant to Columbia/Snake River salmon & steelhead
const TOPIC_KEYWORDS = [
  "salmon", "steelhead", "chinook", "coho", "sockeye",
  "columbia", "snake", "bonneville", "mcnary", "priest rapids",
  "lower granite", "wenatchee", "klickitat", "yakima", "hanford",
  "chelan", "okanogan", "methow",
];

const RED_KEYWORDS    = ["closed", "closure", "reduced", "limit reduced", "emergency closure"];
const GREEN_KEYWORDS  = ["opens", "opening", "additional opportunity", "expanded"];
const YELLOW_KEYWORDS = ["modified", "change", "adjusted", "extended"];

export interface RegulationItem {
  guid: string;
  title: string;
  link: string;
  description: string;
  effectiveDate: string | null;
  pubDate: string;   // ISO
  daysAgo: number;
  category: "red" | "green" | "yellow";
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&amp;/g, "&");
}

function stripHtml(html: string): string {
  // WDFW's feed sometimes double-encodes entities (e.g. "&amp;nbsp;"),
  // so decode twice to catch both single- and double-encoded cases.
  return decodeEntities(decodeEntities(html))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
}

// 2-3 sentence preview, hard-capped so cards stay a reasonable size
function summarize(text: string, maxSentences = 3, maxLen = 320): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  let summary = sentences.slice(0, maxSentences).join(" ").trim();
  if (summary.length > maxLen) summary = summary.slice(0, maxLen).trim() + "…";
  return summary;
}

// Best-effort extraction of the "Effective date(s): ..." phrase WDFW
// includes near the top of most items. Not every item has one in a
// clean extractable form, so this can return null.
function extractEffective(text: string): string | null {
  const m = text.match(/Effective dates?:?\s*(.+?)(?:\s*Species affected|\s*Location|\s*Reason for action|$)/i);
  if (!m) return null;
  let eff = m[1].trim().replace(/\s+/g, " ");
  if (!eff) return null;
  if (eff.length > 140) eff = eff.slice(0, 140).trim() + "…";
  return eff;
}

function classify(text: string): "red" | "green" | "yellow" {
  const lower = text.toLowerCase();
  if (RED_KEYWORDS.some(k => lower.includes(k)))    return "red";
  if (GREEN_KEYWORDS.some(k => lower.includes(k)))  return "green";
  if (YELLOW_KEYWORDS.some(k => lower.includes(k))) return "yellow";
  return "yellow";
}

function matchesTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return TOPIC_KEYWORDS.some(k => lower.includes(k));
}

function parseItems(xml: string): RegulationItem[] {
  const items: RegulationItem[] = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  for (const block of itemBlocks) {
    const titleMatch   = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch    = block.match(/<link>([\s\S]*?)<\/link>/);
    const descMatch    = block.match(/<description>([\s\S]*?)<\/description>/);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const guidMatch    = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);

    if (!titleMatch || !linkMatch) continue;

    const rawTitle  = decodeEntities(stripCdata(titleMatch[1]));
    const link      = decodeEntities(stripCdata(linkMatch[1]));
    const descHtml  = descMatch ? stripCdata(descMatch[1]) : "";
    const descText  = stripHtml(descHtml);
    const combined  = `${rawTitle} ${descText}`;

    // Classify using only the title + lead paragraph ("Action: ...").
    // WDFW descriptions almost always end with a boilerplate disclaimer
    // ("All year-round closure areas ... apply") that would otherwise
    // make nearly everything misclassify as a closure.
    const leadText = `${rawTitle} ${descText.slice(0, 400)}`;

    if (!matchesTopic(combined)) continue;

    const pubDateRaw = pubDateMatch ? pubDateMatch[1].trim() : "";
    const parsed      = pubDateRaw ? new Date(pubDateRaw) : new Date();
    const pubDate     = isNaN(parsed.getTime()) ? new Date() : parsed;
    const daysAgo      = Math.max(0, Math.floor((Date.now() - pubDate.getTime()) / 86400000));

    items.push({
      guid:          guidMatch ? stripCdata(guidMatch[1]) : link,
      title:         rawTitle,
      link,
      description:   summarize(descText),
      effectiveDate: extractEffective(descText.slice(0, 600)),
      pubDate:       pubDate.toISOString(),
      daysAgo,
      category:      classify(leadText),
    });
  }

  // Most recent first
  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return items;
}

export async function GET() {
  try {
    const res = await fetch(RSS_URL, { next: { revalidate: 7200 } });

    if (!res.ok) {
      return NextResponse.json({
        items: [],
        fetchedAt: new Date().toISOString(),
        ok: false,
        error: `WDFW RSS returned HTTP ${res.status}`,
      });
    }

    const xml = await res.text();
    const items = parseItems(xml);

    return NextResponse.json({
      items,
      fetchedAt: new Date().toISOString(),
      ok: true,
    });

  } catch (error) {
    console.error("regulations route error:", error);
    return NextResponse.json({
      items: [],
      fetchedAt: new Date().toISOString(),
      ok: false,
      error: "Failed to reach WDFW RSS feed",
    });
  }
}
