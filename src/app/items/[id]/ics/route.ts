import { NextResponse } from "next/server";
import { getItem } from "@/lib/queries";

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldLine(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function isAllDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDateValue(value: string): string {
  return value.replace(/-/g, "");
}

function toLocalDateTime(value: string): string {
  // YYYY-MM-DDTHH:mm → YYYYMMDDTHHmmss (floating local)
  const [date, time = "00:00"] = value.split("T");
  const [hh = "00", mm = "00"] = time.split(":");
  return `${date.replace(/-/g, "")}T${hh}${mm}00`;
}

function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function dtstamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await context.params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id < 1) {
    return new NextResponse("Not found", { status: 404 });
  }

  const item = getItem(id);
  if (!item) {
    return new NextResponse("Not found", { status: 404 });
  }

  const startRaw =
    item.kind === "opportunity"
      ? item.deadline
      : item.starts_at || item.deadline;
  if (!startRaw) {
    return new NextResponse("No date", { status: 400 });
  }

  const summary =
    item.kind === "opportunity" ? `Deadline: ${item.title}` : item.title;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Radar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:radar-item-${item.id}`,
    `DTSTAMP:${dtstamp()}`,
    `SUMMARY:${escapeIcs(summary)}`,
  ];

  if (isAllDay(startRaw)) {
    lines.push(`DTSTART;VALUE=DATE:${toDateValue(startRaw)}`);
    lines.push(`DTEND;VALUE=DATE:${nextDay(startRaw)}`);
  } else {
    lines.push(`DTSTART:${toLocalDateTime(startRaw)}`);
    if (item.ends_at && !isAllDay(item.ends_at)) {
      lines.push(`DTEND:${toLocalDateTime(item.ends_at)}`);
    } else if (item.ends_at && isAllDay(item.ends_at)) {
      lines.push(`DTEND;VALUE=DATE:${toDateValue(item.ends_at)}`);
    } else {
      lines.push("DURATION:PT2H");
    }
  }

  const location = [item.venue, item.city].filter(Boolean).join(", ");
  if (location) {
    lines.push(`LOCATION:${escapeIcs(location)}`);
  }

  const descriptionParts = [item.summary];
  if (item.link) descriptionParts.push(item.link);
  descriptionParts.push(item.permalink);
  lines.push(`DESCRIPTION:${escapeIcs(descriptionParts.join("\n"))}`);
  lines.push(`URL:${item.link || item.permalink}`);
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  const body = lines.map(foldLine).join("\r\n") + "\r\n";

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="radar-item-${item.id}.ics"`,
    },
  });
}
