# 09 — UI Design System ("quiet luxury, cinematic")

**Feel:** a boutique hotel at night. Calm, warm, expensive. Lots of empty space. Gold used sparingly. Motion is slow and soft, never bouncy or flashy.

## 1. Design tokens (CSS variables in `src/app/globals.css`)
Define these as CSS variables on `:root`, and expose them to Tailwind the way the installed Tailwind version expects (Tailwind v4: `@theme` block in CSS; Tailwind v3: `tailwind.config` `theme.extend.colors`). Check which version `create-next-app` installed; do not mix both.

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0A0A0B` | page background |
| `--surface` | `#121214` | cards |
| `--surface-2` | `#1A1A1E` | raised cards, inputs |
| `--line` | `rgba(255,255,255,0.08)` | 1px borders |
| `--cream` | `#F4EFE6` | primary text |
| `--muted` | `#8E8A83` | secondary text |
| `--gold` | `#C9A96E` | primary accent, buttons, focus |
| `--gold-soft` | `#E8D5A8` | highlights, numbers |
| `--rose` | `#E7B7A8` | second accent (the "other person" orb default) |
| `--good` | `#8FD3A6` | success |
| `--bad` | `#E5756B` | errors, watch-outs |

Body: `background: var(--ink); color: var(--cream);`. Subtle page background: a very faint radial gold glow at the top (`radial-gradient(60% 40% at 50% 0%, rgba(201,169,110,0.10), transparent)`), plus a 3% noise overlay (inline SVG data URI) for texture.

## 2. Typography (`next/font/google`)
- Headings: **`Cormorant_Garamond`**, weights `['400','500','600','700']` (this font is not variable, so `weight` is required).
- Body/UI: **`Inter`**.
- Big numbers (score, rent): Cormorant, `font-variant-numeric: tabular-nums`.
- Scale: hero `clamp(3rem, 8vw, 7rem)`, h1 `3rem`, h2 `2rem`, body `1rem`, small `0.875rem`. Headings: `letter-spacing: -0.02em`, `line-height: 1.05`. Small caps labels: `0.75rem`, uppercase, `letter-spacing: 0.18em`, muted.

## 3. Shape, space, depth
- Radius: cards `20px`, buttons/inputs `14px`, chips `999px`.
- Border: 1px `--line`. Hover border: `rgba(201,169,110,0.4)`.
- Shadows: soft and dark, `0 20px 60px rgba(0,0,0,0.45)`. Gold glow only on the single most important element per screen: `0 0 40px rgba(201,169,110,0.25)`.
- Spacing: generous. Section padding `96px` desktop, `56px` mobile. Max content width `1200px`.
- Use `backdrop-blur` on the nav bar only (performance).

## 4. Components (`src/components/ui`)
| Component | Spec |
|---|---|
| `Button` | `primary` = gold fill, ink text, hover lifts 2px + soft glow; `ghost` = transparent, 1px line border, hover gold border; sizes `md`, `lg`. Pressed: scale 0.97. |
| `Card` | surface, 1px line, radius 20, padding 24. |
| `TiltCard` | wraps children; on mouse move tilts up to **6°** on X/Y with a spring (`stiffness 150, damping 15`), plus a soft light spot following the cursor. Disabled on touch and on reduced motion. |
| `Chip` | small pill, 1px line, 13px text; variants: neutral, gold, good, bad. |
| `Orb` | blurred radial-gradient circle with `mix-blend-mode: screen`, takes `hue` or colour. Used in match reveal. |
| `FitBadge` | circular SVG ring (progress = fit %) with the number in the centre, gold stroke. |
| `RingChart` | multi-arc SVG donut, `stroke-dasharray` transitions (0.7 s). Used in household. |
| `LoadingLine` | shimmering text that rotates through a list of messages every 1.4 s. |
| `Skeleton` | `--surface-2` with a moving highlight. |
| `GradientCover` | generated cover: 135° gradient from the 10 pairs below, overlaid with a faint architectural grid (SVG lines at 6% opacity) and a large soft circle highlight. |
| `AiBadge` | tiny pill "✦ AI" in gold, shown when `source === "gemini"`. |

**GradientCover pairs (index = `gradientSeed`):**
1 `#3b2a1e → #c9a96e` · 2 `#1e2a3b → #6ea3c9` · 3 `#2a1e3b → #a96ec9` · 4 `#3b1e2a → #c96e8a` · 5 `#1e3b2f → #6ec9a3` · 6 `#3b361e → #c9c06e` · 7 `#2f1e3b → #8a6ec9` · 8 `#1e3b3b → #6ec9c9` · 9 `#3b2a2a → #c98a6e` · 10 `#26261e → #b9b97a`

Avatars: initials on `linear-gradient(135deg, hsl(hue 70% 62%), hsl(hue+40 70% 45%))`.

## 5. Motion rules (`motion/react`)
- Wrap the app in `<MotionConfig reducedMotion="user">`.
- Default ease: `[0.22, 1, 0.36, 1]`. Durations: micro 0.2 s, entrances 0.5–0.8 s.
- Page enter: `opacity 0→1`, `y 16→0`. Stagger lists by 80–120 ms.
- Hover: lift `y −4`, border to gold at 40%. Buttons: scale 0.97 on press.
- Numbers count up using `animate(0, value, { duration: 2.2, ease: "easeOut", onUpdate })`.
- Only animate `transform` and `opacity` (plus SVG stroke). No layout-thrashing animations.
- All motion is client-side: files that use `motion` start with `"use client"`.

## 6. Global effects
- **`CursorGlow`:** a fixed 420 px radial gradient (gold at 8% opacity) following the mouse with a light spring; `pointer-events: none`; hidden on touch devices.
- **Focus ring:** `outline: 2px solid var(--gold); outline-offset: 3px` on `:focus-visible`.
- **Selection colour:** gold at 30%.

## 7. Landing hero (`/`) with React Three Fiber
- `HeroScene.tsx` is a client component. It is loaded **from another client component** with `dynamic(() => import("@/components/three/HeroScene"), { ssr: false })`. (`ssr: false` is not allowed inside a Server Component in recent Next.js.)
- Scene (keep it light):
  - `<Sparkles>` from drei: ~120 gold particles, slow drift.
  - Two floating glowing spheres (`<Float>` from drei, `meshStandardMaterial` with emissive gold and rose), slowly orbiting each other.
  - One thin wireframe torus ring rotating slowly behind them.
  - Camera parallax: `useFrame` eases the camera towards the mouse position (±0.6 units).
  - Lights: one ambient (low) + one point light (gold).
- `Canvas` props: `dpr={[1, 1.5]}`, `gl={{ antialias: true, powerPreference: "high-performance" }}`, `camera={{ position: [0, 0, 6], fov: 45 }}`. Wrap in `<Suspense fallback={null}>`.
- **Fallbacks:** if WebGL fails or `prefers-reduced-motion` is on, render the same page with a static CSS gradient background and two blurred `Orb`s.
- **Do not use** `MeshTransmissionMaterial`, post-processing, or any HDR environment map (they are slow on judges' laptops or need extra downloads).
- Overlay content (above the canvas): small-caps "AURELIA", the tagline **"Find your people. Find your place."** animating in word by word (80 ms apart), one supporting line ("AI that matches people, not just properties."), and the primary **Begin** button (→ `/explore` if signed in, otherwise `/login`).
- A faint scroll hint and 3 short feature teasers below the fold (Match, Concierge, Home), each a `TiltCard`.

## 8. Page-by-page (visual intent)
| Route | Intent |
|---|---|
| `/login` | Centered card on the dim hero background. Two buttons: **Continue as guest** (large, gold) and **Continue with Google** (ghost). One line of reassurance: "No spam. Guest mode saves nothing outside this demo." |
| `/onboarding` | Full-screen, one question per screen, huge serif question, option cards (min-height 72px) with a gold check when selected, thin gold progress line on top. |
| `/explore` | Concierge box hero at top, results grid (3 columns desktop, 1 mobile), `ListingCard`s with `FitBadge`. |
| `/explore/[id]` | Large gradient/photo cover, serif title, facts row, housemate cards with compat %. |
| `/people` | `TiltCard` grid of people with score badges. |
| `/people/[id]` | The match reveal (see `05` §4.2). Nothing else competes for attention until the orbs finish. |
| `/list` | Two columns: form left, live preview card right. |
| `/home` | Dashboard with the ring chart as the visual centrepiece. |

## 9. The 5 "wow" moments (do these well; skip extras)
1. **Hero:** drifting particles + two orbiting glow spheres + tagline word-by-word.
2. **Match reveal:** two orbs merge, ring pulse, score counts up (see `05`).
3. **Concierge thinking:** filter chips pop in one by one from the real parsed filters, then cards stagger in (see `06`).
4. **Tilt cards:** every card in People and Explore.
5. **Rent ring morph:** switching Fair/Equal reshapes the arcs smoothly (see `08`).

## 10. Copy tone and loading messages
Short, warm, plain English. No jargon, no exclamation-mark overload. Sentence case.
- Onboarding: "Reading your vibe…"
- Match: "Reading the vibe…", "Comparing routines…", "Finding common ground…"
- Concierge: "Understanding your request…", "Matching homes with people like you…"
- Listing: "Reading your photo…", "Finding the right words…", "Pricing it fairly…"
- Household: "Setting up your home…"
- Fallback toast (when `source === "fallback"`): "That took a moment longer than expected, so here is a quick version." Show it quietly, not as an error.
- Empty states have one sentence and one button.

## 11. Responsive and accessibility
- Design desktop-first at 1280–1920 px; must be fully usable at 390 px wide.
- Under 768 px the nav becomes a fixed bottom bar with icons (`lucide-react`): Explore (Compass), People (Users), List (PlusCircle), Home (Home).
- Text contrast: cream on ink and gold on ink both pass; do not put `--muted` on `--surface-2` for body text.
- Every interactive element is keyboard reachable; the quiz works with Tab + Enter/Space.
- Images (user covers) get `alt` text from the listing title. Icons that carry meaning get `aria-label`.

## 12. Performance rules
- Only one `<Canvas>` in the whole app (landing). It unmounts on route change.
- No external images or fonts except `next/font`. No video.
- Keep client bundles small: import icons by name from `lucide-react`; use `next/dynamic` for `HeroScene` only.
- Test on a throttled laptop: the landing page must stay smooth (aim ≥ 45 fps).
