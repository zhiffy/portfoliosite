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
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const RECAPTCHA_MIN_SCORE = 0.5;

// A "quiet accept" is returned for anything that trips a spam trap, so bots
// see a normal success response and don't retry with a different payload,
// while the contact never actually gets created in Brevo.
const QUIET_ACCEPT = { status: 200, body: { ok: true } };

async function verifyRecaptcha(token, secretKey) {
  if (!secretKey) return { skipped: true, ok: true };
  if (!token) return { skipped: false, ok: false, reason: "missing token" };

  try {
    const params = new URLSearchParams({ secret: secretKey, response: token });
    const res = await fetch(RECAPTCHA_VERIFY_URL, { method: "POST", body: params });
    const data = await res.json().catch(() => ({}));
    const ok = Boolean(data.success) && (typeof data.score !== "number" || data.score >= RECAPTCHA_MIN_SCORE);
    return { skipped: false, ok, reason: ok ? "" : JSON.stringify(data) };
  } catch (error) {
    // If Google's endpoint is unreachable, fail open rather than blocking
    // real subscribers over a network hiccup on our side.
    return { skipped: false, ok: true, reason: "verify request failed" };
  }
}

export async function subscribeToStudioUpdates(payload = {}, env = process.env) {
  const apiKey = envValue(env, ["BREVO_API_KEY"]);
  const listId  = envValue(env, ["BREVO_LIST_ID"]);
  const recaptchaSecret = envValue(env, ["RECAPTCHA_SECRET_KEY"]);

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
  const renderedAt = Number(payload.ts);
  if (renderedAt && Date.now() - renderedAt < MIN_FILL_TIME_MS) {
    return QUIET_ACCEPT;
  }

  const recaptchaResult = await verifyRecaptcha(cleanString(payload.recaptchaToken), recaptchaSecret);
  if (!recaptchaResult.ok) {
    return QUIET_ACCEPT;
  }

  const email = cleanString(payload.email).toLowerCase();
  if (!email || !isValidEmail(email)) {
    return {
      status: 400,
      body: { error: "Please enter a valid email address." },
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
