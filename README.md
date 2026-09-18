# Generative card POC

Minimal Next.js proof of concept for a typed generative UI.

## Request flow

```mermaid
flowchart TD
    A[App starts] --> B[Collect locale and timezone]
    A --> C[Request browser location]
    A --> D[Get coarse IP location]

    C -->|Allowed| E[Latitude and longitude]
    C -->|Denied or unavailable| F[Continue without browser location]
    D --> G[City, region, and country]

    B --> H[Client context]
    E --> H
    F --> H
    G --> H

    I[User submits query] --> J[POST /api/assistant]
    H --> J
    J --> K[Classify query into typed intent]
    K --> L[Fulfill intent with context and external data]
    L --> M[Return typed card JSON]
    M --> N[Render matching card component]
```

Browser location requires user permission. Locale, timezone, and coarse IP
location do not show a browser permission prompt. Every assistant request sends
the latest available context.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Mock prompts

- `What is the weather?` renders a weather card.
- `What time is it?` renders a time card.
- `Show me news headlines` renders a news card.
- `Make me a plan` renders a checklist card.
- `Show a calendar` renders the `custom_card` placeholder.
- Any other query renders an info card.

`POST /api/assistant` accepts `{ "query": "...", "context": { ... } }` and returns typed card data.

## Add a new card

1. Add card type in `lib/cards.ts`.
   - Add UI data shape, for example `SportsCard`.
   - Add intent shape to `AssistantIntent`, for example `{ card_type: "sports"; team?: string }`.
   - Add card to `AssistantCard` union.

2. Add backend decision + fulfillment in `app/api/assistant/route.ts`.
   - `queryDecisionApi()` returns new intent.
   - `fulfillIntent()` maps intent + context to full card data.
   - If data is missing, return best useful fallback data. Do not add clarification UI yet.

3. Add frontend renderer in `app/page.tsx`.
   - Create `SportsCardView`.
   - Add `case "sports_card"` in `CardView`.

4. Smoke test.

```bash
npm run build
```
