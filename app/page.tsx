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
    title: "Weather now",
    query: "What's the weather right now?",
  },
  {
    title: "Forecast",
    query: "What's the weather forecast for the next few days?",
  },
  {
    title: "Hourly chart",
    query: "Show me an hourly weather chart",
  },
] as const;
const cardClass =
  "animate-card-in rounded-3xl bg-surface p-7 max-sm:p-5";
const eyebrowClass =
  "mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
const bodyClass = "text-sm leading-relaxed text-muted-foreground";

function Icon({ name, className = "size-5" }: {
  name: "arrow" | "pin";
  className?: string;
}) {
  const paths = {
    arrow: <path d="M12 19V5m-6 6 6-6 6 6" />,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
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
      <section className={cardClass} key="current">
        <CardEyebrow emoji={emoji} label="Right now" />
        <p className="text-8xl font-bold tracking-[-0.07em] tabular-nums">
          {Math.round(card.data.current.temperature)}°<span className="ml-1 align-top text-2xl tracking-normal text-muted-foreground">{card.unit}</span>
        </p>
        <h3 className="mt-4 text-base font-medium">{card.data.current.condition}</h3>
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
        <span className="text-xs text-muted-foreground">Open-Meteo · °{card.unit}</span>
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
    ? "Location on"
    : context.ipLocation?.city
      ? `Near ${context.ipLocation.city}`
      : "Use location for weather";

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
      setLocationError("Location unavailable. Allow access in your browser settings and try again.");
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
      setError("We couldn't load your answer. Try again.");
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
    <main className="grid min-h-dvh place-items-center px-5 py-16 sm:px-8">
      <section className="w-full max-w-2xl" aria-labelledby="assistant-title">
        <h1 id="assistant-title" className={`mb-10 text-center font-black leading-none tracking-[-0.08em] ${hasResult ? "text-6xl" : "text-[clamp(5rem,16vw,8rem)]"}`}>
          Ask<span className="text-accent">.</span>
        </h1>

        <p className="sr-only" role="status">{loading ? "Getting your answer…" : card ? "Your answer is ready." : ""}</p>
        {hasResult && (
          <section className="mb-6" aria-label="Assistant response" aria-busy={loading}>
            {loading && (
              <div className="flex min-h-32 items-center justify-center gap-2" aria-label="Getting your answer">
                <span className="size-2.5 animate-thinking rounded-full bg-foreground" />
                <span className="size-2.5 animate-thinking rounded-full bg-foreground [animation-delay:120ms]" />
                <span className="size-2.5 animate-thinking rounded-full bg-foreground [animation-delay:240ms]" />
              </div>
            )}
            {error && (
              <div className={`${cardClass} text-center`}>
                <p role="alert" className="text-sm text-danger">{error}</p>
                <button type="button" className="mt-3 min-h-11 rounded-full px-5 text-sm font-bold underline underline-offset-4 disabled:opacity-40" disabled={locating} onClick={() => void submitQuery(submittedQuery)}>Try again</button>
              </div>
            )}
            {card && <CardView card={card} emoji={debug?.emoji ?? "✨"} />}
            {!loading && (
              <div className="mt-2 flex items-start justify-between gap-4 text-xs text-muted-foreground">
                {debug ? (
                  <details className="min-w-0 flex-1">
                    <summary className="w-fit cursor-pointer rounded-md py-4">Details</summary>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap pb-3 font-mono leading-5 [overflow-wrap:anywhere]">{JSON.stringify(debug, null, 2)}</pre>
                  </details>
                ) : <span />}
                <button type="button" onClick={startOver} className="min-h-11 shrink-0 rounded-md px-2 font-semibold hover:text-foreground">Clear</button>
              </div>
            )}
          </section>
        )}

        <form className="flex items-center gap-3 rounded-full bg-surface p-2.5 pl-6 focus-within:ring-2 focus-within:ring-foreground sm:pl-7" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="query">Ask a question</label>
          <input
            ref={inputRef}
            id="query"
            name="query"
            className="min-w-0 flex-1 bg-transparent py-3 text-base font-medium text-foreground outline-none placeholder:text-muted-foreground sm:text-lg"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What's on your mind?"
            autoComplete="off"
            readOnly={loading}
          />
          <button className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground sm:size-14" type="submit" disabled={!query.trim() || loading || locating} aria-label={loading ? "Getting your answer" : "Ask"}>
            <Icon name="arrow" className="size-6" />
          </button>
        </form>

        {!hasResult && (
          <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Example questions">
            {suggestions.map((suggestion) => (
              <button className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background disabled:cursor-wait disabled:opacity-40" key={suggestion.query} type="button" disabled={locating} onClick={() => void submitQuery(suggestion.query)}>
                {suggestion.title}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 text-center">
          <button type="button" onClick={() => void enableLocation()} disabled={locating || loading} aria-label={context.location ? "Refresh location for weather" : context.ipLocation?.city ? `Near ${context.ipLocation.city}. Use device location for weather` : "Use location for weather"} className="inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground disabled:cursor-wait disabled:opacity-40">
            <Icon name="pin" className="size-3.5 shrink-0" />
            {locating ? "Locating…" : locationLabel}
          </button>
          <span className="sr-only" role="status">{locating ? "Finding your location" : locationLabel}</span>
          {locationError && <p role="alert" className="mt-2 text-sm leading-relaxed text-danger">{locationError}</p>}
        </div>
      </section>
    </main>
  );
}
