// Netlify Function (v2): contact form -> Google Sheet.
// The browser posts JSON to /api/contact (same-origin, so real success/error
// feedback works). This function validates, drops honeypot spam, then relays
// the submission server-to-server to a Google Apps Script web app, which
// appends a row to the Sheet. No third-party form service required.
//
// Required env var (Netlify site settings):
//   CONTACT_SHEET_WEBHOOK_URL  = the Apps Script web-app URL

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function clean(v) {
  return typeof v === "string" ? v.trim() : "";
}
function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { Allow: "POST, OPTIONS" } });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...HEADERS, Allow: "POST, OPTIONS" },
    });
  }

  const url = process.env.CONTACT_SHEET_WEBHOOK_URL;
  if (!url) {
    return new Response(JSON.stringify({
      error: "Contact endpoint is not configured.",
      required: ["CONTACT_SHEET_WEBHOOK_URL"],
    }), { status: 503, headers: HEADERS });
  }

  let payload = {};
  try { payload = await request.json(); } catch { payload = {}; }

  // Honeypot: a filled _gotcha means a bot. Accept silently so it gives up.
  if (clean(payload._gotcha)) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS });
  }

  const name = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const enquiry_type = clean(payload.enquiry_type);
  const message = clean(payload.message);
  const page = clean(payload.page);

  if (!name || !message || !email || !isEmail(email)) {
    return new Response(JSON.stringify({
      error: "Please add your name, a valid email, and a message.",
    }), { status: 400, headers: HEADERS });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        name,
        email,
        enquiry_type,
        message,
        page,
      }),
    });
    if (!res.ok) {
      const details = await res.text().catch(() => "");
      return new Response(JSON.stringify({
        error: "Could not record your message. Please email the studio directly.",
        details: details.slice(0, 200),
      }), { status: 502, headers: HEADERS });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Could not send your message. Please try again.",
      details: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: HEADERS });
  }
};

export const config = {
  path: "/api/contact",
};
