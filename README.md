# Jev assistant

[Live demo](https://jev-beta.vercel.app/) · Next.js proof of concept for typed generative UI.

## Run locally

```bash
npm install
npm run dev
```

For Jev decisions, set `TYPESAFE_API_KEY=your_key` in `.env.local`.
Without key, local rules select components. Open `http://localhost:3000`.

## Try these prompts

- `What's the weather right now?` — current conditions first.
- `What's the weather forecast for the next few days?` — daily forecast first.
- `Show me an hourly weather chart` — temperature chart first.

Weather uses live Open-Meteo data, not mock values. Allow browser location
access; on Vercel, IP city can supply location. Jev selects and orders trusted
weather components. Other card types still use placeholder data.
