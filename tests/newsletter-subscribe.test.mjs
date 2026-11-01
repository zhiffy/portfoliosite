import assert from "node:assert/strict";
import { test } from "node:test";
import { subscribeToStudioUpdates } from "../lib/brevo-subscribe.js";

const ENV = { BREVO_API_KEY: "test-key", BREVO_LIST_ID: "4", RECAPTCHA_SECRET_KEY: "test-secret" };
const oldTs = () => String(Date.now() - 10_000);

function mockFetch({ recaptcha }) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push(String(url));
    if (String(url).includes("recaptcha")) {
      return new Response(JSON.stringify(recaptcha), { status: 200 });
    }
    return new Response("{}", { status: 201 });
  };
  return calls;
}

const brevoContactCalls = (calls) => calls.filter((u) => u === "https://api.brevo.com/v3/contacts");

test("newsletter signup spam checks", async (t) => {
  const savedFetch = globalThis.fetch;
  const savedWarn = console.warn;
  console.warn = () => {};
  try {
    await t.test("a direct post with no ts never reaches Brevo", async () => {
      const calls = mockFetch({ recaptcha: { success: true, score: 0.9 } });
      const result = await subscribeToStudioUpdates({ email: "bot@example.com", recaptchaToken: "tok" }, ENV);
      assert.equal(result.status, 200);
      assert.equal(calls.length, 0);
    });

    await t.test("a filled honeypot never reaches Brevo", async () => {
      const calls = mockFetch({ recaptcha: { success: true, score: 0.9 } });
      await subscribeToStudioUpdates({ email: "bot@example.com", website: "x", ts: oldTs(), recaptchaToken: "tok" }, ENV);
      assert.equal(calls.length, 0);
    });

    await t.test("a missing reCAPTCHA token is refused with a visible error", async () => {
      const calls = mockFetch({ recaptcha: { success: true, score: 0.9 } });
      const result = await subscribeToStudioUpdates({ email: "bot@example.com", ts: oldTs() }, ENV);
      assert.equal(result.status, 400);
      assert.match(result.body.error, /studio@shavonnewong\.art/);
      assert.equal(brevoContactCalls(calls).length, 0);
    });

    await t.test("a low reCAPTCHA score is refused", async () => {
      const calls = mockFetch({ recaptcha: { success: true, score: 0.1 } });
      const result = await subscribeToStudioUpdates({ email: "bot@example.com", ts: oldTs(), recaptchaToken: "tok" }, ENV);
      assert.equal(result.status, 400);
      assert.equal(brevoContactCalls(calls).length, 0);
    });

    await t.test("a token Google rejects is refused", async () => {
      const calls = mockFetch({ recaptcha: { success: false, "error-codes": ["invalid-input-response"] } });
      const result = await subscribeToStudioUpdates({ email: "bot@example.com", ts: oldTs(), recaptchaToken: "fake" }, ENV);
      assert.equal(result.status, 400);
      assert.equal(result.body.code, "invalid-input-response");
      assert.equal(brevoContactCalls(calls).length, 0);
    });

    await t.test("a real visitor with a good score is added to the list", async () => {
      const calls = mockFetch({ recaptcha: { success: true, score: 0.9 } });
      const result = await subscribeToStudioUpdates({ email: "Reader@Example.com", ts: oldTs(), recaptchaToken: "tok" }, ENV);
      assert.equal(result.status, 200);
      assert.equal(brevoContactCalls(calls).length, 1);
    });

    await t.test("without the secret a token is still required", async () => {
      const env = { BREVO_API_KEY: "test-key", BREVO_LIST_ID: "4" };
      let calls = mockFetch({ recaptcha: {} });
      const refused = await subscribeToStudioUpdates({ email: "bot@example.com", ts: oldTs() }, env);
      assert.equal(refused.status, 400);
      assert.equal(brevoContactCalls(calls).length, 0);
      calls = mockFetch({ recaptcha: {} });
      const accepted = await subscribeToStudioUpdates({ email: "reader@example.com", ts: oldTs(), recaptchaToken: "tok" }, env);
      assert.equal(accepted.status, 200);
      assert.equal(brevoContactCalls(calls).length, 1);
    });
  } finally {
    globalThis.fetch = savedFetch;
    console.warn = savedWarn;
  }
});
