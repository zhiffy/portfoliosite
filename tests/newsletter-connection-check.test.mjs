import assert from "node:assert/strict";
import { test } from "node:test";
import checkConnection, { config } from "../netlify/functions/newsletter-connection-check.mjs";

test("scheduled newsletter connection check", async (t) => {
  const savedKey = process.env.BREVO_API_KEY;
  const savedList = process.env.BREVO_LIST_ID;
  const savedFetch = globalThis.fetch;
  try {
    await t.test("checks the configured list with the signup key using GET", async () => {
      process.env.BREVO_API_KEY = "test-key";
      process.env.BREVO_LIST_ID = "4";
      globalThis.fetch = async (url, options) => {
        assert.equal(url, "https://api.brevo.com/v3/contacts/lists/4");
        assert.equal(options.method ?? "GET", "GET");
        assert.equal(options.headers["api-key"], "test-key");
        assert.ok(options.signal instanceof AbortSignal);
        assert.equal(options.body, undefined);
        return new Response("{}", { status: 200 });
      };
      await checkConnection();
      assert.equal(config.schedule, "0 2 * * 1");
      assert.equal(config.path, undefined);
    });

    await t.test("fails before requesting when credentials or list are missing", async () => {
      globalThis.fetch = async () => { assert.fail("must not send a request"); };
      delete process.env.BREVO_API_KEY;
      await assert.rejects(checkConnection(), /requires BREVO_API_KEY/);
      process.env.BREVO_API_KEY = "test-key";
      for (const list of ["", "0", "-1", "4/contacts", "not-a-list"]) {
        process.env.BREVO_LIST_ID = list;
        await assert.rejects(checkConnection(), /positive BREVO_LIST_ID/);
      }
    });

    await t.test("reports invalid keys, missing lists, throttling and provider failures", async () => {
      process.env.BREVO_LIST_ID = "4";
      for (const status of [401, 403, 404, 429, 500]) {
        globalThis.fetch = async () => new Response("private provider details", { status });
        await assert.rejects(checkConnection(), (error) => {
          assert.match(error.message, new RegExp(`HTTP ${status}`));
          assert.ok(!error.message.includes("private provider details"));
          return true;
        });
      }
    });

    await t.test("does not leak network error details or credentials", async () => {
      globalThis.fetch = async () => { throw new Error("sensitive request details test-key"); };
      await assert.rejects(checkConnection(), (error) => {
        assert.match(error.message, /could not reach Brevo/);
        assert.ok(!error.message.includes("test-key"));
        return true;
      });
    });
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = savedKey;
    if (savedList === undefined) delete process.env.BREVO_LIST_ID;
    else process.env.BREVO_LIST_ID = savedList;
  }
});
