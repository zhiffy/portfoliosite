const MAILERLITE_SUBSCRIBERS_URL = "https://connect.mailerlite.com/api/subscribers";

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
  const apiKey = envValue(env, ["MAILERLITE_API_KEY"]);

  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: "MailerLite is not configured.",
        required: ["MAILERLITE_API_KEY"],
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

  const response = await fetch(MAILERLITE_SUBSCRIBERS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    return {
      status: response.status === 429 ? 429 : 502,
      body: {
        error: "Could not add this email to MailerLite.",
        details: details.slice(0, 280),
      },
    };
  }

  return {
    status: 200,
    body: { ok: true },
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
