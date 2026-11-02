<div align="center">

# A U R E L I A
### *Find your people. Find your place.*

<p align="center">
  <strong>A cinematic, AI-powered rental and shared-living intelligence platform.</strong><br>
  Built with Next.js 15 App Router, React Three Fiber (Three.js v9), Gemini 3.8 Flash, and Cloud Firestore.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Gemini-3.8_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini 3.8 Flash" />
  <img src="https://img.shields.io/badge/Three.js-R3F_v9-black?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Next.js-15_(App_Router)-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Firebase-Auth_%26_Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/Tailwind-CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</p>

---

</div>

## ✦ The Core Thesis

> *"Finding a room is easy. Finding people you can live with is hard."*

Traditional rental platforms treat shared living as a real-estate catalog: square footage, deposit, and floor plans. But 90% of flatmate conflicts arise from mismatched circadian rhythms, conflicting food practices, cleanliness disputes, and awkward money friction.

**AURELIA** inverts this model. One unified profile powers your entire shared-living journey:
1. **Match with the humans** inside the home before touring the walls.
2. **Search in plain conversational language** without tedious multi-dropdown filter forms.
3. **List spare rooms in 30 seconds** with AI-crafted copy and median-benchmarked rents.
4. **Run your household post-move-in** with mathematically fair rent splits and debt-settlement algorithms.

---

## 🏛️ Architectural Overview

Aurelia operates on a **hybrid intelligence model**:
* **Deterministic Mathematical Engines:** Hard constraints, lifestyle compatibility scores (0–100%), and rent splits are computed by pure TypeScript math—**never hallucinated by an LLM**.
* **Generative Intelligence (Gemini 3.8 Flash):** The LLM translates natural language into structured filters and writes honest, empathetic human explanations for why people click and what boundaries they should agree on.

```
                              ┌─────────────────────────────────────────┐
                              │           AURELIA CORE SYSTEM           │
                              └────────────────────┬────────────────────┘
                                                   │
                ┌──────────────────────────────────┴──────────────────────────────────┐
                ▼                                                                     ▼
     [ Deterministic Engines ]                                            [ Gemini 3.8 Flash AI ]
  • 7-Dimension Compatibility Vector                                   • Living Persona Archetype (/onboarding)
  • Property & Resident Fit (60/40)                                    • Match Reveal & Watch-Outs (/people/[id])
  • Largest-Remainder Rent Split                                       • Natural Language Concierge (/explore)
  • Minimum-Transfer Debt Solver                                       • Vision Listing Generator (/list)
  • Tricity Median Rent Benchmarking                                   • Fair-Split Plain English Explainer (/home)
```

---

## ⚡ The 5 Signature Engines

### 1. Roommate Compatibility Engine & Cinematic Reveal
* **The Math:** Scores 7 normalized dimensions (Sleep, Cleanliness, Food, Guests, Acoustics, Social Energy, Substances) with weighted penalties (e.g. food habit conflict incurs a direct -10 penalty).
* **The AI:** Gemini 3.8 Flash reads both profiles and the pre-computed score to generate:
  * An editorial headline (e.g., *"A rare 93 match for quiet and tidy living"*)
  * *"Why you click"* (aligned daily rituals)
  * *"One honest watch-out"* (constructive boundaries)
  * Conversation starters & day-one house rule recommendations.

### 2. Conversational AI Concierge (`/explore`)
* Type natural-language sentences: *“Quiet 2BHK near campus under 18k with vegetarian roommates”*.
* Gemini 3.8 Flash extracts structured criteria (`bhk`, `maxRent`, `nearCampus`, `vegOnly`, `vibe`).
* Aurelia calculates a **60/40 transparent composite rank**:
  $$\text{Aurelia Fit} = (0.60 \times \text{Property Constraint Fit}) + (0.40 \times \text{Resident Compatibility})$$

### 3. AI Listing Writer Studio (`/list`)
* Hosts write two rough lines and optionally upload a photo.
* Photos are resized client-side via HTML5 Canvas (zero Firebase Storage costs).
* Gemini 3.8 Flash writes warm, factual copy and suggests fair monthly rent clamped to **75%–125% of the local tricity median**.

### 4. Household Operating System (`/home`)
* **Hand-Crafted SVG Rent Ring:** Multi-arc animated donut visualizing rent burdens.
* **Fair Rent Split:** Weighted algorithm factoring in room square footage, attached bathrooms, and private balconies using the **Largest-Remainder Rupee Method** (guaranteed exact sum).
* **Who Owes Whom Solver:** Solves the minimum number of bank transfers needed to clear all shared household ledgers.
* **Round-Robin Chores Rota:** Interactive rotation keeping shared living effortless.

### 5. Active Theory-Inspired 3D WebGL Hero (`/`)
* Built with `@react-three/fiber` (v9) and `three`.
* 460 particles (layered `<Sparkles>` + Float32 orbital stardust).
* Dual kinetic orbiting armillary spheres with smooth exponential mouse spring damping (`damp3`).
* Automatic fallback for reduced motion and non-WebGL environments.

---

## 🛠️ Tech Stack & Directory Structure

```
Aurelia/
├── app/
│   ├── page.tsx                  # 3D WebGL Landing Page & Bento Showcase
│   ├── login/page.tsx            # Google Auth + Instant Judge Demo
│   ├── onboarding/page.tsx       # 7-Step Lifestyle Quiz & Living Persona
│   ├── people/page.tsx           # Ranked Roommate Grid with FitBadges
│   ├── people/[id]/page.tsx      # Dual Orb Merge & Gemini Match Reveal
│   ├── explore/page.tsx          # AI Concierge & Ranked Home Feed
│   ├── explore/[id]/page.tsx     # Listing Detail & Housemate Breakdown
│   ├── list/page.tsx             # AI Listing Writer Studio & Live Preview
│   ├── home/page.tsx             # Rent Ring Chart, Chores & Debt Solver
│   └── api/ai/                   # Server-side Gemini 3.8 Flash Interactions API
├── components/
│   ├── three/HeroScene.tsx       # Active Theory R3F WebGL Scene
│   ├── ui/                       # FitBadge, TiltCard, Orb, LoadingLine
│   └── NavBar.tsx                # Glassmorphic Header & Mobile Dock
└── lib/
    ├── match.ts                  # Pure deterministic compatibility math
    ├── search.ts                 # 60/40 ranking and filter algorithms
    ├── household.ts              # Largest-remainder rent split & debt solver
    ├── seed.ts                   # Seed profiles & tricity listings
    └── ai/                       # Gemini SDK wrapper, schemas & fallbacks
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js** v20+ or v24+
* **npm** or **bun**
* **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/icodesAS/Aurelia.git
cd Aurelia

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🔒 Security & Offline Resilience

* **Zero Leaked Keys:** All `@google/genai` calls execute exclusively inside server-side Route Handlers (`/api/ai/*`). No API keys exist in client bundles.
* **Deterministic Fallbacks:** Every single AI endpoint features an offline deterministic fallback function. If an API key hits quota limits or network times out, the demo automatically and seamlessly switches to the fallback without error toasts.
* **Dual-Persistence Layer:** Real-time Cloud Firestore updates paired with instant `localStorage` caching ensures zero UI lag.

---

<div align="center">
  <p><strong>Team Triple bytes (Team 6)</strong> · Think2Build Hackathon · Chitkara University</p>
  <p><em>Crafted with precision for human harmony.</em></p>
</div>
