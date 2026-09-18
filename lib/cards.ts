export type InfoCard = {
  type: "info_card";
  eyebrow: string;
  title: string;
  body: string;
};

export type WeatherCard = {
  type: "weather_card";
  location: string;
  temperature: number;
  unit: "C" | "F";
  condition: string;
  forecast: Array<{
    day: string;
    high: number;
    low: number;
  }>;
};

export type TimeCard = {
  type: "time_card";
  location: string;
  timezone: string;
  localTime: string;
};

export type NewsCard = {
  type: "news_card";
  topic: string;
  articles: Array<{
    title: string;
    source: string;
    summary: string;
  }>;
};

export type ChecklistCard = {
  type: "checklist_card";
  title: string;
  items: string[];
};

export type CustomCard = {
  type: "custom_card";
  requestedUi: string;
  message: string;
};

export type AssistantLocation = {
  city?: string;
  region?: string;
  country?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  source: "browser" | "ip";
};

export type AssistantContext = {
  locale?: string;
  timezone?: string;
  location?: AssistantLocation;
  ipLocation?: Omit<AssistantLocation, "source">;
};

export type AssistantRequest = {
  query?: unknown;
  context?: AssistantContext;
};

export type AssistantIntent =
  | { card_type: "weather"; zip_code?: string }
  | { card_type: "time"; location?: string; timezone?: string }
  | { card_type: "news"; topic: string }
  | { card_type: "checklist"; topic: string }
  | { card_type: "info"; title: string; body: string }
  | { card_type: "unsupported"; requested_ui: string };

export type AssistantCard =
  | InfoCard
  | WeatherCard
  | TimeCard
  | NewsCard
  | ChecklistCard
  | CustomCard;

export type AssistantResponse = {
  query: string;
  card: AssistantCard;
  debug: {
    intent: AssistantIntent;
    cardType: AssistantCard["type"];
  };
};
