import ExcelJS from "exceljs";
import { formatAdminExcelDate } from "./admin-date-format.mjs";

const HEADERS = [
  "Email",
  "Status",
  "Signup date",
  "Source",
  "Welcome status",
  "Welcome sent",
  "Unsubscribed date"
];

const BORDER = { style: "thin", color: { argb: "FFD9D2C7" } };

function titleCase(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function subscriberStatusLabel(value) {
  return titleCase(value);
}

export function welcomeStatusLabel(value) {
  const status = String(value ?? "").toLowerCase();
  if (status === "sent") return "Sent";
  if (status === "pending" || status === "queued") return "Queued";
  if (status === "failed") return "Failed";
  if (!status || status === "not_queued") return "";
  return titleCase(status);
}

function text(value) {
  return value === null || value === undefined ? null : String(value);
}

function optionalText(value) {
  const result = text(value);
  return result === "" ? null : result;
}

function fitColumns(worksheet) {
  const maximumWidths = [60, 18, 32, 36, 20, 32, 32];
  worksheet.columns.forEach((column, index) => {
    let longest = HEADERS[index].length;
    column.eachCell({ includeEmpty: false }, (cell) => {
      longest = Math.max(longest, String(cell.value ?? "").length);
    });
    column.width = Math.min(maximumWidths[index], Math.max(12, longest + 2));
  });
}

function addStatusFormatting(worksheet, lastRow) {
  if (lastRow < 2) return;

  const statusRules = [
    ["Active", "FFE8F3E8", "FF315537"],
    ["Suppressed", "FFFFF1D6", "FF7A5A18"],
    ["Unsubscribed", "FFF8E3DE", "FF814A3A"]
  ];
  const welcomeRules = [
    ["Sent", "FFE8F3E8", "FF315537"],
    ["Queued", "FFFFF5D8", "FF775E1A"],
    ["Failed", "FFF8E3DE", "FF814A3A"]
  ];

  for (const [label, fill, color] of statusRules) {
    worksheet.addConditionalFormatting({
      ref: `B2:B${lastRow}`,
      rules: [{
        type: "expression",
        formulae: [`B2="${label}"`],
        style: {
          fill: { type: "pattern", pattern: "solid", bgColor: { argb: fill }, fgColor: { argb: fill } },
          font: { color: { argb: color } }
        }
      }]
    });
  }

  for (const [label, fill, color] of welcomeRules) {
    worksheet.addConditionalFormatting({
      ref: `E2:E${lastRow}`,
      rules: [{
        type: "expression",
        formulae: [`E2="${label}"`],
        style: {
          fill: { type: "pattern", pattern: "solid", bgColor: { argb: fill }, fgColor: { argb: fill } },
          font: { color: { argb: color } }
        }
      }]
    });
  }
}

export async function subscribersToExcel(rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Behzad Gharehjanloo";
  workbook.subject = "Private newsletter subscribers";
  workbook.title = "Subscribers";

  const worksheet = workbook.addWorksheet("Subscribers", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 1, activeCell: "A2" }]
  });
  worksheet.showGridLines = false;

  const tableRows = rows.map((row) => [
    text(row.email),
    subscriberStatusLabel(row.status),
    optionalText(formatAdminExcelDate(row.created_at)),
    text(row.consent_source),
    optionalText(welcomeStatusLabel(row.welcome_status)),
    optionalText(formatAdminExcelDate(row.welcome_sent_at)),
    optionalText(formatAdminExcelDate(row.unsubscribed_at))
  ]);

  worksheet.addTable({
    name: "SubscribersTable",
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true, showColumnStripes: false },
    columns: HEADERS.map((name) => ({ name, filterButton: true })),
    rows: tableRows
  });

  const lastRow = Math.max(1, tableRows.length + 1);
  const usedRange = worksheet.getRows(1, lastRow) ?? [];
  for (const row of usedRange) {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: "Aptos", size: 10, color: { argb: "FF0B1D33" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
    });
  }

  const header = worksheet.getRow(1);
  header.height = 24;
  header.font = { name: "Aptos Display", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle", horizontal: "left" };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1D33" } };
    cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
  });

  worksheet.getColumn(2).alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getColumn(5).alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getColumn(1).alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  worksheet.getColumn(4).alignment = { vertical: "middle", horizontal: "left", wrapText: true };

  fitColumns(worksheet);
  addStatusFormatting(worksheet, lastRow);

  const output = await workbook.xlsx.writeBuffer();
  return Uint8Array.from(output).buffer;
}
