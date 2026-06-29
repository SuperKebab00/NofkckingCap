import assert from "node:assert/strict";
import { onRequest } from "../functions/api/admin/status.js";

function createContext({ method = "GET", token, env = {} } = {}) {
  return {
    env: {
      ADMIN_API_TOKEN: "secret-admin-token",
      APP_ENV: "test",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
      SUPABASE_URL: "https://example.supabase.co",
      ...env,
    },
    request: new Request("https://example.com/api/admin/status", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      method,
    }),
  };
}

const originalFetch = globalThis.fetch;

try {
  globalThis.fetch = async (url) => {
    const target = String(url);

    if (target.includes("/rest/v1/products?")) {
      return new Response(JSON.stringify([{ id: "p1" }, { id: "p2" }]), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (target.includes("/rest/v1/shop_categories?")) {
      return new Response(JSON.stringify([{ id: "c1" }]), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error(`Unexpected fetch url: ${target}`);
  };

  {
    const response = await onRequest(createContext());
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, "Non autorizzato.");
  }

  {
    const response = await onRequest(createContext({ token: "wrong-token" }));
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, "Non autorizzato.");
  }

  {
    const response = await onRequest(
      createContext({ method: "POST", token: "secret-admin-token" }),
    );
    assert.equal(response.status, 405);
    assert.equal((await response.json()).error, "Metodo non consentito.");
  }

  {
    const response = await onRequest(
      createContext({ token: "secret-admin-token" }),
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.adminApi, "available");
    assert.equal(body.mode, "read-only");
    assert.equal(body.writes, "disabled");
    assert.deepEqual(body.catalog, {
      categoriesCount: 1,
      productsCount: 2,
    });
  }

  console.log("Admin status API tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
