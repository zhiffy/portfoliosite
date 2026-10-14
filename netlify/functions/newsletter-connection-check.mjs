// Weekly, read-only check using the same credentials as newsletter signup.
// Brevo disables API keys after 90 days without a successful API request.
export default async function checkNewsletterConnection() {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = process.env.BREVO_LIST_ID;
  if (!apiKey || !/^[1-9]\d*$/.test(listId || "")) {
    throw new Error("Newsletter connection check requires BREVO_API_KEY and a positive BREVO_LIST_ID.");
  }

  let response;
  try {
    response = await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}`, {
      headers: { Accept: "application/json", "api-key": apiKey },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Never include credentials, request headers, or provider data in logs.
    throw new Error("Newsletter connection check could not reach Brevo within its timeout.");
  }

  // Only a successful request keeps the key active. Authentication failures
  // and missing lists must fail the scheduled invocation visibly in Netlify.
  if (!response.ok) {
    throw new Error(`Newsletter connection check failed (HTTP ${response.status}). Check the Brevo key and list in Netlify.`);
  }
  console.log("Newsletter connection check succeeded; Brevo key and subscriber list are accessible.");
}

export const config = {
  // Monday at 09:00 Bangkok time. Netlify scheduled functions are private
  // and cannot be invoked through a public website URL.
  schedule: "0 2 * * 1",
};
