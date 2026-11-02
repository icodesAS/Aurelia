// SERVER ONLY. Never import this from a client component.
import { GoogleGenAI } from "@google/genai";

const PRIMARY = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const FALLBACK = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash-lite";
const TIMEOUT_MS = 16000;

export type GeminiInput =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image"; mime_type: string; data: string } // data = base64, no data: prefix
    >;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Gemini timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  return JSON.parse(match ? match[1] : cleaned) as T;
}

export async function generateJSON<T>(opts: {
  input: GeminiInput;
  schema: object;
}): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const client = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  for (const model of [PRIMARY, FALLBACK]) {
    try {
      const interaction = await withTimeout<{
        output_text?: string | null;
        steps?: Array<{
          type?: string;
          content?: Array<{ type?: string; text?: string }>;
        }>;
      }>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client.interactions as any).create({
          model,
          input: opts.input,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: opts.schema,
          },
        }),
        TIMEOUT_MS
      );

      let outputText: string = interaction?.output_text ?? "";
      if (!outputText && Array.isArray(interaction?.steps)) {
        for (const step of interaction.steps) {
          if (step?.type === "model_output" && Array.isArray(step.content)) {
            const textPart = step.content.find(
              (c: { type?: string; text?: string }) => c.type === "text" && c.text
            );
            if (textPart?.text) {
              outputText += textPart.text;
            }
          }
        }
      }

      if (!outputText) {
        throw new Error("Empty response from Gemini Interactions API");
      }

      return parseJson<T>(outputText);
    } catch (err) {
      lastError = err;
      console.warn(`[gemini] ${model} fallback triggered`);
    }
  }

  throw lastError;
}
