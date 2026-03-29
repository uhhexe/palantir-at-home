import { NextResponse } from "next/server";

const RSS_FEEDS = [
  "https://www.ukrinform.net/rss/block-lastnews",
  "https://www.pravda.com.ua/eng/rss/",
  "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
];

const CONFLICT_KEYWORDS = [
  "ukraine", "kyiv", "donetsk", "kharkiv", "crimea", "zelenskyy", "frontline",
  "drone", "missile", "russia", "putin", "kursk", "bakhmut", "avdiivka",
  "kherson", "zaporizhzhia", "odesa", "dnipro", "f-16", "black sea",
  "artillery", "wagner", "mobilization", "nuclear",
];

interface NewsItem {
  title: string;
  link: string;
  date: string;
  description: string;
  source: string;
}

function parseRssXml(xml: string, sourceUrl: string): NewsItem[] {
  const items: NewsItem[] = [];
  const sourceName = new URL(sourceUrl).hostname.replace("www.", "").split(".")[0].toUpperCase();
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = content.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]
      ?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "";
    const link = content.match(/<link[^>]*href="([^"]*)"/)?.[ 1]
      || content.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || "";
    const pubDate = content.match(/<(?:pubDate|published|updated)>([\s\S]*?)<\/(?:pubDate|published|updated)>/)?.[1]?.trim() || "";
    const desc = content.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1]
      ?.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim() || "";
    const combined = `${title} ${desc}`.toLowerCase();
    if (CONFLICT_KEYWORDS.some((k) => combined.includes(k))) {
      items.push({ title, link, date: pubDate, description: desc.substring(0, 200), source: sourceName });
    }
  }
  return items;
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      RSS_FEEDS.map(async (url) => {
        const res = await fetch(url, { next: { revalidate: 600 } });
        const text = await res.text();
        return { url, xml: text };
      })
    );
    const items: NewsItem[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        items.push(...parseRssXml(result.value.xml, result.value.url));
      }
    }
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const seen = new Set<string>();
    const unique = items.filter((item) => {
      const key = item.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 50);
    return NextResponse.json(unique, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
