# 10 — Build Plan, Team Split, Deploy, Demo and Judge Q&A

Time budget: **about 2.5 hours**. Times below are from "Start". If you have less, use the **cut list** in section 4.

## 1. Team split (3 people)
| Person | Owns | Docs to read |
|---|---|---|
| **A — Experience** | `globals.css`, tokens, fonts, NavBar, landing + 3D hero, ui components, match reveal, page polish | 09, 05 §4 |
| **B — Intelligence** | `lib/ai/*`, `lib/match.ts`, `lib/search.ts`, all `api/ai/*` routes, prompts, test vectors, Gemini key and rate limits | 02, 05, 06, 07 |
| **C — Data and flows** | Firebase console setup, `AuthProvider`, login, onboarding, `seed.ts`, `store.ts`, household feature, Vercel deploy, slides | 02, 03, 04, 08, 10 |

**Contract first:** before anyone builds UI, C commits `types.ts` + `seed.ts` and B commits `quiz.ts` + `match.ts`. After that all three work in parallel with no blocking.

## 2. Timeline

### Phase 0 — Setup (0:00 – 0:15)
- [ ] A: run the `create-next-app` command and installs from `02` §2; push to GitHub; import into Vercel.
- [ ] C: Firebase project → Web app → enable Google + Anonymous → create Firestore → paste rules from `03` §3 → copy config to `.env.local`.
- [ ] B: get `GEMINI_API_KEY` from AI Studio, then **smoke-test it** with this verified REST call (from Google's docs):
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
  -H "x-goog-api-key: $GEMINI_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"gemini-3.8-flash","input":"Say hello in five words."}'
```
  Time it. If it takes over ~6 s, set `GEMINI_MODEL=gemini-3.5-flash-lite`.
- [ ] Everyone: copy this `aurelia-docs` folder into the repo as `/docs`.

### Phase 1 — Foundation (0:15 – 0:45)
- [ ] A: tokens, fonts, layout, NavBar, `CursorGlow`, `Button/Card/Chip/TiltCard`, landing page (start with the CSS fallback; add the 3D scene after M1).
- [ ] B: `gemini.ts`, `schemas.ts`, `fallbacks.ts`, `match.ts` + run test vectors `03` §6.1.
- [ ] C: `firebase.ts`, `AuthProvider`, `RouteGuard`, `/login`, `/onboarding` (all 10 steps), `seed.ts`, `store.ts` basics.

### Phase 2 — People + Match (0:45 – 1:10)
- [ ] B: `/api/ai/match-explain` (+ fallback).
- [ ] A: `/people` grid, `/people/[id]` reveal animation, `Orb`, `FitBadge`.
- [ ] C: Vercel env vars, add the Vercel domain to Firebase Authorized domains.

### ★ Milestone M1 (by 1:10): **deploy**
Guest login → quiz → People list → Match reveal works **on the Vercel URL**. If not, stop adding features and fix this first.

### Phase 3 — Concierge + Explore (1:10 – 1:35)
- [ ] B: `search.ts` + test vector `03` §6.2, `/api/ai/concierge` (+ fallback parser).
- [ ] A: `/explore` page, concierge "thinking" sequence, `ListingCard`.
- [ ] C: Firestore `listings` real-time hook, `/explore/[id]` detail page.

### Phase 4 — Listing Writer (1:35 – 1:55)
- [ ] B: `/api/ai/listing-writer` (+ validation, clamp, fallback).
- [ ] A: `/list` form, live preview, rent range bar.
- [ ] C: image resize helper, Publish → Firestore.

### Phase 5 — Household (1:55 – 2:15)
- [ ] C: `household.ts` + test vectors `03` §6.3 and §6.4, "Move in (demo)", `/home`.
- [ ] A: `RingChart`, bills + settle-up cards.
- [ ] B: help C; then start P1 only if everything above is deployed.

### Phase 6 — Polish and rehearse (2:15 – 2:30)
- [ ] Add the 3D hero scene (if skipped earlier).
- [ ] P1: Living Persona, split explanation.
- [ ] Run the full demo script twice on the deployed URL. Record a backup screen video.

## 3. What to tell your AI builder at each phase
Always attach `00 + 02 + 03 + 09` plus the file named. Short instruction examples:
| Phase | Attach | Say |
|---|---|---|
| Scaffold | all docs | "Create the project exactly as in 02, implement tokens and components from 09, then types.ts and seed.ts from 03. Do not build features yet." |
| Auth + quiz | 04, 05 §1 | "Implement 04 fully, including quiz.ts from 05 §1." |
| Match | 05 | "Implement match.ts, the API route, the People pages and the reveal exactly as in 05. Make all test vectors in 03 §6.1 pass." |
| Concierge | 06 | "Implement 06 exactly. Make test vector 03 §6.2 pass." |
| Listing | 07 | "Implement 07 exactly, including image resizing, clamping and the fallback." |
| Household | 08 | "Implement 08 exactly. Make test vectors 03 §6.3 and §6.4 pass." |
| Fix | the failing file + error | "Fix this error. Do not change any behaviour described in the docs." |

## 4. Cut list (if you fall behind, cut in this order)
1. Living Persona (P1) · 2. Split explanation (P1) · 3. 3D hero → use the CSS orb fallback · 4. Dimension rows in the reveal · 5. Photo input in Listing Writer (keep text-only) · 6. Chores · 7. Equal/Fair toggle (keep Fair).
**Never cut:** Match reveal, Concierge, Listing Writer, and a minimal Household (ring + one bill + settle up).

## 5. Deployment checklist
- [ ] `npm run build` passes locally.
- [ ] All env vars set in Vercel (`02` §3), then **redeploy** (env changes need a new deployment).
- [ ] Vercel domain added to Firebase → Authentication → Settings → Authorized domains.
- [ ] Firestore rules published.
- [ ] Guest login works on the live URL. Google login works on the live URL.
- [ ] Each AI feature responds on the live URL (check Vercel function logs if not).
- [ ] 10 quick Gemini calls in a row do not hit a rate limit. If they do, switch to `gemini-3.5-flash-lite`.

## 6. Demo script (3 minutes; two presenters recommended)
| Time | Screen | Say |
|---|---|---|
| 0:00 | Landing | "Finding a room is easy. Finding people you can live with is hard. Aurelia: find your people, find your place." |
| 0:15 | Login → Guest → quiz (answer fast) | "Sign-up is our matching quiz: seven everyday questions, no forms." |
| 0:50 | Explore: type the concierge sentence | "I just type what I want, in my own words." Point at the filter chips: "The AI understood this. The ranking is transparent code." |
| 1:20 | Open a listing → housemate → Match reveal | "Not just the room, the people. Here is why we would click, and one honest watch-out." |
| 2:05 | List a room (type 2 lines, add a photo) → Generate → Publish → show in Explore | "Anyone can be a host. The AI writes the listing and prices it from nearby homes." |
| 2:35 | Move in → Household | "Life after moving in: a fair rent split, bills, and who owes whom." Toggle Fair/Equal. |
| 2:55 | Back to landing | "Aurelia. Find your people. Find your place." |

**Say it out loud:** "One account type: in shared living everyone is both a seeker and a host."

## 7. Judge Q&A cheat sheet
| Question | Answer |
|---|---|
| How is the match score calculated? | A transparent weighted formula over seven lifestyle answers. The AI never changes the number; it only explains it, including one honest watch-out. |
| What if the AI is down or slow? | Every AI feature has a built-in fallback, so the app still works. |
| Why no separate host and tenant accounts? | In shared living the same person is both. One profile keeps it simple and honest. |
| Is the data real? | The listings and people are mock data for the demo. User-created listings and households are saved in Firestore. |
| Is it safe? | Demo uses guest sign-in. Next steps: identity verification for hosts, verified listings, reporting, and stricter database rules. |
| How would it make money? | Proposed ideas: verified-listing fee for hosts and a premium for deeper roommate matching. Not built in this demo. |
| Where is Gemini used? | Understanding natural-language search, explaining matches, writing listings from text and photos, and (optionally) personas and split explanations. |
| What would you build next? | Verified identities, chat between matched people, real photos in cloud storage, maps and commute times. |

## 8. Slides (6 slides, keep it light)
1. Title + tagline + team. 2. The problem (people, not property). 3. Aurelia in one picture (Find → Match → Move in → Live together). 4. AI features (4 icons: Match, Concierge, Listing Writer, Smart Split). 5. How it works (quiz → formula → AI explains; fallback). 6. Next steps + thanks.

## 9. 10 minutes before presenting
- [ ] Fullscreen browser, zoom 100–110%, notifications off, laptop on charger, sleep disabled.
- [ ] Open the live URL, **already signed in as a guest with the quiz done**, so you can skip straight to Explore if time is short.
- [ ] Run every AI feature once to warm up. Keep one prepared photo ready (≤ 3 MB) for the Listing Writer.
- [ ] Mobile hotspot ready as network backup.
- [ ] Backup screen recording on the desktop.
- [ ] A second browser profile ready to sign in as another guest.
