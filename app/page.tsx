"use client";

import { FormEvent, useEffect, useState } from "react";
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
  "What's the weather right now?",
  "What's the weather forecast for the next few days?",
  "Show me an hourly weather chart",
];
const cardClass =
  "animate-card-in rounded-3xl border border-border bg-card p-7 shadow-card max-sm:p-5";
const eyebrowClass =
  "mb-2 text-xs font-bold uppercase tracking-[0.12em] text-primary";
const bodyClass = "leading-relaxed text-muted-foreground";

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
        <CardEyebrow emoji={emoji} label="Current weather" />
        <h3 className="text-5xl font-bold tracking-tight">
          {Math.round(card.data.current.temperature)}°{card.unit}
        </h3>
        <p className={`${bodyClass} mt-2`}>{card.data.current.condition}</p>
      </section>
    ),
    forecast: (
      <section className={cardClass} key="forecast">
        <CardEyebrow emoji={emoji} label="Daily forecast" />
        <div className="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
          {card.data.forecast.map((day) => (
            <div className="grid gap-1 text-sm text-muted-foreground" key={day.day}>
              <span>{new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day.day}T12:00:00Z`))}</span>
              <strong className="text-base text-foreground">{Math.round(day.high)}°</strong>
              <span>Low {Math.round(day.low)}°</span>
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
    <div className="grid gap-3">
      <h2 className="px-2 text-xl font-bold">Weather for {card.location}</h2>
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
      <svg viewBox="0 0 600 140" className="w-full" role="img" aria-label={`Temperature rises to ${Math.round(max)} degrees and falls to ${Math.round(min)} degrees Celsius over the next 12 hours`}>
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
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
  const [card, setCard] = useState<AssistantCard | null>(null);
  const [debug, setDebug] = useState<AssistantResponse["debug"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState<AssistantContext>({});

  useEffect(() => {
    let cancelled = false;
    const locale = navigator.language;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    setContext((currentContext) => ({
      ...currentContext,
      locale,
      timezone,
    }));

    void getIpLocation().then((ipLocation) => {
      if (cancelled || !ipLocation) return;

      setContext((currentContext) => ({
        ...currentContext,
        ipLocation,
      }));
    });

    void getBrowserLocation().then((location) => {
      if (cancelled || !location) return;

      setContext((currentContext) => ({
        ...currentContext,
        location,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitQuery(value: string) {
    const trimmedQuery = value.trim();
    if (!trimmedQuery || loading) return;

    setLoading(true);
    setError("");

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
      setError("Could not load this response. For weather, allow location access or use a network that provides your city.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuery(query);
  }

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12 max-sm:px-3.5 max-sm:py-8">
      <section className="w-full max-w-2xl" aria-labelledby="assistant-title">
        <div className="mb-8 flex justify-center">
          <h1 id="assistant-title" className="sr-only">
            Assistant
          </h1>
          <svg
            className="size-20 text-primary"
            viewBox="0 0 96 96"
            fill="none"
            role="img"
            aria-label="Assistant"
          >
            <path
              d="M48 24V14m-7 0h14"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <rect
              x="14"
              y="24"
              width="68"
              height="58"
              rx="20"
              fill="var(--color-primary-soft)"
              stroke="currentColor"
              strokeWidth="5"
            />
            <circle cx="36" cy="50" r="5" fill="currentColor" />
            <circle cx="60" cy="50" r="5" fill="currentColor" />
            <path
              d="M35 66c4 4 8 6 13 6s9-2 13-6"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="mb-6 empty:hidden" aria-live="polite">
          {loading && (
            <div
              className="animate-card-in flex justify-center gap-2 rounded-3xl border border-border bg-card p-9 shadow-card"
              aria-label="Generating response"
            >
              <span className="size-2 animate-thinking rounded-full bg-primary" />
              <span className="size-2 animate-thinking rounded-full bg-primary [animation-delay:120ms]" />
              <span className="size-2 animate-thinking rounded-full bg-primary [animation-delay:240ms]" />
            </div>
          )}
          {!loading && error && (
            <p className="text-center text-danger">{error}</p>
          )}
          {!loading && card && (
            <>
              <CardView card={card} emoji={debug?.emoji ?? "✨"} />
              {debug && (
                <details className="mt-3 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-bold text-foreground">
                    Debug info
                  </summary>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono">
                    {JSON.stringify(debug, null, 2)}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>

        <form
          className="flex gap-2.5 rounded-2xl border border-border bg-card p-2 shadow-input focus-within:border-primary focus-within:ring-3 focus-within:ring-primary-soft"
          onSubmit={handleSubmit}
        >
          <label className="sr-only" htmlFor="query">
            Ask the assistant
          </label>
          <input
            id="query"
            name="query"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-foreground outline-none placeholder:text-muted-foreground/65"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask anything…"
            autoComplete="off"
          />
          <button
            className="rounded-xl bg-foreground px-5 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 max-sm:px-4"
            type="submit"
            disabled={!query.trim() || loading}
          >
            {loading ? "Thinking…" : "Ask"}
          </button>
        </form>

        {!card && !loading && (
          <div
            className="mt-4 flex flex-wrap justify-center gap-2"
            aria-label="Example queries"
          >
            {suggestions.map((suggestion) => (
              <button
                className="rounded-full border border-border bg-transparent px-3 py-2 text-sm text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                key={suggestion}
                type="button"
                onClick={() => {
                  setQuery(suggestion);
                  void submitQuery(suggestion);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
