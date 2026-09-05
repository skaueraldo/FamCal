function decodeGoogleId(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (trimmed.includes("@") || trimmed.includes("group.calendar.google.com")) return trimmed;
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    if (decoded.includes("@") || decoded.includes("group.calendar.google.com")) return decoded;
  } catch {
    /* ignore */
  }
  return trimmed;
}

export function calendarFetchUrls(input) {
  const raw = String(input || "").trim().replace(/^webcal:/i, "https:");
  const parsed = new URL(raw);
  const urls = [parsed.toString()];

  if (parsed.hostname.includes("google.com")) {
    const alreadyIcal = /\/calendar\/ical\//i.test(parsed.pathname);
    const id = decodeGoogleId(parsed.searchParams.get("cid") || parsed.searchParams.get("src") || "");
    if (!alreadyIcal && id) {
      urls.unshift(`https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`);
    }
  }

  return [...new Set(urls)];
}

export function looksLikeIcs(text) {
  return /BEGIN:VCALENDAR/i.test(text || "");
}

export function looksLikeHtml(text) {
  const start = String(text || "").slice(0, 400).toLowerCase();
  return start.includes("<!doctype") || start.includes("<html") || start.includes("accounts.google.com");
}

export const GOOGLE_ICAL_HELP =
  "That Google link is not a live calendar feed. In Google Calendar: Settings → the calendar → Integrate calendar → copy the secret address in iCal format (it ends with basic.ics).";
