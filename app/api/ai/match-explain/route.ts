import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai/gemini";
import { matchExplainSchema } from "@/lib/ai/schemas";
import { matchExplainFallback, MatchExplanation } from "@/lib/ai/fallbacks";
import { scoreMatch } from "@/lib/match";
import { DEFAULT_QUIZ_ANSWERS } from "@/lib/quiz";
import { QuizAnswers } from "@/lib/types";

export const maxDuration = 30;

function isValidQuizAnswers(obj: unknown): obj is QuizAnswers {
  if (!obj || typeof obj !== "object") return false;
  const a = obj as Record<string, unknown>;
  return (
    typeof a.sleep === "string" &&
    typeof a.cleanliness === "string" &&
    typeof a.food === "string" &&
    typeof a.guests === "string" &&
    typeof a.noise === "string" &&
    typeof a.social === "string" &&
    typeof a.substances === "string"
  );
}

export async function POST(req: Request) {
  let you: QuizAnswers = DEFAULT_QUIZ_ANSWERS;
  let other: QuizAnswers = DEFAULT_QUIZ_ANSWERS;
  let youName = "You";
  let otherName = "Roommate";

  try {
    const body = await req.json();
    if (isValidQuizAnswers(body.you)) you = body.you;
    if (isValidQuizAnswers(body.other)) other = body.other;
    if (typeof body.youName === "string" && body.youName.trim()) {
      youName = body.youName.trim();
    }
    if (typeof body.otherName === "string" && body.otherName.trim()) {
      otherName = body.otherName.trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const result = scoreMatch(you, other);
  const otherFirstName = otherName.split(" ")[0] || "them";
  const fallback = matchExplainFallback(result, otherFirstName);

  const alignedText =
    result.aligned.length > 0
      ? result.aligned
          .map((d) =>
            d.aLabel === d.bLabel
              ? `- ${d.label}: both ${d.aLabel}`
              : `- ${d.label}: ${d.aLabel} and ${d.bLabel}`
          )
          .join("\n")
      : "- Complementary daily rhythms";

  const watchText =
    result.watch.length > 0
      ? result.watch
          .map((d) => `- ${d.label}: you are ${d.aLabel}, ${otherFirstName} is ${d.bLabel}`)
          .join("\n")
      : `- Minor routine differences with ${otherFirstName}`;

  const prompt = `You explain roommate compatibility for a rental app called Aurelia. Be honest, warm and specific.
Rules:
- The score and label are already computed. Do NOT change or recalculate them. You may mention the score once at most.
- Use ONLY the facts listed below. Do not invent hobbies, jobs, personality or history for either person.
- Plain, simple English. No jargon. Each bullet must be 22 words or fewer.
- Always include at least one honest watch-out, even for a high score.
- Address the first person as "you". Refer to the other person by first name.

Person A (you): ${youName}
Person B: ${otherName}
Score: ${result.score}/100 (${result.label})

Aligned on:
${alignedText}

Differences to watch:
${watchText}

Return JSON with: headline (max 8 words), whyYouClick (2 to 3 bullets), watchOuts (1 to 2 bullets),
conversationStarters (exactly 2 friendly questions they could ask each other), houseRule (one practical rule they could agree on).`;

  try {
    const raw = await generateJSON<{
      headline?: string;
      whyYouClick?: string[];
      watchOuts?: string[];
      conversationStarters?: string[];
      houseRule?: string;
    }>({
      input: prompt,
      schema: matchExplainSchema,
    });

    const headline =
      raw.headline && raw.headline.trim()
        ? raw.headline.trim().slice(0, 60)
        : fallback.headline;

    const whyYouClick = Array.isArray(raw.whyYouClick)
      ? raw.whyYouClick
          .map((s) => String(s).trim().slice(0, 160))
          .filter(Boolean)
          .slice(0, 3)
      : [];

    const finalWhy = whyYouClick.length >= 2 ? whyYouClick : fallback.whyYouClick;

    const watchOuts = Array.isArray(raw.watchOuts)
      ? raw.watchOuts
          .map((s) => String(s).trim().slice(0, 160))
          .filter(Boolean)
          .slice(0, 2)
      : [];

    const finalWatch = watchOuts.length >= 1 ? watchOuts : fallback.watchOuts;

    const starters = Array.isArray(raw.conversationStarters)
      ? raw.conversationStarters
          .map((s) => String(s).trim().slice(0, 160))
          .filter(Boolean)
          .slice(0, 2)
      : [];

    const finalStarters =
      starters.length === 2 ? starters : fallback.conversationStarters;

    const houseRule =
      raw.houseRule && raw.houseRule.trim()
        ? raw.houseRule.trim().slice(0, 160)
        : fallback.houseRule;

    const explanation: MatchExplanation = {
      headline,
      whyYouClick: finalWhy,
      watchOuts: finalWatch,
      conversationStarters: finalStarters,
      houseRule,
      why_it_works: finalWhy,
      watch_out: finalWatch[0],
    };

    return NextResponse.json({
      ok: true,
      source: "gemini",
      headline: explanation.headline,
      why_it_works: explanation.why_it_works,
      watch_out: explanation.watch_out,
      data: {
        score: result.score,
        label: result.label,
        dimensions: result.dimensions,
        explanation,
      },
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "fallback",
      headline: fallback.headline,
      why_it_works: fallback.why_it_works,
      watch_out: fallback.watch_out,
      data: {
        score: result.score,
        label: result.label,
        dimensions: result.dimensions,
        explanation: fallback,
      },
    });
  }
}
