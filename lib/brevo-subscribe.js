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

export async function subscribeToStudioUpdates(payload = {}, env = process.env) {
  const apiKey = envValue(env, ["BREVO_API_KEY"]);
  const listId  = envValue(env, ["BREVO_LIST_ID"]);

  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: "Brevo is not configured.",
        required: ["BREVO_API_KEY", "BREVO_LIST_ID"],
      },
    };
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
