# Generative card POC

Minimal Next.js proof of concept for a typed generative UI.

[View live demo](https://jev-ijmfigjrg-marcoss-projects-33f2b683.vercel.app/)

## Request flow

```mermaid
flowchart LR
    Q["Query + context"] --> API["POST /api/assistant"]
    API --> I["Typed intent"]
    I --> F["Fulfill with data APIs"]
    F --> C["Typed card"]
    C --> UI["Card component"]

    X["Timezone, locale, browser location, IP location"]
    X -.->|"startup context"| Q
```

Browser location requires permission. Timezone, locale, and coarse IP location
do not. Each request includes whatever context is available.

## Run

```bash
npm install
npm run dev
```

Create `.env.local` and add your server-only TypeSafe JEV key:

```bash
TYPESAFE_API_KEY=your_key_here
```

Open `http://localhost:3000`. When the key is present, the assistant route asks
JEV to select a card type. Without the key, it uses the local mock classifier.

For Vercel, add `TYPESAFE_API_KEY` under **Project Settings → Environment
Variables**, select the required environments, and redeploy. Do not use a
`NEXT_PUBLIC_` prefix because that would expose the key to browser code.

## Mock prompts

- `What is the weather?` renders a weather card.
- `What time is it?` renders a time card.
- `Show me news headlines` renders a news card.
- `Make me a plan` renders a checklist card.
- `Show a calendar` renders the `custom_card` placeholder.
- Any other query renders an info card.

`POST /api/assistant` accepts
`{ "query": "...", "context": { ... } }` and returns typed card data.

## Add a new card

1. Add card type in `lib/cards.ts`.
   - Add UI data shape, for example `SportsCard`.
   - Add intent shape to `AssistantIntent`, for example
     `{ card_type: "sports"; team?: string }`.
   - Add card to `AssistantCard` union.

2. Add backend decision + fulfillment in `app/api/assistant/route.ts`.
   - `queryDecisionApi()` returns new intent.
   - `fulfillIntent()` maps intent + context to full card data.
   - If data is missing, return best useful fallback data. Do not add
     clarification UI yet.

3. Add frontend renderer in `app/page.tsx`.
   - Create `SportsCardView`.
   - Add `case "sports_card"` in `CardView`.

4. Smoke test.

```bash
npm run build
```
