import assert from "node:assert/strict";
import { test } from "node:test";
import { subscribeToStudioUpdates } from "../lib/brevo-subscribe.js";

const ENV = { BREVO_API_KEY: "test-key", BREVO_LIST_ID: "4", TURNSTILE_SECRET: "test-secret" };
const PASS = { success: true, action: "subscribe", hostname: "www.shavonnewong.art" };
const oldTs = () => String(Date.now() - 10_000);

function mockFetch(siteverify) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), body: options.body });
    if (String(url).includes("turnstile")) {
      return new Response(JSON.stringify(siteverify), { status: 200 });
    }
    return new Response("{}", { status: 201 });
  };
  return calls;
}

const brevoContactCalls = (calls) => calls.filter((c) => c.url === "https://api.brevo.com/v3/contacts");
const signup = (extra = {}) => ({ email: "reader@example.com", ts: oldTs(), turnstileToken: "tok", ...extra });

test("newsletter signup Turnstile checks", async (t) => {
  const savedFetch = globalThis.fetch;
  const savedWarn = console.warn;
  const savedError = console.error;
  console.warn = () => {};
  console.error = () => {};
  try {
    await t.test("a direct post with no ts never reaches Brevo or Cloudflare", async () => {
      const calls = mockFetch(PASS);
      const result = await subscribeToStudioUpdates({ email: "bot@example.com", turnstileToken: "tok" }, ENV);
      assert.equal(result.status, 200);
      assert.equal(calls.length, 0);
    });

    await t.test("a filled honeypot never reaches Brevo", async () => {
      const calls = mockFetch(PASS);
      await subscribeToStudioUpdates(signup({ website: "x" }), ENV);
      assert.equal(calls.length, 0);
    });

    await t.test("a missing or oversized token is refused with a visible error", async () => {
      const calls = mockFetch(PASS);
      const missing = await subscribeToStudioUpdates(signup({ turnstileToken: "" }), ENV);
      assert.equal(missing.status, 400);
      assert.equal(missing.body.code, "missing-token");
      assert.match(missing.body.error, /studio@shavonnewong\.art/);
      const oversized = await subscribeToStudioUpdates(signup({ turnstileToken: "x".repeat(2049) }), ENV);
      assert.equal(oversized.body.code, "invalid-token");
      assert.equal(calls.length, 0);
    });

    await t.test("a token Cloudflare rejects, including a replayed one, is refused", async () => {
      for (const code of ["invalid-input-response", "timeout-or-duplicate"]) {
        const calls = mockFetch({ success: false, "error-codes": [code] });
        const result = await subscribeToStudioUpdates(signup(), ENV);
        assert.equal(result.status, 400);
        assert.equal(result.body.code, code);
        assert.equal(brevoContactCalls(calls).length, 0);
      }
    });

    await t.test("a token for another action or hostname is refused", async () => {
      let calls = mockFetch({ ...PASS, action: "contact" });
      assert.equal((await subscribeToStudioUpdates(signup(), ENV)).body.code, "action-mismatch");
      assert.equal(brevoContactCalls(calls).length, 0);
      calls = mockFetch({ ...PASS, hostname: "evil.example" });
      assert.equal((await subscribeToStudioUpdates(signup(), ENV)).body.code, "hostname-mismatch");
      assert.equal(brevoContactCalls(calls).length, 0);
    });

    await t.test("without the secret every signup is refused (fails closed)", async () => {
      const calls = mockFetch(PASS);
      const result = await subscribeToStudioUpdates(signup(), { BREVO_API_KEY: "test-key", BREVO_LIST_ID: "4" });
      assert.equal(result.status, 400);
      assert.equal(result.body.code, "not-configured");
      assert.equal(calls.length, 0);
    });

    await t.test("an unreachable Cloudflare fails closed", async () => {
      globalThis.fetch = async () => { throw new Error("network down"); };
      const result = await subscribeToStudioUpdates(signup(), ENV);
      assert.equal(result.body.code, "verify-request-failed");
    });

    await t.test("a valid token adds the reader and sends the secret and client IP to Cloudflare", async () => {
      const calls = mockFetch(PASS);
      const result = await subscribeToStudioUpdates(signup({ email: "Reader@Example.com" }), ENV, { remoteIp: "203.0.113.7" });
      assert.equal(result.status, 200);
      assert.equal(brevoContactCalls(calls).length, 1);
      const verify = new URLSearchParams(calls[0].body);
      assert.equal(verify.get("secret"), "test-secret");
      assert.equal(verify.get("response"), "tok");
      assert.equal(verify.get("remoteip"), "203.0.113.7");
    });

    await t.test("the form's cf-turnstile-response field is accepted too", async () => {
      const calls = mockFetch(PASS);
      const result = await subscribeToStudioUpdates(signup({ turnstileToken: undefined, "cf-turnstile-response": "tok" }), ENV);
      assert.equal(result.status, 200);
      assert.equal(brevoContactCalls(calls).length, 1);
    });

    await t.test("TURNSTILE_HOSTNAMES overrides the allowed hostnames", async () => {
      mockFetch({ ...PASS, hostname: "localhost" });
      const local = await subscribeToStudioUpdates(signup(), { ...ENV, TURNSTILE_HOSTNAMES: "localhost, 127.0.0.1" });
      assert.equal(local.status, 200);
      mockFetch({ ...PASS, hostname: "localhost" });
      const prod = await subscribeToStudioUpdates(signup(), ENV);
      assert.equal(prod.body.code, "hostname-mismatch");
    });
  } finally {
    globalThis.fetch = savedFetch;
    console.warn = savedWarn;
    console.error = savedError;
  }
});
