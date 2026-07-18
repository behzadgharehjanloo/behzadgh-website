import { isAdminAuthenticated } from "@/lib/auth";
import { loadAdminCsvRows, parseAdminFilters, subscribersToCsv } from "@/lib/admin-dashboard.mjs";
import { query } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ ok: false, outcome: "unauthorized" }, {
      status: 401,
      headers: { "Cache-Control": "private, no-store" }
    });
  }

  const url = new URL(request.url);
  const filters = parseAdminFilters({
    page: "1",
    search: url.searchParams.get("search") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    source: url.searchParams.get("source") ?? undefined
  });
  const rows = await loadAdminCsvRows(
    (text, params) => query<Record<string, unknown>>(text, params),
    filters
  );
  const filename = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(subscribersToCsv(rows), {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
