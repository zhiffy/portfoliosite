import {
  NEWSLETTER_ALLOWED_METHODS,
  NEWSLETTER_HEADERS,
  subscribeToStudioUpdates,
} from "../../lib/brevo-subscribe.js";

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { Allow: NEWSLETTER_ALLOWED_METHODS },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...NEWSLETTER_HEADERS, Allow: NEWSLETTER_ALLOWED_METHODS },
    });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const result = await subscribeToStudioUpdates(payload);
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: NEWSLETTER_HEADERS,
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Newsletter signup failed.",
      details: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: NEWSLETTER_HEADERS,
    });
  }
};

export const config = {
  path: "/api/newsletter-subscribe",
};
