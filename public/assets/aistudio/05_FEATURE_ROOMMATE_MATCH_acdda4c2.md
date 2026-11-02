# 05 — Feature: Roommate Compatibility Engine + Match Explainer

**Principle:** the score is computed by **code** (fast, repeatable, explainable). Gemini only **explains** the score in plain words. If Gemini fails, a template explains it. The demo can never break.

## 1. Quiz definition (`src/lib/quiz.ts`)
Seven questions. Keys and option values must match the types in `03` exactly.

| # | key | Question | Options (value → label — helper text) |
|---|---|---|---|
| 1 | `sleep` | When does your day usually start and end? | `early` → Early bird — up by 7, asleep by 11 · `flexible` → Flexible — it depends on the day · `late` → Night owl — up late, asleep after 1 |
| 2 | `cleanliness` | How do you feel about a clean home? | `relaxed` → Relaxed — tidy up when it gets messy · `tidy` → Tidy — a little every day · `spotless` → Spotless — everything in its place |
| 3 | `food` | What do you eat at home? | `veg` → Vegetarian · `nonveg` → Non-vegetarian · `flexible` → Flexible — fine with either |
| 4 | `guests` | How often do you have friends over? | `rarely` → Rarely · `sometimes` → Sometimes — a few times a month · `often` → Often — most weeks |
| 5 | `noise` | What should home sound like? | `quiet` → Quiet — good for study and sleep · `balanced` → Balanced · `lively` → Lively — music, calls, company |
| 6 | `social` | How much do you want to hang out with roommates? | `space` → My own space · `occasional` → Occasional hangouts · `family` → Like a family |
| 7 | `substances` | Smoking or drinking at home? | `none` → Neither, please · `occasional` → Okay occasionally · `regular` → Fine regularly |

Dimension display labels (used in results and prompts):
`sleep` "Sleep rhythm", `cleanliness` "Cleanliness", `food` "Food habits", `guests` "Guests", `noise` "Noise level", `social` "Togetherness", `substances` "Smoking and drinking".
Option display labels are the text before the "—" in the table above, except: `social` options display as "Own space" / "Occasional hangouts" / "Like a family"; `noise` options display as "Quiet home" / "Balanced" / "Lively"; `substances` options display as "Neither" / "Okay occasionally" / "Fine regularly".

## 2. Scoring engine (`src/lib/match.ts`) — pure functions, no imports from React/Firebase

### 2.1 Weights (sum = 1.00)
| key | weight |
|---|---|
| sleep | 0.18 |
| cleanliness | 0.20 |
| food | 0.12 |
| guests | 0.14 |
| noise | 0.14 |
| social | 0.10 |
| substances | 0.12 |

### 2.2 Similarity per dimension (0 to 1)
- **Ordinal dimensions** (`sleep`, `cleanliness`, `guests`, `noise`, `social`, `substances`): map the three values to indexes `0, 1, 2` in the order listed in the quiz table. `similarity = 1 − |ia − ib| / 2`.
- **`food`** uses this table (symmetric):

| | veg | nonveg | flexible |
|---|---|---|---|
| **veg** | 1.00 | 0.30 | 0.85 |
| **nonveg** | 0.30 | 1.00 | 0.90 |
| **flexible** | 0.85 | 0.90 | 1.00 |

### 2.3 Total and label
`score = Math.round(100 × Σ(weight × similarity))`

| Score | Label |
|---|---|
| 85 – 100 | Rare match |
| 70 – 84 | Strong match |
| 55 – 69 | Workable |
| 0 – 54 | Risky |

### 2.4 Exports
```ts
export interface DimensionResult {
  key: keyof QuizAnswers;
  label: string;        // "Sleep rhythm"
  aLabel: string;       // option label for person A, e.g. "Early bird"
  bLabel: string;
  similarity: number;   // 0..1
  weight: number;
}
export type MatchLabel = "Rare match" | "Strong match" | "Workable" | "Risky";
export interface MatchResult {
  score: number;
  label: MatchLabel;
  dimensions: DimensionResult[];      // all 7, in quiz order
  aligned: DimensionResult[];         // similarity >= 0.85, sorted by weight desc, max 3
  watch: DimensionResult[];           // similarity <= 0.5, sorted by weight*(1-similarity) desc, max 2;
                                      // if none qualify, the single lowest-similarity dimension
}
export function scoreMatch(a: QuizAnswers, b: QuizAnswers): MatchResult;
export function averageCompat(you: QuizAnswers, others: QuizAnswers[]): number | null; // rounded mean of scores; null if empty
```
**Must pass the test vectors in `03` section 6.1** (93, 83, 79, 78, 32, 26 for test user T).

## 3. API: `POST /api/ai/match-explain`
**Request body**
```json
{
  "youName": "Aman",
  "otherName": "Simran Kaur",
  "you":   { "sleep": "early", "cleanliness": "tidy", "food": "veg", "guests": "sometimes", "noise": "quiet", "social": "occasional", "substances": "none" },
  "other": { "sleep": "early", "cleanliness": "tidy", "food": "veg", "guests": "sometimes", "noise": "balanced", "social": "occasional", "substances": "none" }
}
```
**Server steps**
1. Validate both answer objects (every key present and a valid option value). Invalid → 400.
2. `const result = scoreMatch(you, other)` (**the score is never taken from the client**).
3. Build the prompt (below) and call `generateJSON`.
4. Validate/clamp output (below). On any error, build the fallback.
5. Return `{ ok: true, source, data: { score, label, dimensions, explanation } }`.

**Prompt text (build with real values):**
```
You explain roommate compatibility for a rental app called Aurelia. Be honest, warm and specific.
Rules:
- The score and label are already computed. Do NOT change or recalculate them. You may mention the score once at most.
- Use ONLY the facts listed below. Do not invent hobbies, jobs, personality or history for either person.
- Plain, simple English. No jargon. Each bullet must be 22 words or fewer.
- Always include at least one honest watch-out, even for a high score.
- Address the first person as "you". Refer to the other person by first name.

Person A (you): <youName>
Person B: <otherName>
Score: <score>/100 (<label>)

Aligned on:
<for each aligned: "- <label>: both <aLabel>"  or  "- <label>: <aLabel> and <bLabel>">

Differences to watch:
<for each watch: "- <label>: you are <aLabel>, <otherFirstName> is <bLabel>">

Return JSON with: headline (max 8 words), whyYouClick (2 to 3 bullets), watchOuts (1 to 2 bullets),
conversationStarters (exactly 2 friendly questions they could ask each other), houseRule (one practical rule they could agree on).
```

**Schema (`src/lib/ai/schemas.ts` → `matchExplainSchema`)**
```json
{
  "type": "object",
  "properties": {
    "headline": { "type": "string" },
    "whyYouClick": { "type": "array", "items": { "type": "string" }, "minItems": 2, "maxItems": 3 },
    "watchOuts": { "type": "array", "items": { "type": "string" }, "minItems": 1, "maxItems": 2 },
    "conversationStarters": { "type": "array", "items": { "type": "string" }, "minItems": 2, "maxItems": 2 },
    "houseRule": { "type": "string" }
  },
  "required": ["headline", "whyYouClick", "watchOuts", "conversationStarters", "houseRule"]
}
```
**Code validation:** trim all strings; `headline` ≤ 60 chars; each bullet ≤ 160 chars; arrays cut to max length; if a required field ends up empty, replace **that field** from the fallback.

**Fallback templates (`fallbacks.ts` → `matchExplainFallback(result, otherFirstName)`)**
- `headline` by label: Rare match → "A natural fit"; Strong match → "Likely to get along"; Workable → "Works with a few agreements"; Risky → "Talk first, decide later".
- `whyYouClick` (from `aligned`, up to 3; if empty, one line "You have more in common than the numbers show."): if `aLabel === bLabel` → `"You are both <aLabel lowercased> on <label lowercased>."` else → `"<label>: you are <aLabel lowercased>, <name> is <bLabel lowercased>. Close enough to work."`
- `watchOuts` (from `watch`): `"<label>: you are <aLabel lowercased>, <name> is <bLabel lowercased>. Agree on a simple rule early."`
- `conversationStarters`: `"What does a perfect Sunday at home look like for you?"` and `"How should we handle shared groceries and bills?"`
- `houseRule` by the first `watch` dimension key: sleep → "Quiet hours after 11 pm on weeknights." · cleanliness → "A 10-minute shared tidy-up every Sunday." · food → "Separate cooking tools and shelves for veg and non-veg food." · guests → "Tell the house a day before overnight guests." · noise → "Headphones after 10 pm." · social → "One house dinner a week, the rest is own time." · substances → "No smoking indoors. Drinking only if everyone agrees." · default → "A short house meeting once a month."

## 4. UI

### 4.1 People list (`/people`)
- Compute `scoreMatch(profile.answers, seedUser.answers)` for all 10 seed users, sort by score desc.
- Grid of `TiltCard`s: gradient avatar (`hsl(hue 70% 62%) → hsl(hue+40 70% 45%)`) with initials, name, age · occupation · city, bio line, score badge (number + label), and up to 2 "aligned" chips.
- Top card gets a subtle gold border glow.
- Card click → `/people/[id]`.

### 4.2 Match reveal (`/people/[id]`) — the "wow" screen
Sequence (use `motion`; total ≈ 3.5 s):
1. 0.0 s: dark screen, two blurred glowing orbs at far left (gold = you) and far right (the other person's hue).
2. 0.0–1.6 s: orbs drift toward the centre with a gentle spring; faint particle dust between them.
3. 1.6 s: orbs merge into one larger orb; a single ring pulse expands outward.
4. 1.2–3.4 s: big serif number counts up from 0 to `score` (ease-out), then the label fades in below ("Rare match").
5. 3.0 s onward: content cards fade/slide in with 120 ms stagger: headline, **Why you click**, **Watch out for**, **Conversation starters**, **A house rule to agree on**.
6. Below the cards: **Dimension rows** (7 rows). Each row: label, two small dots on a 3-step track (position = option index; gold = you, hue = them), and a similarity bar.
- The explain API call starts on mount, in parallel with the animation. If it has not returned by 3.0 s show shimmer skeletons in the cards.
- Loading line under the orbs while waiting: rotate "Reading the vibe…", "Comparing routines…", "Finding common ground…".
- Respect `prefers-reduced-motion`: skip drift, just fade.
- Small "AI" badge next to the headline when `source === "gemini"`.
- Button: **Back to people**.

## 5. Acceptance checklist
- [ ] Test vectors in `03` §6.1 all pass (write a tiny script or console assertions).
- [ ] People list is sorted, with sensible spread (about 26 to 93 for test user T).
- [ ] Reveal plays smoothly at 60 fps on a normal laptop.
- [ ] Turning off the network (or a wrong API key) still shows a full explanation from the fallback.
- [ ] The score shown never changes between the list and the reveal.
