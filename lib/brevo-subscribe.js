const BREVO_CONTACTS_URL = "https://api.brevo.com/v3/contacts";
const BREVO_EMAIL_URL    = "https://api.brevo.com/v3/smtp/email";
const NOTIFY_TO          = "studio@shavonnewong.art";
const NOTIFY_FROM        = { name: "Shavonne Wong Studio", email: "studio@shavonnewong.art" };

export const NEWSLETTER_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export const NEWSLETTER_ALLOWED_METHODS = "POST, OPTIONS";

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function envValue(env, keys) {
  for (const key of keys) {
    if (env?.[key]) return env[key];
  }
  return "";
}

const MIN_FILL_TIME_MS = 2500; // real visitors take at least this long to fill the form
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_ACTION = "subscribe"; // must match the action subscribe.js renders the widget with
const TURNSTILE_MAX_TOKEN_LENGTH = 2048;
const TURNSTILE_VERIFY_TIMEOUT_MS = 10000;
// Hostnames the widget may be solved on. Override with TURNSTILE_HOSTNAMES
// (comma-separated) for a local or preview setup; production never includes
// localhost.
const DEFAULT_TURNSTILE_HOSTNAMES = ["shavonnewong.art", "www.shavonnewong.art"];

// A "quiet accept" is returned for anything that trips a spam trap, so bots
// see a normal success response and don't retry with a different payload,
// while the contact never actually gets created in Brevo.
const QUIET_ACCEPT = { status: 200, body: { ok: true } };

// Shown to anyone whose signup fails the bot check, so a real person who is
// blocked still has a way to join.
const CAPTCHA_FAILED_MESSAGE =
  "Sorry, we could not verify this signup. Please try again, or email studio@shavonnewong.art to be added.";

function turnstileHostnames(env) {
  const raw = envValue(env, ["TURNSTILE_HOSTNAMES"]);
  if (!raw) return DEFAULT_TURNSTILE_HOSTNAMES;
  return raw.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
}

// Cloudflare Turnstile is enforced and fails closed: a signup without a valid,
// unused token for this action on an allowed hostname never reaches Brevo.
// (reCAPTCHA v3 was used until November 2026. As a soft signal it let a bot run
// through; enforced, it refused real visitors on Brave and other privacy
// browsers. Turnstile replaced it.)
async function verifyTurnstile(token, { secret, remoteIp, hostnames }) {
  if (!token) return { ok: false, reason: "missing-token" };
  if (token.length > TURNSTILE_MAX_TOKEN_LENGTH) return { ok: false, reason: "invalid-token" };
  if (!secret) {
    console.error("Newsletter signup: TURNSTILE_SECRET is not set, so every signup is being refused.");
    return { ok: false, reason: "not-configured" };
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    if (remoteIp) params.set("remoteip", remoteIp);
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: params,
      signal: AbortSignal.timeout(TURNSTILE_VERIFY_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({}));

    let reason = "";
    if (!data.success) {
      const errors = Array.isArray(data["error-codes"]) ? data["error-codes"] : [];
      reason = errors.length ? errors.join(",") : "verify-failed";
    } else if (data.action !== TURNSTILE_ACTION) {
      reason = "action-mismatch";
    } else if (!hostnames.includes(String(data.hostname || "").toLowerCase())) {
      reason = "hostname-mismatch";
    }

    if (reason) {
      console.warn("Newsletter signup rejected by Turnstile:", JSON.stringify({
        reason, hostname: data.hostname, action: data.action,
      }));
      return { ok: false, reason };
    }
    return { ok: true, reason: "" };
  } catch (error) {
    console.error("Newsletter signup: Turnstile verification request failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, reason: "verify-request-failed" };
  }
}

export async function subscribeToStudioUpdates(payload = {}, env = process.env, request = {}) {
  const apiKey = envValue(env, ["BREVO_API_KEY"]);
  const listId  = envValue(env, ["BREVO_LIST_ID"]);
  const turnstileSecret = envValue(env, ["TURNSTILE_SECRET"]);

  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: "Brevo is not configured.",
        required: ["BREVO_API_KEY", "BREVO_LIST_ID"],
      },
    };
  }

  // Honeypot: real visitors never see or fill this field.
  if (cleanString(payload.website)) {
    return QUIET_ACCEPT;
  }

  // Time trap: reject submissions faster than a human could plausibly type.
  // The site's form always sends ts, so a request without one did not come
  // from the form.
  const renderedAt = Number(payload.ts);
  if (!renderedAt || Date.now() - renderedAt < MIN_FILL_TIME_MS) {
    return QUIET_ACCEPT;
  }

  const email = cleanString(payload.email).toLowerCase();
  if (!email || !isValidEmail(email)) {
    return {
      status: 400,
      body: { error: "Please enter a valid email address." },
    };
  }

  const turnstile = await verifyTurnstile(
    cleanString(payload.turnstileToken || payload["cf-turnstile-response"]),
    { secret: turnstileSecret, remoteIp: cleanString(request.remoteIp), hostnames: turnstileHostnames(env) },
  );
  if (!turnstile.ok) {
    return {
      status: 400,
      body: { error: CAPTCHA_FAILED_MESSAGE, code: turnstile.reason },
    };
  }

  // Build request body. If a list ID is set, add the contact to that list.
  const body = {
    email,
    updateEnabled: true, // re-subscribe if previously unsubscribed
    ...(listId ? { listIds: [Number(listId)] } : {}),
  };

  const response = await fetch(BREVO_CONTACTS_URL, {
    method: "POST",
    headers: {
      Accept:         "application/json",
      "api-key":      apiKey,          // Brevo uses api-key header, not Bearer
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // 204 = contact already exists and was updated (treated as success)
  if (response.ok || response.status === 204) {
    // Fire-and-forget notification — never blocks or fails the subscription
    notifyNewSubscriber(email, apiKey).catch(() => {});
    return { status: 200, body: { ok: true } };
  }

  const details = await response.text().catch(() => "");
  return {
    status: response.status === 429 ? 429 : 502,
    body: {
      error: "Could not add this email to Brevo.",
      details: details.slice(0, 280),
    },
  };
}

async function notifyNewSubscriber(subscriberEmail, apiKey) {
  // Fetch current subscriber count from Brevo list
  let subscriberCount = null;
  try {
    const listRes = await fetch("https://api.brevo.com/v3/contacts/lists/4", {
      headers: { Accept: "application/json", "api-key": apiKey },
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      subscriberCount = listData.uniqueSubscribers ?? null;
    }
  } catch (_) {}

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  });
  const brevoLink = "https://app.brevo.com/contact/list/id/4";

  const countLine = subscriberCount !== null
    ? `<p>Total subscribers: <strong>${subscriberCount}</strong></p>`
    : "";
  const countText = subscriberCount !== null ? `Total subscribers: ${subscriberCount}\n` : "";

  await fetch(BREVO_EMAIL_URL, {
    method: "POST",
    headers: {
      Accept:         "application/json",
      "api-key":      apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender:  NOTIFY_FROM,
      to:      [{ email: NOTIFY_TO }],
      subject: `New subscriber: ${subscriberEmail}`,
      htmlContent: `
        <p>New subscriber: <strong>${subscriberEmail}</strong></p>
        <p>Date: ${dateStr} (Bangkok time)</p>
        ${countLine}
        <p><a href="${brevoLink}">View all subscribers in Brevo</a></p>
      `,
      textContent: `New subscriber: ${subscriberEmail}\nDate: ${dateStr} (Bangkok time)\n${countText}View in Brevo: ${brevoLink}`,
    }),
  });
}

export async function readNodeJsonBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    return request.body;
  }

  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
  }

  if (!raw) return {};
  return JSON.parse(raw);
}
