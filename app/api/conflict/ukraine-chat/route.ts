import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadJson(filename: string) {
  const p = join(process.cwd(), "public", "data", "ukraine", filename);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf-8"));
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 });
  }

  const { messages } = await req.json();

  const equipment = loadJson("equipment-losses.json");
  const cities = loadJson("cities.json");
  const bases = loadJson("bases.json");

  let newsContext = "";
  try {
    const newsRes = await fetch(new URL("/api/conflict/ukraine-news", req.url).toString());
    const news = await newsRes.json();
    if (Array.isArray(news)) {
      newsContext = news.slice(0, 10).map((n: any) => `- ${n.title} (${n.source})`).join("\n");
    }
  } catch {}

  const systemPrompt = `You are a military intelligence analyst briefing on the Russia-Ukraine war.
War started: February 24, 2022. Now in year 4+ of fighting.

CURRENT SITUATION:
- Frontline mostly in Donbas (Donetsk/Luhansk oblasts), with Russia making slow gains
- Crimea under increasing Ukrainian drone/missile strikes, Black Sea Fleet severely degraded
- Ukraine using F-16s, long-range drones hitting deep into Russia (Engels, Saratov, Moscow region)
- Mass drone warfare on both sides — 200K+ Russian drones lost
- Zaporizhzhia NPP occupied by Russia, international concern
- Bakhmut fell May 2023, Avdiivka fell February 2024
- Kherson liberated November 2022 but under constant shelling
- Ukraine conducting operations in Kursk Oblast (Russia)

RUSSIAN LOSSES (Ukrainian General Staff):
${equipment ? JSON.stringify(equipment.russia, null, 2) : "Data unavailable"}

KEY CITIES:
${cities ? cities.map((c: any) => `${c.name}: ${c.control} — ${c.status}`).join("\n") : "Data unavailable"}

MILITARY INSTALLATIONS:
${bases ? bases.map((b: any) => `${b.name} (${b.side}) — ${b.notes}`).join("\n") : "Data unavailable"}

RECENT NEWS:
${newsContext || "No recent news loaded"}

ENERGY WAR:
- Russia: 1,900+ attacks on Ukrainian energy infrastructure. Winter 2025-26: 34,000 strikes in 90 days (19K drones, 14K guided bombs, 700 missiles).
- Ukraine energy system meeting only 60% of needs. National energy emergency declared.
- Ukraine: systematically targeting Russian refineries with drone swarms — Afipsky, Tikhoretsk, Labinsk, Kavkaz, Slavyansk, Ilsky, Moscow fuel depots.
- Both sides using energy as a strategic weapon of attrition.

Respond concisely in a military briefing style. Use facts from the data above. Format with monospace styling where appropriate.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({ content: data.content[0]?.text || "" });
}
