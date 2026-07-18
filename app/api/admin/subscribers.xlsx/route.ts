import { isAdminAuthenticated } from "@/lib/auth";
import { loadAdminCsvRows, parseAdminFilters } from "@/lib/admin-dashboard.mjs";
import { query } from "@/lib/database";
import { subscribersToExcel } from "@/lib/admin-excel.mjs";

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
    (queryText, params) => query<Record<string, unknown>>(queryText, params),
    filters
  );
  const workbook = await subscribersToExcel(rows);
  const filename = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(workbook, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
