import { NextResponse } from "next/server";
import type {
  AssistantCard,
  AssistantContext,
  AssistantIntent,
  AssistantRequest,
  AssistantResponse,
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

type JevResponse = {
  answers?: {
    assistant_intent?: {
      choice?: unknown;
    };
  };
};

async function queryDecisionApi(query: string): Promise<AssistantIntent> {
  const apiKey = process.env.TYPESAFE_API_KEY;

  if (!apiKey) {
    console.info("[JEV] API key missing; using mock classifier");
    return mockDecision(query);
  }

  console.info("[JEV] Sending intent request", {
    model: "jev-latest",
    queryLength: query.length,
  });

  const response = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "jev-latest",
      state: { query },
      questions: {
        assistant_intent: {
          type: "choice",
          instructions:
            "Choose the single card type that best answers the user's query.",
          criteria: {
            weather: "Weather, temperature, conditions, or forecast.",
            time: "Current time, clock, or timezone.",
            news: "News, headlines, or current events.",
            checklist: "Plan, steps, checklist, or todo list.",
            unsupported: "Chart, map, timer, calendar, or custom visual UI.",
            info: "Any request that does not match another option.",
          },
        },
      },
    }),
    cache: "no-store",
  });

  console.info("[JEV] Response received", {
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    console.error("[JEV] Request failed", { status: response.status });
    throw new Error(`JEV request failed with status ${response.status}.`);
  }

  const result = (await response.json()) as JevResponse;
  const choice = result.answers?.assistant_intent?.choice;

  console.info("[JEV] Intent selected", { choice });

  switch (choice) {
    case "weather":
      return { card_type: "weather" };
    case "time":
      return { card_type: "time" };
    case "news":
      return { card_type: "news", topic: query };
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
  context?: AssistantContext,
): Promise<AssistantCard> {
  switch (intent.card_type) {
    case "weather":
      return {
        type: "weather_card",
        location: intent.zip_code
          ? `ZIP ${intent.zip_code}`
          : formatLocation(context),
        temperature: 18,
        unit: "C",
        condition: "Placeholder weather. External API not hooked yet.",
        forecast: [
          { day: "Today", high: 19, low: 12 },
          { day: "Tomorrow", high: 21, low: 13 },
          { day: "Friday", high: 20, low: 12 },
        ],
      };
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

  await new Promise((resolve) => setTimeout(resolve, 500));

  const intent = await queryDecisionApi(query);
  const card = await fulfillIntent(intent, body.context);

  const response: AssistantResponse = {
    query,
    card,
  };

  return NextResponse.json(response);
}
