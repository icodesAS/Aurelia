# 02 — Architecture, Stack and Setup

## 1. Stack (final)
| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Deploys to Vercel with no config |
| Styling | **Tailwind CSS** (default in `create-next-app`) | Design tokens in `09` |
| Animation | **`motion`** package (formerly Framer Motion) | `import { motion } from "motion/react"`. Client components only. |
| 3D | **`three`, `@react-three/fiber` (v9+), `@react-three/drei`** | Landing hero only. Load with `next/dynamic` and `ssr: false`. v9+ is required for React 19. |
| AI | **`@google/genai`** + Gemini `gemini-3.8-flash` | Server-side only |
| Auth | **Firebase Auth** (Google + Anonymous/Guest) | Client SDK |
| Database | **Cloud Firestore** | Client SDK, real-time `onSnapshot` |
| Icons | `lucide-react` | |
| Hosting | **Vercel** | |

**Do not add** any other library (no Redux, no UI kit, no chart library, no Storage SDK). Charts are hand-built SVG.

## 2. Setup commands
```bash
npx create-next-app@latest aurelia --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"
cd aurelia
npm install @google/genai firebase motion three @react-three/fiber @react-three/drei lucide-react
npm install -D @types/three
```
If `npm` complains about peer dependencies for R3F, confirm `@react-three/fiber` is version 9 or higher (`npm ls @react-three/fiber`). Do **not** use `--force` unless R3F is already v9+.

## 3. Environment variables
`.env.local` (and the same names in Vercel → Project → Settings → Environment Variables):
```
GEMINI_API_KEY=...                      # server only, NO NEXT_PUBLIC prefix
GEMINI_MODEL=gemini-3.8-flash           # optional override
GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite

NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
```
Firebase values come from Firebase console → Project settings → Your apps → Web app → SDK config. (`storageBucket` is not needed because we do not use Storage.)

## 4. Folder structure
```
src/
  app/
    layout.tsx                 # fonts, <AuthProvider>, <NavBar>, <CursorGlow>
    page.tsx                   # Landing (3D hero)
    login/page.tsx
    onboarding/page.tsx        # quiz-as-onboarding
    explore/page.tsx           # Concierge + results
    explore/[id]/page.tsx      # Listing detail (+ residents + fit)
    people/page.tsx            # Ranked roommate matches
    people/[id]/page.tsx       # Match reveal + explainer
    list/page.tsx              # AI Listing Writer
    home/page.tsx              # Household dashboard
    api/ai/
      match-explain/route.ts
      concierge/route.ts
      listing-writer/route.ts
      persona/route.ts         # P1
      split-explain/route.ts   # P1
  components/
    ui/                        # Button, Card, TiltCard, Chip, Orb, RingChart, LoadingLine
    three/HeroScene.tsx        # R3F scene (dynamic import, ssr:false)
    NavBar.tsx  CursorGlow.tsx  AuthProvider.tsx  RouteGuard.tsx
    quiz/QuizStep.tsx
    match/MatchReveal.tsx
    explore/ListingCard.tsx  ConciergeBox.tsx
    household/RentRing.tsx  ExpenseForm.tsx  ChoreList.tsx  SettleUp.tsx
  lib/
    firebase.ts                # client init
    types.ts                   # all shared types (from doc 03)
    seed.ts                    # seed users + listings (from doc 03)
    quiz.ts                    # quiz questions + labels (from doc 05)
    match.ts                   # compatibility engine (pure functions)
    search.ts                  # filter + rank (pure functions)
    household.ts               # split + settle (pure functions)
    store.ts                   # Firestore read/write helpers
    ai/gemini.ts               # SERVER ONLY Gemini wrapper
    ai/schemas.ts              # JSON schemas for every AI call
    ai/fallbacks.ts            # deterministic fallbacks
    format.ts                  # ₹ formatting, clamp, median
```
**Pure logic** (`match.ts`, `search.ts`, `household.ts`) has no React and no network. It must be unit-testable with the test vectors in `03`.

## 5. Gemini wrapper — write this file exactly (`src/lib/ai/gemini.ts`)
This uses only parameters verified in Google's docs. **Do not add `system_instruction`, thinking, or other options** (their Interactions API field names were not verified). Put all instructions at the top of the input text instead.

```ts
// SERVER ONLY. Never import this from a client component.
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const PRIMARY = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const FALLBACK = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash-lite";
const TIMEOUT_MS = 20000;

export type GeminiInput =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image"; mime_type: string; data: string } // data = base64, no data: prefix
    >;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Gemini timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned) as T;
}

export async function generateJSON<T>(opts: { input: GeminiInput; schema: object }): Promise<T> {
  let lastError: unknown;
  for (const model of [PRIMARY, FALLBACK]) {
    try {
      const interaction = await withTimeout(
        // @ts-expect-error SDK input typing may be stricter than our union; the request shape is what matters
        client.interactions.create({
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
      return parseJson<T>(interaction.output_text);
    } catch (err) {
      lastError = err;
      console.error(`[gemini] ${model} failed:`, err);
    }
  }
  throw lastError;
}
```
If the `@ts-expect-error` line itself errors because there is no type error, delete that one comment line. **Do not change the request shape.**

Optional last-resort fallback (only if `client.interactions` is undefined at runtime in the installed SDK version): switch to `client.models.generateContent({ model, contents, config: { responseMimeType: "application/json", responseSchema } })` and read `response.text`. Google lists `generateContent` as still fully supported.

## 6. API route pattern (every `route.ts`)
```ts
import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai/gemini";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 1. validate body
    // 2. build prompt text
    // 3. const result = await generateJSON<MyType>({ input, schema });
    // 4. validate/clamp result in code
    return NextResponse.json({ ok: true, source: "gemini", data: result });
  } catch (e) {
    // return deterministic fallback so the UI never breaks
    return NextResponse.json({ ok: true, source: "fallback", data: fallbackResult });
  }
}
```
The response **always** has `{ ok, source: "gemini" | "fallback", data }`. The UI may show a tiny "AI" badge when `source === "gemini"`.

## 7. Firebase setup checklist (do this in the first 15 minutes)
1. Firebase console → create project → add a **Web app** → copy config into env vars.
2. **Authentication → Sign-in method:** enable **Google** and **Anonymous**.
3. **Authentication → Settings → Authorized domains:** add your Vercel domain (`your-app.vercel.app`) as soon as it exists. `localhost` is allowed by default. *Google sign-in fails on the deployed site if you forget this.*
4. **Firestore Database → Create database** (production mode), then paste the rules in `03`.
5. Do **not** enable Storage.

## 8. Firebase client init (`src/lib/firebase.ts`)
```ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

const app = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

## 9. If the AI builder is Google AI Studio Build (not Next.js)
Google's docs say AI Studio apps have a client framework (React/Angular) plus a **Node.js server**, and that `GEMINI_API_KEY` is set up automatically as a server secret. If it generates a React + Node app instead of Next.js:
- Keep **all of `src/lib/*`** unchanged (pure logic, schemas, fallbacks, wrapper).
- Turn each `app/api/ai/*/route.ts` into a matching Node endpoint with the **same path and same JSON request/response**: `POST /api/ai/match-explain`, `/api/ai/concierge`, `/api/ai/listing-writer`, `/api/ai/persona`, `/api/ai/split-explain`.
- Replace `next/dynamic` with `React.lazy`, and `next/link` with the router's link.
- Everything else (Firebase, Firestore, UI) is identical.
**Recommended:** use AI Studio Build for the first scaffold and visuals, then move to Antigravity locally for the AI routes, Firebase and polish, and deploy to Vercel.

## 10. Deployment
1. Push to GitHub → import repo in Vercel.
2. Add all env vars from section 3.
3. Deploy. Add the Vercel domain to Firebase Authorized domains.
4. Open the deployed URL and run the full demo once. **Do this by the 1-hour mark** (see `10`).
