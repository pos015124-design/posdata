import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_PLATFORMS = ["android", "ios", "desktop", "unknown"] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    const text = await req.text();
    if (!text.trim()) {
      return NextResponse.json({ error: "Request body is required" }, { status: 400 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const platform: Platform =
    body &&
    typeof body === "object" &&
    "platform" in body &&
    typeof (body as Record<string, unknown>).platform === "string" &&
    VALID_PLATFORMS.includes((body as Record<string, string>).platform as Platform)
      ? ((body as Record<string, string>).platform as Platform)
      : "unknown";

  // If platform key is present but invalid, reject
  if (
    body &&
    typeof body === "object" &&
    "platform" in body &&
    typeof (body as Record<string, unknown>).platform === "string" &&
    !VALID_PLATFORMS.includes((body as Record<string, string>).platform as Platform)
  ) {
    return NextResponse.json(
      { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    db.prepare("INSERT INTO download_events (platform) VALUES (?)").run(platform);
    const row = db.prepare("SELECT COUNT(*) as count FROM download_events").get() as { count: number };
    return NextResponse.json({ count: row.count });
  } catch (err) {
    console.error("track-download error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
