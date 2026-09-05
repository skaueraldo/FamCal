const API = "https://api.spond.com/core/v1/";

function pad(n) {
  return String(n).padStart(2, "0");
}

function localStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function dayStamp(offsetMonths) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01T00:00:00.000Z`;
}

function locationText(location) {
  if (!location || typeof location !== "object") return "";
  return [location.feature, location.address].filter(Boolean).join(", ");
}

function loginError(body) {
  if (body?.phoneNumber || body?.errorKey === "otpRequired" || (body?.token && !body?.accessToken)) {
    return "Spond sent a verification code to your phone. FamCal cannot finish that step yet. In the Spond app, turn on calendar sync to your iPhone, then import that calendar here.";
  }
  return body?.message || body?.error || "Spond login failed. Check the email and password.";
}

export async function loginSpond(email, password) {
  const res = await fetch(`${API}auth2/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  const token = body?.accessToken?.token || body?.loginToken;
  if (typeof token === "string" && token) return token;
  throw new Error(loginError(body));
}

async function spondGet(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spond request failed (${res.status}): ${text.slice(0, 180)}`);
  }
  return res.json();
}

export function mapSpondEvents(rawEvents, memberId, sourceId) {
  const out = [];
  for (const event of rawEvents || []) {
    if (!event || event.cancelled) continue;
    const startIso = event.meetupTimestamp || event.startTimestamp;
    const start = startIso ? localStamp(startIso) : null;
    if (!start || !event.heading) continue;
    const end = event.endTimestamp ? localStamp(event.endTimestamp) : null;
    const place = locationText(event.location);
    const notes = [place, event.description].filter(Boolean).join(" · ");
    out.push({
      id: `evt_spond_${event.id}`,
      title: String(event.heading).trim(),
      date: start.date,
      start: start.time,
      end: end?.date === start.date ? end.time : undefined,
      notes: notes || undefined,
      memberId,
      sourceId,
      uid: `spond:${event.id}`,
    });
  }
  return out;
}

export async function fetchSpondActivities(email, password, memberId, sourceId) {
  const token = await loginSpond(email, password);
  const params = new URLSearchParams({
    max: "200",
    scheduled: "false",
    minStartTimestamp: dayStamp(-2),
    maxStartTimestamp: dayStamp(6),
  });
  const events = await spondGet(`sponds/?${params}`, token);
  return {
    events: mapSpondEvents(Array.isArray(events) ? events : [], memberId, sourceId),
    count: Array.isArray(events) ? events.length : 0,
  };
}
