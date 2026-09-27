# Generative card POC

Minimal Next.js proof of concept for a typed generative UI.

[View live demo](https://jev-beta.vercel.app/)

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
JEV to select a card type. For weather, it also selects and orders trusted
current, daily forecast, and hourly chart components using live Open-Meteo
data. Without the key, local rules choose the weather layout. Weather needs
browser location access or a city from Vercel IP headers; no weather values are
mocked.

## Mock prompts

- `What is the weather?` renders live current weather and forecast.
- `Show an hourly weather chart` renders a live temperature chart.
- `What time is it?` renders a time card.
- `Show me news headlines` renders a news card.
- `Show me sports scores` renders a sports card.
- `Make me a plan` renders a checklist card.
- `Show a calendar` renders the `custom_card` placeholder.
- Any other query renders an info card.

`POST /api/assistant` accepts
`{ "query": "...", "context": { ... } }` and returns typed card data.
Weather responses include an ordered `blocks` array with references to
validated `data` sections. Other card types still use placeholder data.

## Add a new card

1. Add card type in `lib/cards.ts`.
   - Add UI data shape, for example `FinanceCard`.
   - Add intent shape to `AssistantIntent`, for example
     `{ card_type: "finance"; symbol?: string }`.
   - Add card to `AssistantCard` union.

2. Add backend decision + fulfillment in `app/api/assistant/route.ts`.
   - `queryDecisionApi()` returns new intent.
   - `fulfillIntent()` maps intent + context to full card data.
   - If data is missing, return best useful fallback data. Do not add
     clarification UI yet.

3. Add frontend renderer in `app/page.tsx`.
   - Create `FinanceCardView`.
   - Add `case "finance_card"` in `CardView`.

4. Smoke test.

```bash
npm run build
```
