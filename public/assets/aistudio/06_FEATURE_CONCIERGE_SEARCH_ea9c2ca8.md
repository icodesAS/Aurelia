# 06 — Feature: AI Concierge (Natural-Language Search)

**Principle:** Gemini only **understands the sentence** (turns it into filters). **Code** does the filtering and ranking. Results are therefore fast, repeatable, and explainable ("why this home").

Flow: `sentence → POST /api/ai/concierge → filters → rankListings() in the browser → animated results`.

## 1. API: `POST /api/ai/concierge`
**Request**
```json
{ "query": "Quiet 2BHK near campus under 18k with vegetarian roommates" }
```
**Response `data`**
```json
{
  "assistantMessage": "Looking for a quiet 2BHK near campus under ₹18,000 with vegetarian housemates.",
  "filters": {
    "areaKeywords": [],
    "nearLandmark": "campus",
    "maxRent": 18000,
    "bhk": 2,
    "roomType": "unspecified",
    "furnished": null,
    "foodRule": "veg_only",
    "vibe": "quiet",
    "suitableFor": "unspecified"
  }
}
```

### 1.1 Schema (`conciergeSchema`)
```json
{
  "type": "object",
  "properties": {
    "assistantMessage": { "type": "string" },
    "filters": {
      "type": "object",
      "properties": {
        "areaKeywords": { "type": "array", "items": { "type": "string" } },
        "nearLandmark": { "type": ["string", "null"] },
        "maxRent": { "type": ["integer", "null"] },
        "bhk": { "type": ["integer", "null"] },
        "roomType": { "type": "string", "enum": ["private_room", "shared_room", "entire_flat", "unspecified"] },
        "furnished": { "type": ["boolean", "null"] },
        "foodRule": { "type": "string", "enum": ["veg_only", "any", "unspecified"] },
        "vibe": { "type": "string", "enum": ["quiet", "balanced", "lively", "unspecified"] },
        "suitableFor": { "type": "string", "enum": ["any", "women_only", "men_only", "unspecified"] }
      },
      "required": ["areaKeywords", "nearLandmark", "maxRent", "bhk", "roomType", "furnished", "foodRule", "vibe", "suitableFor"]
    }
  },
  "required": ["assistantMessage", "filters"]
}
```

### 1.2 Prompt text
```
You turn a renter's sentence into search filters for a rental app in the Chandigarh tricity area of India (Rajpura, Zirakpur, Mohali, Chandigarh, Panchkula).
Rules:
- Extract ONLY what the sentence says. If something is not mentioned, use null, an empty list, or "unspecified". Never guess.
- Prices are monthly rent in Indian rupees. "18k" = 18000. "1 lakh" = 100000.
- "2BHK" / "2 bhk" / "two bedroom" -> bhk = 2.
- "near campus", "near college", "near university", "near Chitkara" -> nearLandmark = "campus".
- City or area names go into areaKeywords in lowercase (for example "rajpura", "mohali"). Do not put "campus" there.
- quiet / peaceful / calm / study-friendly -> vibe "quiet". lively / social / party / fun -> vibe "lively". relaxed but not loud -> "balanced".
- vegetarian / veg / pure veg / veg roommates -> foodRule "veg_only". Otherwise "unspecified".
- girls / women / ladies -> suitableFor "women_only". boys / men / gents -> "men_only". Otherwise "unspecified".
- own room / private room -> roomType "private_room". sharing / shared -> "shared_room". whole flat / entire flat -> "entire_flat".
- assistantMessage: ONE sentence, at most 25 words, restating what the person wants. Do not claim any results exist.

Sentence: "<query>"
```

### 1.3 Code validation (after the model responds)
- `query` must be a non-empty string ≤ 300 chars, else 400.
- `maxRent`: if present, clamp to `[1000, 200000]`. `bhk`: if present, clamp to `[1, 6]`.
- `areaKeywords`: lowercase, trimmed, unique, max 4, drop empty strings and the word "campus".
- `assistantMessage` trimmed, ≤ 200 chars; if empty use `"Here is what I found for you."`.

### 1.4 Fallback parser (`fallbacks.ts` → `parseQueryFallback(query)`)
Runs when Gemini fails. Lowercase the sentence, then:
| Field | Rule |
|---|---|
| `maxRent` | First match of `/(?:under|below|upto|up to|max|within|less than)\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(k|thousand)?/` → number × 1000 if suffix k/thousand, else as is. Else a standalone `/(\d+(?:\.\d+)?)\s*k\b/` → × 1000. |
| `bhk` | `/(\d)\s*-?\s*bhk/` |
| `nearLandmark` | `"campus"` if text contains campus, college, university or chitkara |
| `foodRule` | `"veg_only"` if matches `/\b(veg|vegetarian|pure veg)\b/` and does not match `/non[- ]?veg/` |
| `vibe` | quiet/peaceful/calm/study → `quiet`; lively/social/party/fun → `lively` |
| `suitableFor` | test women first: `/\b(girls?|women|ladies|female)\b/` → `women_only`; then `/\b(boys?|men|gents|male)\b/` → `men_only` |
| `roomType` | `/whole flat|entire flat|full flat/` → `entire_flat`; `/private room|own room|single room/` → `private_room`; `/shared|sharing/` → `shared_room` |
| `furnished` | `true` if `/\bfurnished\b/` and not `/unfurnished/` |
| `areaKeywords` | each of `rajpura, zirakpur, mohali, chandigarh, panchkula` found in the text |
`assistantMessage` = `"Here is what I found for you."`

### 1.5 Profile defaults
If **every** filter is empty/unspecified/null (for example the user typed "find me a place"), the client fills `maxRent = profile.budgetMax` and `areaKeywords = [profile.city.toLowerCase()]`.

## 2. Ranking engine (`src/lib/search.ts`) — pure functions

```ts
export interface Filters {
  areaKeywords: string[]; nearLandmark: string | null; maxRent: number | null; bhk: number | null;
  roomType: RoomType | "unspecified"; furnished: boolean | null;
  foodRule: "veg_only" | "any" | "unspecified";
  vibe: Noise | "unspecified"; suitableFor: SuitableFor | "unspecified";
}
export interface RankedListing {
  listing: Listing;
  constraintScore: number;      // 0..1
  residentCompat: number | null; // rounded mean compat with residents, or null
  fit: number;                  // 0..100  "Aurelia Fit"
  reasons: string[];            // what matched (max 3 shown)
  misses: string[];             // what did not (max 2 shown)
}
export function rankListings(listings: Listing[], f: Filters, you: QuizAnswers | null, seedUsers: SeedUser[]): RankedListing[];
```

### 2.1 Hard exclusion
If `suitableFor` is `women_only` or `men_only`: keep only listings whose `suitableFor` equals it **or** is `"any"`. All other filters are soft.

### 2.2 Soft criteria (only **active** criteria count)
| Criterion | Weight | Active when | Credit |
|---|---|---|---|
| Location | 0.25 | `nearLandmark` set or `areaKeywords` non-empty | Make a list of sub-checks. **Landmark:** split `nearLandmark` into words of ≥ 4 letters; satisfied if any word appears in `nearbyTags.join(" ")`, `area`, or `title` (lowercase). **Each area keyword:** satisfied if it appears in `city + area + title + nearbyTags` (lowercase). Credit = satisfied sub-checks ÷ total sub-checks. |
| Rent | 0.25 | `maxRent != null` | `1` if `askingRent ≤ maxRent`; `0.5` if `askingRent ≤ maxRent × 1.10`; else `0` |
| BHK | 0.15 | `bhk != null` | `1` if `listing.bhk === bhk`, else `0` |
| Room type | 0.10 | `roomType != "unspecified"` | `1` if equal, else `0` |
| Food | 0.10 | `foodRule === "veg_only"` | `1` if `listing.foodRule === "veg_only"`; else `0.7` if the listing has ≥ 1 resident and **all** residents' `answers.food === "veg"`; else `0` |
| Vibe | 0.10 | `vibe != "unspecified"` | `1` if equal, else `0` (no partial credit) |
| Furnished | 0.05 | `furnished != null` | `1` if equal, else `0` |

`constraintScore = Σ(weight × credit) ÷ Σ(weight of active criteria)`. If no criteria are active, `constraintScore = 1`.

### 2.3 Resident compatibility and final fit
- `residents` = `listing.residentIds` mapped to `seedUsers` (ignore unknown ids).
- `residentCompat = averageCompat(you, residents.map(r => r.answers))` (from `match.ts`), or `null` if none or `you` is null.
- `fit = residentCompat != null ? Math.round(0.6 × constraintScore × 100 + 0.4 × residentCompat) : Math.round(constraintScore × 100)`

### 2.4 Order and size
Sort by `fit` desc; tie-break by lower `askingRent`. Return the top 6.

### 2.5 Reason strings (examples; keep them short and plain)
- Location ok → `"Near campus"` or `"In <Area>"`
- Rent ok → `"₹7,500 a month, within your budget"`; partial → `"Slightly above budget (₹X)"`
- BHK ok → `"2BHK home"`
- Food ok → `"Veg-only home"`, or (0.7 credit) `"Housemates all eat vegetarian"`
- Vibe ok → `"Quiet household"` / `"Balanced household"` / `"Lively household"`
- `residentCompat ≥ 70` → `"Lives with people you'd likely click with"`
- Miss examples → `"Not a veg-only home"`, `"Lively vibe (you asked for quiet)"`, `"Above your budget"`.

**Must pass test vector `03` §6.2.**

## 3. UI (`/explore`)
1. **Concierge box** at the top: large input, gold focus glow, placeholder cycling through 3 example queries. Under it, three suggestion chips (clicking runs the search). Example chips:
   - `Quiet 2BHK near campus under 18k with vegetarian roommates`
   - `Private furnished room in Mohali under 13k`
   - `Women-only room in Chandigarh under 6k`
2. On submit, show a vertical "thinking" sequence (each line fades in, 400–600 ms apart):
   - `Understanding your request…`
   - Parsed **filter chips** pop in one by one from the real `filters` object: `2BHK`, `Near campus`, `Under ₹18,000`, `Quiet`, `Veg-only`.
   - `Matching homes with people like you…`
3. Result cards animate in with a 100 ms stagger. Each `ListingCard` shows: generated gradient cover (from `gradientSeed`, or `coverImage` if present), title, area + city, `₹asking/month`, **Aurelia Fit %** (ring or badge), up to 3 `reasons` as chips, up to 1 `miss` in a muted style, and resident avatar circles.
4. Below results, a quiet heading "All homes" with the remaining listings (no filter), sorted by fit using no filters.
5. With no query, the page shows "All homes" sorted by fit (using the user's quiz).
6. Listing data = `[...seedListings, ...firestoreListings]` (Firestore via `onSnapshot`). If Firestore fails, silently use seed only.

### 3.1 Listing detail (`/explore/[id]`)
Find the listing in seed or via `getDoc(doc(db, "listings", id))`. Show: cover, title, tagline, description, amenities, tags, rent, food rule, vibe. Section **"Your future housemates"**: resident cards with name, occupation, **compat % with you**, link to `/people/[id]`. Button **Move in (demo)** → creates a household (see `08`).

## 4. Acceptance checklist
- [ ] The three example chips each return sensible, different results.
- [ ] Test vector `03` §6.2 passes.
- [ ] Typing a nonsense query ("asdf") shows all homes with a friendly line, no crash.
- [ ] With the Gemini key removed, searching still works via the fallback parser.
- [ ] A listing published from `/list` appears in Explore without a page refresh.
