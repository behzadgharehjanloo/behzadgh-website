export const ADMIN_TIME_ZONE = "America/New_York";

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ADMIN_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short"
});

const calendarDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric"
});

const compactCalendarDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric"
});

function fromEpochSeconds(value) {
  if (value === null || value === undefined || value === "") return null;

  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return null;

  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function adminDateParts(value) {
  const date = fromEpochSeconds(value);
  if (!date) return null;

  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  if (!parts.month || !parts.day || !parts.year || !parts.hour || !parts.minute || !parts.dayPeriod || !parts.timeZoneName) {
    return null;
  }

  return parts;
}

export function formatAdminDate(value) {
  const parts = adminDateParts(value);
  if (!parts) return "—";

  return `${parts.month} ${parts.day}, ${parts.year} · ${parts.hour}:${parts.minute} ${parts.dayPeriod} ${parts.timeZoneName}`;
}

export function formatAdminExcelDate(value) {
  const parts = adminDateParts(value);
  if (!parts) return "";

  return `${parts.month} ${parts.day}, ${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod} ${parts.timeZoneName}`;
}

export function formatAdminCalendarDay(value, compact = false) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "—";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return (compact ? compactCalendarDayFormatter : calendarDayFormatter).format(date);
}
