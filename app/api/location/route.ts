import { NextResponse } from "next/server";
import type { AssistantContext } from "@/lib/cards";

function readHeader(request: Request, name: string) {
  const value = request.headers.get(name);
  return value ? decodeURIComponent(value) : undefined;
}

export function GET(request: Request) {
  const location: AssistantContext["ipLocation"] = {
    city: readHeader(request, "x-vercel-ip-city"),
    region: readHeader(request, "x-vercel-ip-country-region"),
    country: readHeader(request, "x-vercel-ip-country"),
  };

  return NextResponse.json({ location });
}
