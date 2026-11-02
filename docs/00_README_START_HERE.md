# AURELIA — Build Pack (Start Here)

> **Tagline:** "Find your people. Find your place."
> **Event:** Think2Build, Chitkara University — 2 Nov 2026 — Team Triple bytes (Team 6)
> **Problem statement:** Rental and Shared Living
> **Goal:** A premium, dark, cinematic web app with 5 working AI features, live-demoable in 3 minutes.

This pack is written so that an AI builder (Google AI Studio Build, Antigravity, Cursor, etc.) can implement it with **no guessing**. Every Gemini call, schema, formula and data shape is specified.

---

## 1. File index (what to attach, and when)

| File | What it contains | Attach it when… |
|---|---|---|
| `00_README_START_HERE.md` | Rules, verified facts, index | **Always** |
| `01_PRODUCT_BRIEF.md` | Product, features, demo story, scope cuts | First prompt only |
| `02_ARCHITECTURE.md` | Stack, folders, env vars, Gemini wrapper, Firebase setup | **Always** |
| `03_DATA_MODEL_AND_SEED.md` | Types, Firestore collections/rules, seed users + listings, test vectors | **Always** |
| `04_AUTH_AND_ONBOARDING.md` | Login, guest mode, quiz-as-onboarding, route guards | Auth + onboarding step |
| `05_FEATURE_ROOMMATE_MATCH.md` | Compatibility engine + match explainer + reveal | Match step |
| `06_FEATURE_CONCIERGE_SEARCH.md` | Natural-language search + ranking | Concierge step |
| `07_FEATURE_LISTING_WRITER.md` | AI listing generator (text + photo) | Listing step |
| `08_FEATURE_HOUSEHOLD_DASHBOARD.md` | Rent split, bills, chores | Household step |
| `09_UI_DESIGN_SYSTEM.md` | Colors, fonts, motion, pages, wow moments | **Always** |
| `10_BUILD_PLAN_AND_DEMO.md` | Hour-by-hour plan, team split, deploy, demo script, fallbacks | Humans read this |

**Rule of thumb:** every prompt to the AI builder = `00 + 02 + 03 + 09` + the one feature file you are building now.

---

## 2. Rules for the AI builder (copy these into the first prompt)

1. **Follow the docs literally.** Do not rename fields, routes or collections. Do not add libraries that are not listed in `02_ARCHITECTURE.md`.
2. **Never guess an API.** Gemini is called only through `lib/ai/gemini.ts` exactly as written in `02_ARCHITECTURE.md`. If you are unsure about any SDK/Firebase call, use the version in the docs, not memory.
3. **Secrets stay on the server.** `GEMINI_API_KEY` is read only inside server code (API routes / server module). Never import `lib/ai/gemini.ts` in a client component.
4. **Every AI feature must have a deterministic fallback** (specified in each feature file) so the demo still works if Gemini is slow, rate-limited or offline.
5. **Seed data lives in code** (`lib/seed.ts`), not in Firestore. Firestore stores only real user data (profiles, user-created listings, households).
6. **Compatibility scores are computed by code, never by the LLM.** The LLM only explains a score that code already computed.
7. **`next build` must pass** with zero errors before every deploy. Fix type errors; do not disable TypeScript or ESLint to get around them.
8. **Themed loading states, no bare spinners.** Use the loading messages listed in `09_UI_DESIGN_SYSTEM.md`.
9. **Plain, jargon-free UI copy.** The audience is students and judges, not engineers.
10. **Ship small.** Finish one feature end to end (UI + API + fallback + loading + error state) before starting the next.

---

## 3. Verified facts (checked against Google's official docs on 2 Nov 2026)

These were read directly from `ai.google.dev` pages last updated 20–27 Oct 2026.

| Topic | Verified fact |
|---|---|
| Best default model | `gemini-3.8-flash` — listed as **Stable**; "most intelligent Flash model" |
| Cheap/fast fallback model | `gemini-3.5-flash-lite` — **Stable** ("fastest, most cost-effective 3.5 model") |
| Other stable text models | `gemini-3.6-flash`, `gemini-3.1-flash-lite` |
| Flagship (do NOT use, slower/costlier by positioning) | `gemini-4-argon` |
| Old models | `gemini-2.0-flash` / `gemini-2.0-flash-lite`: **shut down**. `gemini-2.5-*`: restricted to users who already used them. **Do not use either.** |
| JS SDK | package `@google/genai`, `import { GoogleGenAI } from "@google/genai"` |
| Recommended API | **Interactions API**: `client.interactions.create({ model, input, response_format })`, text result in `interaction.output_text` |
| Old API | `generateContent` "remains fully supported" (acceptable fallback if Interactions misbehaves) |
| Structured output | `response_format: { type: "text", mime_type: "application/json", schema: <JSON Schema> }` |
| Nullable fields | `{"type": ["string","null"]}` is supported |
| Enforced constraints | `minItems`, `maxItems`, `enum`, `required`, `minimum`, `maximum` |
| NOT enforced (ignored) | `minLength`, `maxLength`, `uniqueItems`, `minProperties`, `maxProperties` → **validate in code** |
| Schema complexity | Very large/deeply nested schemas can return `400 INVALID_ARGUMENT`. Keep schemas shallow, enum lists short. |
| Image input | `input: [ { type:"image", mime_type:"image/jpeg", data:"<base64>" }, { type:"text", text:"..." } ]` |
| Multi-turn | `previous_interaction_id` (not needed in this app) |
| AI Studio Build | Has a Node.js server runtime; auto-configures `GEMINI_API_KEY` as a server secret; has a Firestore + Firebase Auth ("Sign in with Google") integration; deploy docs at `ai.google.dev/gemini-api/docs/aistudio-deploying` |

## 4. NOT verified — check these yourself (do not assume)

| Item | How to check | Why it matters |
|---|---|---|
| Does your "Google AI Pro" plan raise **API** rate limits? | AI Studio → your API key → rate limits page (`ai.google.dev/gemini-api/docs/rate-limits`) | Consumer subscription and API quota may be separate. Test with 10 quick calls before the demo. |
| Real latency of `gemini-3.8-flash` | Time one call in AI Studio | If a call takes more than ~6 s, switch `GEMINI_MODEL` to `gemini-3.5-flash-lite` |
| Whether Firebase Storage needs a paid plan on a new project | Firebase console | **This app avoids Storage entirely** (small images stored as compressed data URLs in Firestore) |
| What framework AI Studio Build generates | Look at the first output | It may produce React + Node instead of Next.js. See `02_ARCHITECTURE.md` section 9 for the portable mapping. |
| Exact Next.js / React / R3F versions | Let `npm` install latest; read the lockfile | Third-party sources show Next.js 16.x + React 19.x. **React Three Fiber must be v9+ for React 19.** |
