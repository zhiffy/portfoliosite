import {
  NEWSLETTER_ALLOWED_METHODS,
  NEWSLETTER_HEADERS,
  readNodeJsonBody,
  subscribeToStudioUpdates,
} from "../lib/brevo-subscribe.js";

function sendJson(response, status, body) {
  response.status(status);
  for (const [key, value] of Object.entries(NEWSLETTER_HEADERS)) {
    response.setHeader(key, value);
  }
  response.end(JSON.stringify(body));
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.status(204);
    response.setHeader("Allow", NEWSLETTER_ALLOWED_METHODS);
    response.end();
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", NEWSLETTER_ALLOWED_METHODS);
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const payload = await readNodeJsonBody(request);
    const result = await subscribeToStudioUpdates(payload);
    sendJson(response, result.status, result.body);
  } catch (error) {
    sendJson(response, 500, {
      error: "Newsletter signup failed.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
