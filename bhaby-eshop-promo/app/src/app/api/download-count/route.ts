import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) as count FROM download_events").get() as { count: number };
    return NextResponse.json({ count: row.count });
  } catch (err) {
    console.error("download-count error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
