const BREVO_CONTACTS_URL = "https://api.brevo.com/v3/contacts";

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
