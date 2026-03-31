import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!API_KEY || API_KEY === "placeholder") {
    return NextResponse.json({
      status: "no_api_key",
      note: "Set ANTHROPIC_API_KEY in Vercel environment variables to enable SITREP generation.",
    });
  }

  try {
    const body = await request.json();
    const { conflictData } = body;

    if (!conflictData || typeof conflictData !== "string" || conflictData.length > 12000) {
      return NextResponse.json({ status: "error", error: "Invalid or oversized conflict data" }, { status: 400 });
    }

    const systemPrompt = `You are a senior military intelligence analyst preparing a daily Situation Report (SITREP) for a conflict operations center called "palantir at home."

Your job is to synthesize raw conflict data into a structured, actionable briefing. Write in military briefing style — direct, factual, no hedging, no filler. Use military date-time formatting (e.g., "28 FEB 2026 / 0300Z"). Reference specific numbers from the data.

IMPORTANT RULES:
- State facts from the data. Do not speculate beyond what the data shows.
- When data sources disagree (e.g., casualty counts), present the range and note the sources.
- Flag anything that appears to be propaganda vs OSINT-verified.
- Identify patterns and trends the data reveals.
- End with specific things to watch in the next 24-48 hours.
- Keep it under 800 words. Dense, not padded.

FORMAT:
Use this exact structure with these exact headers:

DAILY SITREP — OPERATION EPIC FURY
[Current date] / [Day of war]
CLASSIFICATION: OPEN SOURCE

1. SITUATION OVERVIEW
[2-3 sentences on current state of the conflict]

2. SIGNIFICANT EVENTS (LAST 24H)
[Bullet list of major events with dates and sources]

3. KINETIC ACTIVITY
[Strike counts by side, new targets hit, intercept rates]

4. LEADERSHIP STATUS
[Any changes to leadership tracker — kills, succession, movements]

5. ENERGY & ECONOMIC
[Oil prices, infrastructure damage, economic indicators]

6. THEATER STATUS
a. IRAN — [status]
b. ISRAEL — [status]
c. LEBANON — [status]
d. GULF STATES — [status]
e. IRAQ — [status]
f. YEMEN/RED SEA — [status]

7. CASUALTY UPDATE
[Latest figures by source with ranges]

8. INFORMATION WAR
[Key propaganda claims vs OSINT reality]

9. ASSESSMENT
[1-2 paragraphs: What does the data tell us? What's the trajectory?]

10. WATCH LIST (NEXT 24-48H)
[3-5 specific things to monitor]

---
PREPARED BY: palantir at home AI ANALYST
SOURCE: Multi-source OSINT aggregation`;

    const conflictDay = Math.floor((Date.now() - new Date("2026-02-28").getTime()) / 86400000);

    const userMessage = `Generate today's SITREP based on this conflict data:\n\n${conflictData}\n\nToday's date is ${new Date().toISOString().split("T")[0]}. The war started on 2026-02-28 (Operation Epic Fury / Operation Roaring Lion). We are on Day ${conflictDay} of the conflict.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ status: "api_error", code: response.status, error: "AI service unavailable" });
    }

    const data = await response.json();
    const sitrep = data.content?.[0]?.text || "No response generated.";

    return NextResponse.json({
      status: "ok",
      sitrep,
      timestamp: new Date().toISOString(),
      model: "claude-sonnet-4-20250514",
    });
  } catch {
    return NextResponse.json({ status: "error", error: "Failed to generate SITREP" });
  }
}
