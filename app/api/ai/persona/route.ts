import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai/gemini";
import { personaSchema } from "@/lib/ai/schemas";
import { personaFallback } from "@/lib/ai/fallbacks";
import { DEFAULT_QUIZ_ANSWERS } from "@/lib/quiz";
import { QuizAnswers } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: Request) {
  let answers: QuizAnswers = DEFAULT_QUIZ_ANSWERS;
  try {
    const body = await req.json();
    if (body.answers && typeof body.answers === "object") {
      answers = { ...DEFAULT_QUIZ_ANSWERS, ...body.answers };
    }
  } catch {
    // use defaults
  }

  const fallback = personaFallback(answers);

  const prompt = `You name living styles for a roommate-matching app. Use ONLY the answers below.
Return a persona name (2-4 words, starting with "The") and a one-sentence tagline (max 14 words).
Plain English. Warm, not cheesy. No mention of religion, gender, caste or health.
Answers: sleep=${answers.sleep}, cleanliness=${answers.cleanliness}, food=${answers.food}, guests=${answers.guests}, noise=${answers.noise}, social=${answers.social}, substances=${answers.substances}`;

  try {
    const raw = await generateJSON<{ name?: string; tagline?: string }>({
      input: prompt,
      schema: personaSchema,
    });

    const name = raw.name?.trim() ?? "";
    const tagline = raw.tagline?.trim() ?? "";

    const validName =
      name.startsWith("The ") && name.length <= 32 ? name : fallback.name;
    const validTagline =
      tagline.length > 0 && tagline.length <= 100 ? tagline : fallback.tagline;

    return NextResponse.json({
      ok: true,
      source: "gemini",
      data: { name: validName, tagline: validTagline },
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "fallback",
      data: fallback,
    });
  }
}
