# 07 — Feature: AI Listing Writer (text + optional photo)

Anyone can list a room (no host role). The user describes a room in a few words, optionally adds a photo, and Gemini writes a polished listing and a rent range. One click publishes it to Firestore, and it appears in Explore instantly.

**Principle:** Gemini writes the words and reads the photo. **Code** supplies the local rent benchmark and **clamps** the suggested rent, so the price is never wild.

## 1. Form (`/list`)
| Field | Control | Notes |
|---|---|---|
| City | chips: Rajpura, Zirakpur, Mohali, Chandigarh, Panchkula | required |
| Area | text | required, e.g. "Near Chitkara University", "Sector 22" |
| Room type | 3 chips: Private room, Shared room, Entire flat | required |
| Bedrooms in the flat (BHK) | stepper 1 to 5 | required |
| Furnished | toggle | default off |
| Food rule | 2 chips: Veg-only home, Any food | default Any |
| Vibe | 3 chips: Quiet, Balanced, Lively | default Balanced |
| Suitable for | 3 chips: Anyone, Women only, Men only | default Anyone |
| Your asking rent | number (₹ per month), optional | if empty, AI recommendation is used on publish |
| Describe it in your own words | textarea (≤ 500 chars) | e.g. "Corner room, big window, 5 min walk to campus, wifi included, I'm out most days" |
| Photo | file input (image/*) | optional |

Right side of the page: a **live preview card** that fills in as the user types, then switches to the generated result.

## 2. Photo handling (client side)
- Accept `image/jpeg`, `image/png`, `image/webp`.
- Resize on a `<canvas>` so the **longest side ≤ 1024 px**, export `image/jpeg` quality `0.8`.
- Produce two things: `base64` (without the `data:image/jpeg;base64,` prefix) for the AI request, and a **small cover** (longest side ≤ 640 px, quality `0.7`) as a data URL for saving in Firestore.
- Reject if the small cover data URL is larger than ~300 KB (re-encode at lower quality). Firestore documents are limited to 1 MB, and **Vercel limits request bodies to about 4.5 MB**, so never send the original file.
- **No Firebase Storage.** Do not add it.

## 3. API: `POST /api/ai/listing-writer`
**Request**
```json
{
  "city": "Rajpura",
  "area": "Near Chitkara University",
  "roomType": "private_room",
  "bhk": 2,
  "furnished": true,
  "foodRule": "veg_only",
  "vibe": "quiet",
  "suitableFor": "any",
  "askingRent": null,
  "notes": "Corner room, big window, 5 min walk to campus, wifi included",
  "imageBase64": "<optional, no data: prefix>",
  "imageMime": "image/jpeg"
}
```

### 3.1 Server steps
1. Validate inputs (required fields, enums, `notes` ≤ 500 chars).
2. **Benchmark:** the client also sends `benchmark: { median: number | null, count: number }` computed from all known listings (seed + Firestore) with the same `city` and `roomType` (median of `askingRent`). The server does not read Firestore. If `count === 0`, `median = null`.
3. Build the prompt text (below). If `imageBase64` is present, call Gemini with `input: [ {type:"image", mime_type: imageMime, data: imageBase64}, {type:"text", text: prompt} ]`, otherwise `input: prompt` (string).
4. Validate and clamp (section 3.4).
5. Return `{ ok, source, data }`.

### 3.2 Prompt text
```
You write rental listings for Aurelia, a shared-living app in Punjab/Chandigarh tricity, India. Write warm, honest, plain English.
STRICT RULES:
- Mention ONLY facts given in the details below or clearly visible in the attached photo (if any). Do NOT invent amenities, distances, appliances, or neighbours.
- If a detail is unknown, leave it out. Never write "spacious", "luxury" or "prime location" unless the host's words or the photo support it.
- No pressure language, no exaggerated claims. Do not mention religion, caste, or ethnicity.
- title: max 8 words. tagline: max 14 words. description: 70 to 110 words, 2 short paragraphs.
- tags: 5 to 8 lowercase tags. amenities: only what is stated or visible.
- idealRoommate: one sentence describing the kind of lifestyle that would fit, based on the vibe and food rule given.
- photoInsights: 0 to 4 short phrases of what you can actually see in the photo (empty list if no photo).
- Rent: the market benchmark is <median or "not available">. If available, suggested low/recommended/high must stay within 75% to 125% of it. If not available, give a sensible range for a student town in Punjab and say it is a rough estimate. All numbers are INR per month, whole numbers.
- rentRationale: one sentence explaining the range in plain words.

Details:
City: <city>
Area: <area>
Room type: <roomType label>
Bedrooms in the flat: <bhk>
Furnished: <yes/no>
Food rule: <label>
Vibe: <label>
Suitable for: <label>
Host's own words: "<notes>"
```

### 3.3 Schema (`listingWriterSchema`)
```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "tagline": { "type": "string" },
    "description": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" }, "minItems": 3, "maxItems": 8 },
    "amenities": { "type": "array", "items": { "type": "string" }, "maxItems": 8 },
    "idealRoommate": { "type": "string" },
    "photoInsights": { "type": "array", "items": { "type": "string" }, "maxItems": 4 },
    "suggestedRent": {
      "type": "object",
      "properties": {
        "low": { "type": "integer" },
        "recommended": { "type": "integer" },
        "high": { "type": "integer" }
      },
      "required": ["low", "recommended", "high"]
    },
    "rentRationale": { "type": "string" }
  },
  "required": ["title", "tagline", "description", "tags", "amenities", "idealRoommate", "photoInsights", "suggestedRent", "rentRationale"]
}
```

### 3.4 Code validation (never skip)
- Trim strings. `title` ≤ 70 chars, `tagline` ≤ 100, `description` ≤ 900, `idealRoommate` ≤ 200, `rentRationale` ≤ 200.
- `tags`: lowercase, trimmed, unique, 3 to 8 items. `amenities`: trimmed, unique, ≤ 8.
- Rent: if `median` exists, clamp `low`, `recommended`, `high` into `[0.75 × median, 1.25 × median]`, then enforce `low ≤ recommended ≤ high`. Round each to the nearest 100. Without a benchmark, clamp to `[1500, 60000]`.
- If any text field is empty after cleaning, replace that field from the fallback.

### 3.5 Fallback (`fallbacks.ts` → `listingWriterFallback(input, benchmark)`)
- `title`: `"<Room type label> in <Area>"` (for example "Private room in Near Chitkara University" → if area already starts with "Near", use "Private room near Chitkara University" by lowercasing "Near").
- `tagline`: `"A <vibe label lowercased> <food-rule phrase> home you can settle into."` where food-rule phrase = "veg-only" or "easy-going".
- `description`: `"<Room type label> in a <bhk>BHK <furnished/unfurnished> home in <Area>, <City>. <host notes as written>. <Food rule sentence>. The household is <vibe label lowercased>."`
- `tags`: from fields (vibe, food rule, room type, "furnished" if true, area words lowercased), up to 6.
- `amenities`: `["Furnished"]` if furnished; otherwise empty.
- `idealRoommate`: `"Someone who likes a <vibe> home and respects shared spaces."`
- `photoInsights`: `[]`.
- Rent: `recommended = median ?? askingRent ?? 7000`, `low = round100(recommended × 0.9)`, `high = round100(recommended × 1.1)`, `rentRationale = "Estimated from similar homes nearby."`

## 4. Result UI
- While waiting: themed loading lines ("Reading your photo…" only if a photo exists, "Finding the right words…", "Pricing it fairly…").
- Generated fields are **editable inline** (title, tagline, description, tags, amenities). The user can tweak before publishing.
- **Rent card:** a horizontal range bar low → high with a gold marker on `recommended`, labels in ₹, and the rationale line below. The marker can be dragged; the dragged value becomes the `askingRent`. If the user typed their own asking rent in the form, start the marker there.
- If `photoInsights` is not empty, show them as small "What I noticed in your photo" chips.
- Buttons: **Regenerate**, **Publish listing**.

## 5. Publish
Write to Firestore `listings` (auto id) a `Listing`:
```
ownerId: user.uid, ownerName: profile.displayName, title, tagline, description, city, area,
nearbyTags: [area.toLowerCase(), city.toLowerCase()],
roomType, bhk, furnished, askingRent, foodRule, vibe, suitableFor,
amenities, tags, residentIds: [], coverImage (small data URL, only if a photo was added),
gradientSeed: random integer 1..10, source: "user", createdAt: Date.now()
```
After success: confetti-free, elegant confirmation (gold check draws itself), button **View in Explore** → `/explore`. The new listing must be visible there without refresh (real-time `onSnapshot`).
Strip `undefined` fields before writing.

## 6. Acceptance checklist
- [ ] Text-only generation works; photo generation works with a 3 MB phone photo (resized first).
- [ ] The description never mentions an amenity that was not in the inputs or the photo (spot-check two runs).
- [ ] Suggested rent is always within 75–125% of the benchmark when one exists.
- [ ] With a bad API key, the fallback still produces a publishable listing.
- [ ] Published listing shows up in Explore and in Firestore `listings`.
