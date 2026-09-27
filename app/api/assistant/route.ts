import { NextResponse } from "next/server";
import type {
  AssistantCard,
  AssistantContext,
  AssistantIntent,
  AssistantRequest,
  AssistantResponse,
  JevChoiceDebug,
  WeatherCard,
  WeatherData,
  WeatherSection,
} from "@/lib/cards";

function formatLocation(context?: AssistantContext) {
  const location = context?.location;
  const ipLocation = context?.ipLocation;

  if (location?.zipCode) return `ZIP ${location.zipCode}`;
  if (location?.city && location.region)
    return `${location.city}, ${location.region}`;
  if (location?.city) return location.city;
  if (
    typeof location?.latitude === "number" &&
    typeof location.longitude === "number"
  ) {
    return `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;
  }
  if (ipLocation?.city && ipLocation.region)
    return `${ipLocation.city}, ${ipLocation.region}`;
  if (ipLocation?.city) return ipLocation.city;
  return "your area";
}

function mockDecision(query: string): AssistantIntent {
  const prompt = query.toLowerCase();

  if (prompt.includes("weather")) {
    return { card_type: "weather" };
  }

  if (/time|clock/.test(prompt)) {
    return { card_type: "time" };
  }

  if (/news|headline|headlines/.test(prompt)) {
    return { card_type: "news", topic: query };
  }

  if (
    /sports|score|game|match|nba|nfl|mlb|nhl|soccer|football|basketball|baseball|hockey/.test(
      prompt,
    )
  ) {
    return { card_type: "sports", topic: query };
  }

  if (/plan|steps|checklist|todo/.test(prompt)) {
    return { card_type: "checklist", topic: query };
  }

  if (/chart|map|timer|calendar/.test(prompt)) {
    return { card_type: "unsupported", requested_ui: query };
  }

  return {
    card_type: "info",
    title: "Here is a concise answer",
    body: `You asked: “${query}” This card is generated from typed mock data returned by the API.`,
  };
}

type JevAnswer = {
  choice?: unknown;
  probabilities?: Record<string, number>;
  confidence?: number;
};

type JevResponse = { answers?: Record<string, JevAnswer> };
type JevDebug = NonNullable<AssistantResponse["debug"]["jev"]>;

function debugAnswer(answer: JevAnswer): JevChoiceDebug {
  return {
    ...(typeof answer.choice === "string" ? { choice: answer.choice } : {}),
    ...(answer.probabilities ? { probabilities: answer.probabilities } : {}),
    ...(typeof answer.confidence === "number" ? { confidence: answer.confidence } : {}),
  };
}

async function askJev(state: Record<string, unknown>, questions: Record<string, unknown>): Promise<JevResponse> {
  const response = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "jev-latest", state, questions }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`JEV request failed with status ${response.status}.`);
  }
  return (await response.json()) as JevResponse;
}

const weatherSections = ["current", "forecast", "trend"] as const;

function isWeatherSection(value: unknown): value is WeatherSection {
  return weatherSections.some((section) => section === value);
}

async function composeWeather(query: string, data: WeatherData, debug: JevDebug): Promise<WeatherCard["blocks"]> {
  let focus: WeatherSection;
  let included: WeatherSection[];

  if (!process.env.TYPESAFE_API_KEY) {
    const prompt = query.toLowerCase();
    focus = "current";
    if (/graph|chart|trend|hour|later today/.test(prompt)) focus = "trend";
    else if (/forecast|tomorrow|week|days/.test(prompt)) focus = "forecast";
    included = focus === "current" ? ["current", "forecast"] : [focus];
  } else {
    const result = await askJev(
      { query, weather: data },
      {
        focus: {
          type: "choice",
          instructions: "Which weather section should appear first to answer the query? Choose only from available data.",
          criteria: {
            current: "Conditions and temperature right now.",
            forecast: "Highs and lows over the next days.",
            trend: "Temperature changes over the next hours; use for chart requests.",
          },
        },
        ...Object.fromEntries(weatherSections.map((section) => [
          `include_${section}`,
          {
            type: "choice",
            instructions: `Should the ${section} section appear to answer the user's query? Include only useful sections.`,
            criteria: { yes: "This section helps answer the query.", no: "This section does not help answer the query." },
          },
        ])),
      },
    );
    debug.weather = Object.fromEntries(
      Object.entries(result.answers ?? {}).map(([key, answer]) => [key, debugAnswer(answer)]),
    );
    const selected = result.answers?.focus?.choice;
    if (!isWeatherSection(selected)) throw new Error("JEV returned an invalid weather focus.");
    focus = selected;
    included = weatherSections.filter((section) => {
      const choice = result.answers?.[`include_${section}`]?.choice;
      if (choice !== "yes" && choice !== "no") {
        throw new Error(`JEV returned an invalid ${section} selection.`);
      }
      return choice === "yes";
    });
  }

  // The selected focus is always visible. Never allow an unknown component or data key.
  const ordered = [focus, ...weatherSections.filter((section) => section !== focus && included.includes(section))];
  return ordered.map((section) => ({ component: section, data: section }));
}

function weatherCondition(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorms";
  return "Weather conditions unavailable";
}

async function fetchWeather(context?: AssistantContext): Promise<{ location: string; data: WeatherData }> {
  const place = context?.location ?? context?.ipLocation;
  let latitude = place?.latitude;
  let longitude = place?.longitude;
  const location = formatLocation(context);

  if (latitude === undefined || longitude === undefined) {
    const name = place?.city ?? place?.zipCode;
    if (!name) throw new Error("Location is required for weather.");
    const geocode = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name, count: "1", ...(place?.country ? { countryCode: place.country } : {}) })}`, { cache: "no-store" });
    if (!geocode.ok) throw new Error("Weather location lookup failed.");
    const results = (await geocode.json()) as { results?: Array<{ latitude: number; longitude: number }> };
    latitude = results.results?.[0]?.latitude;
    longitude = results.results?.[0]?.longitude;
  }
  if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error("Weather location is unavailable.");
  }

  const params = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    current: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min",
    hourly: "temperature_2m",
    forecast_days: "4", timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Weather request failed.");
  const result = (await response.json()) as {
    current?: { time: string; temperature_2m: number; weather_code: number };
    daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[] };
    hourly?: { time: string[]; temperature_2m: number[] };
  };
  const current = result.current;
  const daily = result.daily;
  const hourly = result.hourly;
  if (!current || !daily || !hourly || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code)) {
    throw new Error("Weather data is incomplete.");
  }
  const forecast = daily.time?.map((time, index) => ({
    day: time,
    high: daily.temperature_2m_max?.[index],
    low: daily.temperature_2m_min?.[index],
  })).slice(0, 4);
  const trend = hourly.time?.map((time, index) => ({
    time,
    temperature: hourly.temperature_2m?.[index],
  })).filter((point) => point.time >= current.time.slice(0, 13)).slice(0, 12);
  if (!forecast?.length || !trend?.length || forecast.some((day) => !Number.isFinite(day.high) || !Number.isFinite(day.low)) || trend.some((point) => !Number.isFinite(point.temperature))) {
    throw new Error("Weather data is incomplete.");
  }
  return {
    location,
    data: {
      current: { temperature: current.temperature_2m, condition: weatherCondition(current.weather_code) },
      forecast,
      trend,
    },
  };
}

const intentEmoji = {
  weather: "🌤️",
  time: "🕐",
  news: "📰",
  sports: "🏆",
  checklist: "✅",
  info: "💡",
  unsupported: "🧩",
} satisfies Record<AssistantIntent["card_type"], string>;

async function queryDecisionApi(query: string, debug: JevDebug): Promise<AssistantIntent> {
  const apiKey = process.env.TYPESAFE_API_KEY;

  if (!apiKey) {
    console.info("[JEV] API key missing; using mock classifier");
    return mockDecision(query);
  }

  console.info(
    `[JEV] Sending intent request model=jev-latest queryLength=${query.length}`,
  );

  const result = await askJev({ query }, {
    assistant_intent: {
      type: "choice",
      instructions: "Choose the single card type that best answers the user's query. Weather charts are weather, not unsupported.",
      criteria: {
        weather: "Weather, temperature, conditions, forecast, or weather chart.",
        time: "Current time, clock, or timezone.",
        news: "News, headlines, or current events.",
        sports: "Sports, scores, games, matches, teams, or leagues.",
        checklist: "Plan, steps, checklist, or todo list.",
        unsupported: "Map, timer, calendar, or other custom visual UI.",
        info: "Any request that does not match another option.",
      },
    },
  });
  if (result.answers?.assistant_intent) {
    debug.intent = debugAnswer(result.answers.assistant_intent);
  }
  const choice = result.answers?.assistant_intent?.choice;

  console.info(`[JEV] Response JSON ${JSON.stringify(result)}`);
  console.info(`[JEV] Intent selected choice=${String(choice)}`);

  switch (choice) {
    case "weather":
      return { card_type: "weather" };
    case "time":
      return { card_type: "time" };
    case "news":
      return { card_type: "news", topic: query };
    case "sports":
      return { card_type: "sports", topic: query };
    case "checklist":
      return { card_type: "checklist", topic: query };
    case "unsupported":
      return { card_type: "unsupported", requested_ui: query };
    case "info":
      return {
        card_type: "info",
        title: "Here is a concise answer",
        body: `You asked: “${query}” JEV selected this card type.`,
      };
    default:
      throw new Error("JEV returned an invalid assistant_intent choice.");
  }
}

async function fulfillIntent(
  intent: AssistantIntent,
  query: string,
  debug: JevDebug,
  context?: AssistantContext,
): Promise<AssistantCard> {
  switch (intent.card_type) {
    case "weather": {
      const { location, data } = await fetchWeather(context);
      const blocks = await composeWeather(query, data, debug);
      return { type: "weather_card", location, unit: "C", data, blocks };
    }
    case "time": {
      const timezone = intent.timezone ?? context?.timezone ?? "UTC";

      return {
        type: "time_card",
        location: intent.location ?? formatLocation(context),
        timezone,
        localTime: new Intl.DateTimeFormat(context?.locale ?? "en-US", {
          timeStyle: "short",
          timeZone: timezone,
        }).format(new Date()),
      };
    }
    case "news":
      return {
        type: "news_card",
        topic: intent.topic,
        articles: [
          {
            title: "Placeholder headline",
            source: "Mock news API",
            summary: "External news API not hooked yet.",
          },
        ],
      };
    case "sports":
      return {
        type: "sports_card",
        topic: intent.topic,
        events: [
          {
            title: "Placeholder matchup",
            league: "Mock sports API",
            status: "External sports data API not hooked yet.",
          },
        ],
      };
    case "checklist":
      return {
        type: "checklist_card",
        title: "A simple plan",
        items: [
          `Clarify goal: ${intent.topic}`,
          "Build the smallest useful version",
          "Share it and collect feedback",
        ],
      };
    case "info":
      return {
        type: "info_card",
        eyebrow: "Mock response",
        title: intent.title,
        body: intent.body,
      };
    case "unsupported":
      return {
        type: "custom_card",
        requestedUi: intent.requested_ui,
        message: "No typed component exists for this request yet.",
      };
    default: {
      const exhaustive: never = intent;
      throw new Error(`Unsupported intent: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as AssistantRequest;
  const query = typeof body.query === "string" ? body.query.trim() : "";

  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  const jev: JevDebug = {};
  const intent = await queryDecisionApi(query, jev);
  const card = await fulfillIntent(intent, query, jev, body.context);

  const response: AssistantResponse = {
    query,
    card,
    debug: {
      intent,
      cardType: card.type,
      emoji: intentEmoji[intent.card_type],
      jev: process.env.TYPESAFE_API_KEY ? jev : null,
      ...(card.type === "weather_card" ? { weatherBlocks: card.blocks } : {}),
    },
  };

  return NextResponse.json(response);
}
