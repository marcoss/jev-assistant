"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type {
  AssistantCard,
  AssistantContext,
  AssistantLocation,
  AssistantResponse,
  ChecklistCard,
  CustomCard,
  InfoCard,
  NewsCard,
  SportsCard,
  TimeCard,
  WeatherCard,
  WeatherSection,
} from "@/lib/cards";

const suggestions = [
  {
    icon: "sun",
    title: "Step outside",
    description: "Check the weather right now",
    query: "What's the weather right now?",
  },
  {
    icon: "calendar",
    title: "Look ahead",
    description: "Plan for the next few days",
    query: "What's the weather forecast for the next few days?",
  },
  {
    icon: "chart",
    title: "Find your window",
    description: "See the hourly temperature trend",
    query: "Show me an hourly weather chart",
  },
] as const;
const cardClass =
  "animate-card-in rounded-2xl border border-border bg-card p-6 shadow-card max-sm:p-5";
const eyebrowClass =
  "mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
const bodyClass = "text-sm leading-relaxed text-muted-foreground";

function Icon({ name, className = "size-5" }: {
  name: "sun" | "calendar" | "chart" | "arrow" | "pin" | "spark";
  className?: string;
}) {
  const paths = {
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-14 5h3m4 0h3" /></>,
    chart: <><path d="M3 3v18h18M6 15l4-5 4 3 6-8" /><path d="M16 5h4v4" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    spark: <path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z" />,
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function getBrowserLocation(): Promise<AssistantLocation | undefined> {
  if (!("geolocation" in navigator)) return Promise.resolve(undefined);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "browser",
        });
      },
      () => resolve(undefined),
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 30, timeout: 5000 },
    );
  });
}

async function getIpLocation(): Promise<AssistantContext["ipLocation"]> {
  try {
    const response = await fetch("/api/location");
    if (!response.ok) return undefined;

    const data = (await response.json()) as {
      location?: AssistantContext["ipLocation"];
    };

    return data.location;
  } catch {
    return undefined;
  }
}

function CardEyebrow({ emoji, label }: { emoji: string; label: string }) {
  return (
    <p className={eyebrowClass}>
      <span aria-hidden="true">{emoji}</span> {label}
    </p>
  );
}

function InfoCardView({ card, emoji }: { card: InfoCard; emoji: string }) {
  return (
    <article className={cardClass}>
      <CardEyebrow emoji={emoji} label={card.eyebrow} />
      <h2 className="mb-2.5 text-2xl font-bold tracking-tight">{card.title}</h2>
      <p className={bodyClass}>{card.body}</p>
    </article>
  );
}

function WeatherCardView({ card, emoji }: { card: WeatherCard; emoji: string }) {
  const sections: Record<WeatherSection, React.ReactNode> = {
    current: (
      <section className={`${cardClass} bg-current-weather`} key="current">
        <CardEyebrow emoji={emoji} label="Right now" />
        <p className="text-7xl font-medium tracking-[-0.07em] tabular-nums">
          {Math.round(card.data.current.temperature)}°<span className="ml-1 align-top text-2xl tracking-normal text-muted-foreground">{card.unit}</span>
        </p>
        <h3 className="mt-4 text-base font-medium">{card.data.current.condition}</h3>
        <p className="mt-1 text-xs text-muted-foreground">Current conditions in your area</p>
      </section>
    ),
    forecast: (
      <section className={cardClass} key="forecast">
        <CardEyebrow emoji={emoji} label="Daily forecast" />
        <div className="grid grid-cols-4 divide-x divide-border">
          {card.data.forecast.map((day) => (
            <div className="grid gap-2 px-2 text-center text-sm text-muted-foreground first:pl-0 last:pr-0" key={day.day}>
              <h3 className="font-medium text-foreground">{new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day.day}T12:00:00Z`))}</h3>
              <span className="text-xs">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day.day}T12:00:00Z`))}</span>
              <p className="mt-3 text-2xl font-medium tracking-tight text-foreground tabular-nums"><span className="sr-only">High </span>{Math.round(day.high)}°</p>
              <span className="text-xs">Low {Math.round(day.low)}°</span>
            </div>
          ))}
        </div>
      </section>
    ),
    trend: (
      <section className={cardClass} key="trend">
        <CardEyebrow emoji={emoji} label="Hourly temperature" />
        <WeatherTrend points={card.data.trend} />
      </section>
    ),
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-medium">Weather for {card.location}</h2>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary">Open-Meteo · °{card.unit}</span>
      </div>
      {card.blocks.map((block) => block.component === block.data ? sections[block.data] : null)}
    </div>
  );
}

function WeatherTrend({ points }: { points: WeatherCard["data"]["trend"] }) {
  const temperatures = points.map((point) => point.temperature);
  const min = Math.min(...temperatures);
  const max = Math.max(...temperatures);
  const range = Math.max(max - min, 1);
  const line = points.map((point, index) =>
    `${20 + (index * 560) / Math.max(points.length - 1, 1)},${115 - ((point.temperature - min) / range) * 90}`,
  ).join(" ");

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">{Math.round(min)}°–{Math.round(max)}°C <span className="mx-1" aria-hidden="true">/</span> Next {points.length} hours</p>
      <svg viewBox="0 0 600 140" className="w-full" role="img" aria-label={`Hourly temperature ranges from ${Math.round(min)} to ${Math.round(max)} degrees Celsius`}>
        <path d="M20 25h560M20 70h560M20 115h560" stroke="var(--color-border)" strokeDasharray="4 6" />
        <polygon points={`20,130 ${line} 580,130`} fill="var(--color-primary-soft)" opacity="0.6" />
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
        {points.map((point, index) => <circle key={point.time} cx={20 + (index * 560) / Math.max(points.length - 1, 1)} cy={115 - ((point.temperature - min) / range) * 90} r="4" fill="var(--color-card)" stroke="var(--color-primary)" strokeWidth="2" />)}
      </svg>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{points[0].time.slice(11, 16)} · {Math.round(points[0].temperature)}°</span>
        <span>{points[points.length - 1].time.slice(11, 16)} · {Math.round(points[points.length - 1].temperature)}°</span>
      </div>
      <ul className="sr-only">{points.map((point) => <li key={point.time}>{point.time}: {point.temperature} degrees Celsius</li>)}</ul>
    </div>
  );
}

function TimeCardView({ card, emoji }: { card: TimeCard; emoji: string }) {
  return (
    <article className={cardClass}>
      <CardEyebrow emoji={emoji} label="Local time" />
      <h2 className="mb-2.5 text-2xl font-bold tracking-tight">
        {card.location}
      </h2>
      <p className="text-5xl font-bold tracking-[-0.06em]">{card.localTime}</p>
      <p className={`${bodyClass} mt-3`}>{card.timezone}</p>
    </article>
  );
}

function NewsCardView({ card, emoji }: { card: NewsCard; emoji: string }) {
  return (
    <article className={cardClass}>
      <CardEyebrow emoji={emoji} label="News" />
      <h2 className="mb-2.5 text-2xl font-bold tracking-tight">{card.topic}</h2>
      <div className="mt-5 grid gap-4 border-t border-border pt-4">
        {card.articles.map((article) => (
          <section
            className="grid gap-1"
            key={`${article.source}-${article.title}`}
          >
            <p className="text-sm font-bold text-primary">{article.source}</p>
            <h3 className="font-bold">{article.title}</h3>
            <p className={bodyClass}>{article.summary}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

function SportsCardView({ card, emoji }: { card: SportsCard; emoji: string }) {
  return (
    <article className={cardClass}>
      <CardEyebrow emoji={emoji} label="Sports" />
      <h2 className="mb-2.5 text-2xl font-bold tracking-tight">{card.topic}</h2>
      <div className="mt-5 grid gap-4 border-t border-border pt-4">
        {card.events.map((event) => (
          <section
            className="grid gap-1"
            key={`${event.league}-${event.title}`}
          >
            <p className="text-sm font-bold text-primary">{event.league}</p>
            <h3 className="font-bold">{event.title}</h3>
            <p className={bodyClass}>{event.status}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

function ChecklistCardView({
  card,
  emoji,
}: {
  card: ChecklistCard;
  emoji: string;
}) {
  return (
    <article className={cardClass}>
      <CardEyebrow emoji={emoji} label="Suggested steps" />
      <h2 className="mb-2.5 text-2xl font-bold tracking-tight">{card.title}</h2>
      <ol className="mt-5 grid list-none gap-3.5 p-0">
        {card.items.map((item, index) => (
          <li className="flex items-center gap-3" key={item}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
              {index + 1}
            </span>
            {item}
          </li>
        ))}
      </ol>
    </article>
  );
}

function CustomCardView({ card, emoji }: { card: CustomCard; emoji: string }) {
  return (
    <article className={`${cardClass} flex items-center gap-4 border-dashed`}>
      <div
        className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft text-2xl font-bold text-primary"
        aria-hidden="true"
      >
        +
      </div>
      <div>
        <CardEyebrow emoji={emoji} label="Custom component needed" />
        <h2 className="mb-2.5 text-lg font-bold tracking-tight">
          {card.message}
        </h2>
        <p className={bodyClass}>Requested: “{card.requestedUi}”</p>
      </div>
    </article>
  );
}

function CardView({ card, emoji }: { card: AssistantCard; emoji: string }) {
  switch (card.type) {
    case "weather_card":
      return <WeatherCardView card={card} emoji={emoji} />;
    case "time_card":
      return <TimeCardView card={card} emoji={emoji} />;
    case "news_card":
      return <NewsCardView card={card} emoji={emoji} />;
    case "sports_card":
      return <SportsCardView card={card} emoji={emoji} />;
    case "checklist_card":
      return <ChecklistCardView card={card} emoji={emoji} />;
    case "custom_card":
      return <CustomCardView card={card} emoji={emoji} />;
    case "info_card":
      return <InfoCardView card={card} emoji={emoji} />;
  }
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [card, setCard] = useState<AssistantCard | null>(null);
  const [debug, setDebug] = useState<AssistantResponse["debug"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState<AssistantContext>({});
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasResult = loading || Boolean(card) || Boolean(error);
  const locationLabel = context.location
    ? "Device location ready"
    : context.ipLocation?.city
      ? `Approximate area: ${context.ipLocation.city}`
      : "Local weather needs your location";

  useEffect(() => {
    let cancelled = false;
    const locale = navigator.language;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    setContext((currentContext) => ({ ...currentContext, locale, timezone }));
    void getIpLocation().then((ipLocation) => {
      if (cancelled || !ipLocation) return;
      setContext((currentContext) => ({ ...currentContext, ipLocation }));
    });

    return () => { cancelled = true; };
  }, []);

  async function enableLocation() {
    setLocating(true);
    setLocationError("");
    const location = await getBrowserLocation();
    if (location) {
      setContext((currentContext) => ({ ...currentContext, location }));
    } else {
      setLocationError("Location unavailable. Allow location in your browser settings, then try again. If your network supplies a city, we can use that instead.");
    }
    setLocating(false);
  }

  async function submitQuery(value: string) {
    const trimmedQuery = value.trim();
    if (!trimmedQuery || loading || locating) return;

    setQuery(trimmedQuery);
    setSubmittedQuery(trimmedQuery);
    setLoading(true);
    setError("");
    setCard(null);
    setDebug(null);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery, context }),
      });

      if (!response.ok) throw new Error("Request failed");

      const data = (await response.json()) as AssistantResponse;
      setCard(data.card);
      setDebug(data.debug);
    } catch {
      setError("We couldn't load your answer. Try again. For local weather, use the location button above if your area is not available.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuery(query);
  }

  function startOver() {
    setQuery("");
    setSubmittedQuery("");
    setCard(null);
    setDebug(null);
    setError("");
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 sm:px-10">
      <a className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:z-10 focus:rounded-lg focus:bg-card focus:p-3" href="#main">Skip to assistant</a>
      <header className="flex items-center justify-between border-b border-border py-6 sm:py-7">
        <a href="/" className="flex items-center gap-2.5 rounded-md text-primary" aria-label="Jev home">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-white"><Icon name="spark" className="size-5" /></span>
          <span className="text-2xl font-semibold tracking-[-0.06em]">jev<span className="text-muted-foreground">.</span></span>
        </a>
        <span className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">Interactive prototype</span>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 pb-16 pt-12 sm:pt-20">
        <section aria-labelledby="assistant-title">
          <div className="mb-9 text-center sm:mb-11">
            <p className="mb-5 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"><Icon name="spark" className="size-3.5" /> A little clarity, on demand</p>
            <h1 id="assistant-title" className="font-display text-[clamp(2.6rem,7vw,4.5rem)] leading-[1.08] tracking-[-0.045em]">Your day, <span className="text-primary italic">a little clearer.</span></h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">Ask a question. Get a useful view, not a wall of text.<br className="hidden sm:block" /> Start with the weather where you are.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-input">
            <form className="rounded-t-2xl p-4 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary sm:p-5" onSubmit={handleSubmit}>
              <label className="mb-3 block text-xs font-semibold text-primary" htmlFor="query">What would you like to know?</label>
              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  id="query"
                  name="query"
                  className="min-w-0 flex-1 bg-transparent py-3 text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-lg"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="What's the weather right now?"
                  autoComplete="off"
                  readOnly={loading}
                  aria-describedby="location-help"
                />
                <button className="flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40 sm:px-5" type="submit" disabled={!query.trim() || loading || locating} aria-label={loading ? "Getting your answer" : "Ask Jev"}>
                  <span className="hidden sm:inline">{loading ? "Thinking…" : "Ask Jev"}</span>
                  <Icon name="arrow" />
                </button>
              </div>
            </form>
            <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-border bg-surface px-4 py-2 text-xs text-muted-foreground rounded-b-2xl sm:px-5">
              <p id="location-help" role="status" className="flex items-center gap-2 py-2"><Icon name="pin" className="size-3.5 shrink-0" />{locationLabel}</p>
              <button type="button" onClick={() => void enableLocation()} disabled={locating || loading} className="min-h-11 rounded-md font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary disabled:cursor-wait disabled:opacity-50">{locating ? "Finding your location…" : context.location ? "Refresh location" : "Use my location"}</button>
            </div>
          </div>
          {locationError && <p role="alert" className="mt-3 text-sm leading-relaxed text-danger">{locationError}</p>}

          {!hasResult && (
            <section className="mt-9" aria-labelledby="suggestions-title">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 id="suggestions-title" className="text-xs font-medium text-muted-foreground">A few places to start</h2>
                <span className="flex items-center gap-1.5 text-[11px] text-primary"><span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />Live weather data</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {suggestions.map((suggestion) => (
                  <button className="group flex items-center gap-4 rounded-xl border border-border bg-card/60 p-4 text-left transition-colors hover:border-primary/40 hover:bg-card disabled:cursor-wait disabled:opacity-50 sm:block sm:p-5" key={suggestion.query} type="button" disabled={locating} onClick={() => void submitQuery(suggestion.query)}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary sm:mb-5"><Icon name={suggestion.icon} /></span>
                    <span className="block flex-1">
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold">{suggestion.title}<Icon name="arrow" className="size-4 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-1" /></span>
                      <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">{suggestion.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <p className="sr-only" role="status">{loading ? "Building your answer…" : card ? "Your answer is ready below." : ""}</p>
          {hasResult && (
            <section className="mt-8" aria-label="Assistant response" aria-busy={loading}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{loading ? "Working on" : "Your question"}</p>
                  <p className="text-sm leading-6 [overflow-wrap:anywhere]">{submittedQuery}</p>
                </div>
                <button type="button" onClick={startOver} disabled={loading} className="min-h-11 shrink-0 rounded-md text-xs font-medium text-primary underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40">Start over</button>
              </div>
              {loading && (
                <div className={`${cardClass} min-h-48`}>
                  <div className="mb-7 flex items-center gap-3">
                    <Icon name="spark" className="size-5 animate-thinking text-primary" />
                    <p className="text-sm font-medium">Building a useful view for you…</p>
                  </div>
                  <div aria-hidden="true" className="grid gap-3"><div className="h-7 w-1/3 rounded-md bg-primary-soft" /><div className="h-3 w-2/3 rounded bg-surface" /><div className="h-3 w-1/2 rounded bg-surface" /></div>
                </div>
              )}
              {error && (
                <div className="rounded-2xl border border-danger/25 bg-card p-6">
                  <div role="alert"><h2 className="font-semibold text-danger">No answer yet</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p></div>
                  <button type="button" className="mt-4 min-h-11 rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface disabled:opacity-50" disabled={locating} onClick={() => void submitQuery(submittedQuery)}>Try again</button>
                </div>
              )}
              {card && (
                <>
                  <CardView card={card} emoji={debug?.emoji ?? "✨"} />
                  {debug && (
                    <details className="mt-4 rounded-xl border border-border px-4 text-xs text-muted-foreground">
                      <summary className="cursor-pointer py-4 font-medium">Behind this answer <span className="ml-1 font-normal">· Developer details</span></summary>
                      <pre className="overflow-x-auto whitespace-pre-wrap pb-4 font-mono leading-6 [overflow-wrap:anywhere]">{JSON.stringify(debug, null, 2)}</pre>
                    </details>
                  )}
                </>
              )}
            </section>
          )}
          <p className="mx-auto mt-8 max-w-lg text-center text-xs leading-6 text-muted-foreground">A small experiment in generative UI. Weather uses live data;<br className="hidden sm:block" /> other responses demonstrate the available card types.</p>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-[11px] text-muted-foreground">
        <p>Built with Jev. Shaped around your question.</p>
        <p>One question. The right view.</p>
      </footer>
    </div>
  );
}
