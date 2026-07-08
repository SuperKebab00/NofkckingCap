import assert from "node:assert/strict";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/server/contact-create.ts");

const env = {
  APP_ENV: "development",
  SUPABASE_SERVICE_ROLE_KEY: "server-secret",
  SUPABASE_URL: "https://contact.supabase.co",
};

function request(body) {
  return new Request("https://example.com/api/contact/create", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

{
  const originalFetch = global.fetch;
  const requests = [];

  global.fetch = async (input, init = {}) => {
    const url = String(input);
    requests.push({ body: init.body, url });

    if (url.endsWith("/rest/v1/leads")) {
      const body = JSON.parse(String(init.body));
      assert.equal(body.email, "customer@example.com");
      assert.equal(body.phone, "+393208839692");
      assert.equal(body.privacy_accepted, true);
      assert.equal(body.source, "contact-form");
      assert.ok(!("id" in body));
      assert.ok(!("created_at" in body));
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer server-secret");
      return new Response("", { status: 201 });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const response = await mod.handleContactCreate(
      request({
        email: "CUSTOMER@example.com",
        message: "Messaggio valido di almeno dieci caratteri.",
        phone: "+39 320 883 9692",
        privacy_accepted: true,
        subject: "Info prodotti",
      }),
      env,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.ok(requests.some((entry) => entry.url.endsWith("/rest/v1/leads")));
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const originalFetch = global.fetch;
  let called = false;

  global.fetch = async () => {
    called = true;
    throw new Error("Honeypot should not write.");
  };

  try {
    const response = await mod.handleContactCreate(
      request({
        email: "bot@example.com",
        message: "Messaggio valido di almeno dieci caratteri.",
        phone: "+393208839692",
        privacy_accepted: true,
        subject: "Bot",
        website: "filled",
      }),
      env,
    );

    assert.equal(response.status, 200);
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
  }
}

console.log("Contact create tests passed.");
