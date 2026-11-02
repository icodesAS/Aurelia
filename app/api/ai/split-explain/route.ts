import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai/gemini";
import { splitExplainSchema } from "@/lib/ai/schemas";
import { splitExplainFallback } from "@/lib/ai/fallbacks";

export const maxDuration = 30;

export async function POST(req: Request) {
  let mode: "fair" | "equal" = "fair";
  let payloadText = "";

  try {
    const body = await req.json();
    mode = body.mode === "equal" ? "equal" : "fair";
    payloadText = JSON.stringify({
      totalRent: body.totalRent,
      mode,
      shares: body.shares,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const fallback = splitExplainFallback(mode);

  const prompt = `In 2 short sentences, plain English, explain why these housemates pay these amounts. Use ONLY the numbers given. Do not change any number. Mode: ${mode}. Data: ${payloadText}`;

  try {
    const raw = await generateJSON<{ explanation?: string }>({
      input: prompt,
      schema: splitExplainSchema,
    });

    const explanation =
      raw.explanation && raw.explanation.trim()
        ? raw.explanation.trim().slice(0, 300)
        : fallback.explanation;

    return NextResponse.json({
      ok: true,
      source: "gemini",
      data: { explanation },
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "fallback",
      data: fallback,
    });
  }
}
