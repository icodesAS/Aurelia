import { NextResponse } from "next/server";
import { generateJSON, GeminiInput } from "@/lib/ai/gemini";
import { listingWriterSchema } from "@/lib/ai/schemas";
import {
  listingWriterFallback,
  ListingWriterInput,
  ListingWriterOutput,
} from "@/lib/ai/fallbacks";
import { clamp, round100 } from "@/lib/format";

export const maxDuration = 30;

export async function POST(req: Request) {
  let inputData: ListingWriterInput;
  let benchmark: { median: number | null; count: number } = { median: null, count: 0 };
  let imageBase64: string | null = null;
  let imageMime = "image/jpeg";

  try {
    const body = await req.json();
    inputData = {
      city: String(body.city || "Rajpura").trim(),
      area: String(body.area || "Near Chitkara University").trim(),
      roomType: ["private_room", "shared_room", "entire_flat"].includes(body.roomType)
        ? body.roomType
        : "private_room",
      bhk: clamp(Number(body.bhk) || 2, 1, 5),
      furnished: Boolean(body.furnished),
      foodRule: body.foodRule === "veg_only" ? "veg_only" : "any",
      vibe: ["quiet", "balanced", "lively"].includes(body.vibe) ? body.vibe : "balanced",
      suitableFor: ["any", "women_only", "men_only"].includes(body.suitableFor)
        ? body.suitableFor
        : "any",
      askingRent: typeof body.askingRent === "number" ? body.askingRent : null,
      notes: String(body.notes || "").slice(0, 500),
    };

    if (body.benchmark && typeof body.benchmark === "object") {
      benchmark = {
        median:
          typeof body.benchmark.median === "number" ? body.benchmark.median : null,
        count: typeof body.benchmark.count === "number" ? body.benchmark.count : 0,
      };
    }

    if (typeof body.imageBase64 === "string" && body.imageBase64.length > 0) {
      imageBase64 = body.imageBase64;
      if (typeof body.imageMime === "string") {
        imageMime = body.imageMime;
      }
    }
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const fallback = listingWriterFallback(inputData, benchmark);

  const roomTypeLabel =
    inputData.roomType === "private_room"
      ? "Private room"
      : inputData.roomType === "shared_room"
      ? "Shared room"
      : "Entire flat";

  const prompt = `You write rental listings for Aurelia, a shared-living app in Punjab/Chandigarh tricity, India. Write warm, honest, plain English.
STRICT RULES:
- Mention ONLY facts given in the details below or clearly visible in the attached photo (if any). Do NOT invent amenities, distances, appliances, or neighbours.
- If a detail is unknown, leave it out. Never write "spacious", "luxury" or "prime location" unless the host's words or the photo support it.
- No pressure language, no exaggerated claims. Do not mention religion, caste, or ethnicity.
- title: max 8 words. tagline: max 14 words. description: 70 to 110 words, 2 short paragraphs.
- tags: 5 to 8 lowercase tags. amenities: only what is stated or visible.
- idealRoommate: one sentence describing the kind of lifestyle that would fit, based on the vibe and food rule given.
- photoInsights: 0 to 4 short phrases of what you can actually see in the photo (empty list if no photo).
- Rent: the market benchmark is ${benchmark.median ?? "not available"}. If available, suggested low/recommended/high must stay within 75% to 125% of it. If not available, give a sensible range for a student town in Punjab and say it is a rough estimate. All numbers are INR per month, whole numbers.
- rentRationale: one sentence explaining the range in plain words.

Details:
City: ${inputData.city}
Area: ${inputData.area}
Room type: ${roomTypeLabel}
Bedrooms in the flat: ${inputData.bhk}
Furnished: ${inputData.furnished ? "yes" : "no"}
Food rule: ${inputData.foodRule === "veg_only" ? "Veg-only" : "Any food"}
Vibe: ${inputData.vibe}
Suitable for: ${inputData.suitableFor}
Host's own words: "${inputData.notes}"`;

  const geminiInput: GeminiInput = imageBase64
    ? [
        { type: "image", mime_type: imageMime, data: imageBase64 },
        { type: "text", text: prompt },
      ]
    : prompt;

  try {
    const raw = await generateJSON<Partial<ListingWriterOutput>>({
      input: geminiInput,
      schema: listingWriterSchema,
    });

    const title = raw.title?.trim().slice(0, 70) || fallback.title;
    const tagline = raw.tagline?.trim().slice(0, 100) || fallback.tagline;
    const description = raw.description?.trim().slice(0, 900) || fallback.description;
    const idealRoommate =
      raw.idealRoommate?.trim().slice(0, 200) || fallback.idealRoommate;
    const rentRationale =
      raw.rentRationale?.trim().slice(0, 200) || fallback.rentRationale;

    const cleanedTags = Array.isArray(raw.tags)
      ? Array.from(
          new Set(raw.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean))
        ).slice(0, 8)
      : [];
    const tags = cleanedTags.length >= 3 ? cleanedTags : fallback.tags;

    const amenities = Array.isArray(raw.amenities)
      ? Array.from(
          new Set(raw.amenities.map((a) => String(a).trim()).filter(Boolean))
        ).slice(0, 8)
      : fallback.amenities;

    const photoInsights =
      imageBase64 && Array.isArray(raw.photoInsights)
        ? raw.photoInsights
            .map((p) => String(p).trim())
            .filter(Boolean)
            .slice(0, 4)
        : [];

    const minBound = benchmark.median ? Math.round(benchmark.median * 0.75) : 1500;
    const maxBound = benchmark.median ? Math.round(benchmark.median * 1.25) : 60000;

    let low = round100(
      clamp(raw.suggestedRent?.low ?? fallback.suggestedRent.low, minBound, maxBound)
    );
    let rec = round100(
      clamp(
        raw.suggestedRent?.recommended ?? fallback.suggestedRent.recommended,
        minBound,
        maxBound
      )
    );
    let high = round100(
      clamp(raw.suggestedRent?.high ?? fallback.suggestedRent.high, minBound, maxBound)
    );

    if (low > rec) low = rec;
    if (high < rec) high = rec;

    return NextResponse.json({
      ok: true,
      source: "gemini",
      data: {
        title,
        tagline,
        description,
        tags,
        amenities,
        idealRoommate,
        photoInsights,
        suggestedRent: { low, recommended: rec, high },
        rentRationale,
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
