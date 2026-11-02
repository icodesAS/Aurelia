import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai/gemini";
import { conciergeSchema } from "@/lib/ai/schemas";
import { parseQueryFallback } from "@/lib/ai/fallbacks";
import { Filters } from "@/lib/search";
import { clamp } from "@/lib/format";

export const maxDuration = 30;

export async function POST(req: Request) {
  let query = "";
  try {
    const body = await req.json();
    if (typeof body.query === "string") {
      query = body.query.trim().slice(0, 300);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const fallback = parseQueryFallback(query);

  const prompt = `You turn a renter's sentence into search filters for a rental app in the Chandigarh tricity area of India (Rajpura, Zirakpur, Mohali, Chandigarh, Panchkula).
Rules:
- Extract ONLY what the sentence says. If something is not mentioned, use null, an empty list, or "unspecified". Never guess.
- Prices are monthly rent in Indian rupees. "18k" = 18000. "1 lakh" = 100000.
- "2BHK" / "2 bhk" / "two bedroom" -> bhk = 2.
- "near campus", "near college", "near university", "near Chitkara" -> nearLandmark = "campus".
- City or area names go into areaKeywords in lowercase (for example "rajpura", "mohali"). Do not put "campus" there.
- quiet / peaceful / calm / study-friendly -> vibe "quiet". lively / social / party / fun -> vibe "lively". relaxed but not loud -> "balanced".
- vegetarian / veg / pure veg / veg roommates -> foodRule "veg_only". Otherwise "unspecified".
- girls / women / ladies -> suitableFor "women_only". boys / men / gents -> "men_only". Otherwise "unspecified".
- own room / private room -> roomType "private_room". sharing / shared -> "shared_room". whole flat / entire flat -> "entire_flat".
- assistantMessage: ONE sentence, at most 25 words, restating what the person wants. Do not claim any results exist.

Sentence: "${query}"`;

  try {
    const raw = await generateJSON<{
      assistantMessage?: string;
      filters?: Partial<Filters>;
    }>({
      input: prompt,
      schema: conciergeSchema,
    });

    const f = raw.filters ?? {};
    const areaKeywords = Array.isArray(f.areaKeywords)
      ? Array.from(
          new Set(
            f.areaKeywords
              .map((k) => String(k).toLowerCase().trim())
              .filter((k) => k && k !== "campus")
          )
        ).slice(0, 4)
      : fallback.filters.areaKeywords;

    const nearLandmark =
      typeof f.nearLandmark === "string" && f.nearLandmark.trim()
        ? f.nearLandmark.trim().toLowerCase()
        : null;

    const maxRent =
      typeof f.maxRent === "number" && !Number.isNaN(f.maxRent)
        ? clamp(Math.round(f.maxRent), 1000, 200000)
        : null;

    const bhk =
      typeof f.bhk === "number" && !Number.isNaN(f.bhk)
        ? clamp(Math.round(f.bhk), 1, 6)
        : null;

    const roomType =
      f.roomType &&
      ["private_room", "shared_room", "entire_flat", "unspecified"].includes(f.roomType)
        ? f.roomType
        : "unspecified";

    const furnished = typeof f.furnished === "boolean" ? f.furnished : null;

    const foodRule =
      f.foodRule && ["veg_only", "any", "unspecified"].includes(f.foodRule)
        ? f.foodRule
        : "unspecified";

    const vibe =
      f.vibe && ["quiet", "balanced", "lively", "unspecified"].includes(f.vibe)
        ? f.vibe
        : "unspecified";

    const suitableFor =
      f.suitableFor &&
      ["any", "women_only", "men_only", "unspecified"].includes(f.suitableFor)
        ? f.suitableFor
        : "unspecified";

    const assistantMessage =
      raw.assistantMessage && raw.assistantMessage.trim()
        ? raw.assistantMessage.trim().slice(0, 200)
        : "Here is what I found for you.";

    return NextResponse.json({
      ok: true,
      source: "gemini",
      data: {
        assistantMessage,
        filters: {
          areaKeywords,
          nearLandmark,
          maxRent,
          bhk,
          roomType,
          furnished,
          foodRule,
          vibe,
          suitableFor,
        },
      },
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "fallback",
      data: fallback,
    });
  }
}
