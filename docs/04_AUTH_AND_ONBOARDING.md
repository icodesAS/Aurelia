# 04 — Auth, Guest Mode and Quiz-as-Onboarding

**Decision:** one account type, no roles. Sign-up *is* the lifestyle quiz.

## 1. Sign-in options (`/login`)
| Button | Implementation (Firebase JS SDK, modular) |
|---|---|
| Continue with Google | `signInWithPopup(auth, new GoogleAuthProvider())` |
| Continue as Guest (demo) | `signInAnonymously(auth)` |

Both need to be enabled in Firebase console (see `02`). Guest is the **default demo path** because it never fails on stage. Show Guest as the larger button.

Imports: `import { GoogleAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, signOut } from "firebase/auth"` and `import { doc, getDoc, setDoc } from "firebase/firestore"`.

## 2. `AuthProvider` (`src/components/AuthProvider.tsx`, client component)
Exposes via React context:
```ts
{
  user: User | null;          // Firebase user
  profile: Profile | null;    // from Firestore users/{uid}
  loading: boolean;           // true until first auth + profile check finishes
  signInGoogle(): Promise<void>;
  signInGuest(): Promise<void>;
  logout(): Promise<void>;
  saveProfile(p: Profile): Promise<void>;   // setDoc(doc(db,"users",uid), p) then update context
  refreshProfile(): Promise<void>;
}
```
Behaviour:
1. `onAuthStateChanged` → set `user`.
2. If `user`, `getDoc(doc(db, "users", user.uid))` → set `profile` (or `null` if it does not exist).
3. `loading` is `false` only after both steps are done.
4. Strip `undefined` before `setDoc`.

## 3. Route guard (`RouteGuard.tsx`, wraps `children` in `layout.tsx`)
| Route | Rule |
|---|---|
| `/`, `/login` | Public. If `user && profile` on `/login`, redirect to `/explore`. |
| `/onboarding` | Needs `user`. Allowed even if `profile` exists (so people can retake the quiz). |
| everything else | Needs `user` **and** `profile`. No user → `/login`. User but no profile → `/onboarding`. |
While `loading`, render the themed full-screen loader (see `09`), never a flash of the wrong page.

## 4. Onboarding flow (`/onboarding`)
One question per screen, large type, smooth slide transition (`motion` `AnimatePresence`). Selecting an option auto-advances after ~350 ms. A thin gold progress line sits at the top. A "Back" link is always visible.

| Step | Screen | Saves to |
|---|---|---|
| 0 | "What should we call you?" text input (prefill from Google `displayName`, empty for guests). Below it, three chips: **Looking for a room**, **I have a room**, **Both** | `displayName`, `intent` |
| 1–7 | The 7 quiz questions from `lib/quiz.ts` (full text in `05`) | `answers.*` |
| 8 | "Your budget and city": budget preset chips + city chips | `budgetMin`, `budgetMax`, `city` |
| 9 | Loading screen: "Reading your vibe…" (min 1.6 s so the animation can play) | — |
| 10 | Summary screen: your 7 answers as small chips, plus **Living Persona** (P1) if available. Two buttons: **Explore homes** → `/explore`, **See roommate matches** → `/people` | — |

**Budget presets (INR/month, per person):**
`Under 5k → 0–5000`, `5–8k → 5000–8000`, `8–12k → 8000–12000`, `12–18k → 12000–18000`, `18k+ → 18000–40000`.
**City chips:** Rajpura, Zirakpur, Mohali, Chandigarh, Panchkula (plus a free-text "Other").
`occupation`: if not collected, set it to `"Student"` (do not add another screen).

On finish: build a `Profile` (`uid = user.uid`, `createdAt = Date.now()`), call `saveProfile`, then show step 10.

## 5. Living Persona (P1 — build only after P0 is deployed)
`POST /api/ai/persona` with body `{ answers: QuizAnswers }`.

**Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "2 to 4 words, starts with 'The', e.g. The Quiet Curator" },
    "tagline": { "type": "string", "description": "One sentence, max 14 words, warm and specific to the answers" }
  },
  "required": ["name", "tagline"]
}
```
**Prompt text:**
```
You name living styles for a roommate-matching app. Use ONLY the answers below.
Return a persona name (2-4 words, starting with "The") and a one-sentence tagline (max 14 words).
Plain English. Warm, not cheesy. No mention of religion, gender, caste or health.
Answers: sleep=<..>, cleanliness=<..>, food=<..>, guests=<..>, noise=<..>, social=<..>, substances=<..>
```
**Code validation:** `name` must start with "The" and be ≤ 32 chars; `tagline` ≤ 100 chars. Otherwise use the fallback.
**Fallback (no AI):** `"The " + A + " " + B` where
`A` = early → "Early", flexible → "Easygoing", late → "Midnight";
`B` = relaxed → "Free Spirit", tidy → "Planner", spotless → "Curator".
Tagline fallback: `"You like a home that matches your rhythm."`

## 6. Nav bar (`NavBar.tsx`)
Links: **Explore** (`/explore`), **People** (`/people`), **List a room** (`/list`), **My home** (`/home`). Right side: avatar circle with first letter + dropdown: **Retake quiz** (`/onboarding`), **Sign out**. Hidden on `/`, `/login` and `/onboarding`.

## 7. Acceptance checklist
- [ ] Guest sign-in works on localhost and on the deployed domain.
- [ ] Google sign-in works on localhost and on the deployed domain (domain added to Authorized domains).
- [ ] Refreshing any page keeps you signed in and does not show the wrong screen first.
- [ ] A user with a profile skips onboarding; "Retake quiz" overwrites the profile.
- [ ] Profile document appears in Firestore `users/{uid}`.
