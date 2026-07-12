import { getDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = getDatabase().prepare("SELECT 1 AS healthy").get() as { healthy: number };

    if (result.healthy !== 1) {
      throw new Error("Unexpected database response");
    }

    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { status: "unhealthy" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
