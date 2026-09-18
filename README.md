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
- `Make me a plan` renders a checklist card.
- `Show a calendar` renders the `custom_card` placeholder.
- Any other query renders an info card.

`POST /api/assistant` accepts `{ "query": "..." }` and returns typed card data.
