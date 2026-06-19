import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lightweight keep-alive endpoint — no DB query, no auth.
// Pinged every 5 minutes by UptimeRobot to prevent Render sleep.
export async function GET() {
  return NextResponse.json({ ok: true, t: Date.now() });
}
