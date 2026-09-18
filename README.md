# Generative card POC

Minimal Next.js proof of concept for a typed generative UI.

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
