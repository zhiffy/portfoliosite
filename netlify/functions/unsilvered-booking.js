// Same-origin booking endpoint for The Sitting Room open showcase.
// A separate Google Apps Script owns the Sheet and applies the capacity check
// under a script lock. The browser never receives the webhook URL or secret.
const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const SLOTS = new Set(["14:00", "15:00", "16:00", "17:00", "18:30", "19:30", "20:30"]);
const EVENT_END = Date.parse("2026-10-02T21:30:00+08:00");
const clean = (value) => typeof value === "string" ? value.trim() : "";
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...headers } });

export default async (request) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = process.env.UNSILVERED_BOOKING_WEBHOOK_URL;
  const secret = process.env.UNSILVERED_BOOKING_SECRET;
  if (!url || !secret) {
    return json({ error: "Bookings are not available yet. Please try again later." }, 503);
  }

  if (Date.now() >= EVENT_END) {
    return json({ error: "Bookings for this event have closed." }, 410);
  }

  let payload = {};
  if (request.method === "POST") {
    try { payload = await request.json(); } catch { return json({ error: "Please try again." }, 400); }
    if (clean(payload._gotcha)) return json({ ok: true });
    const name = clean(payload.name);
    const email = clean(payload.email).toLowerCase();
    const slot = clean(payload.slot);
    const quantity = Number(payload.quantity);
    const requestId = clean(payload.requestId);
    if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
        !SLOTS.has(slot) || !Number.isInteger(quantity) || quantity < 1 || quantity > 8 ||
        !/^[0-9a-f-]{36}$/i.test(requestId)) {
      return json({ error: "Please check your name, email, party size and viewing time." }, 400);
    }
    payload = { name, email, slot, quantity, requestId };
  }

  try {
    const result = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: request.method === "GET" ? "availability" : "book", secret, ...payload }),
      // Allow for Google Sheets and both emails during a cold Apps Script run.
      signal: AbortSignal.timeout(45000),
    });
    if (!result.ok) return json({ error: "Bookings are temporarily unavailable. Please try again." }, 502);
    const data = await result.json();
    if (!data || typeof data !== "object" || !Number.isInteger(data.status)) {
      return json({ error: "Bookings are temporarily unavailable. Please try again." }, 502);
    }
    const status = [200, 400, 409, 410, 503].includes(data.status) ? data.status : 502;
    if (status !== 200) return json({ error: clean(data.error) || "Please try again." }, status);
    if (request.method === "GET") {
      // Cache only public counts. Every reservation still checks live capacity.
      const fresh = new URL(request.url).searchParams.has('fresh');
      const ttl = Math.min(15, Math.floor((EVENT_END - Date.now()) / 1000));
      return json({ slots: data.slots }, 200, !fresh && ttl > 0 ? {
        "Netlify-CDN-Cache-Control": `public, durable, max-age=${ttl}, must-revalidate`,
      } : {});
    }
    return json({ ok: true, slot: data.slot, quantity: data.quantity, emailSent: data.emailSent === true });
  } catch {
    return json({ error: "Bookings are temporarily unavailable. Please try again." }, 502);
  }
};

export const config = { path: "/api/unsilvered-booking" };
