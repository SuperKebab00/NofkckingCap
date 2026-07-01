import assert from "node:assert/strict";
import { onRequest } from "../functions/api/admin/products/summary.js";

function createContext({ method = "GET", token } = {}) {
  return {
    env: {
      ADMIN_API_TOKEN: "secret-admin-token",
      APP_ENV: "test",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
      SUPABASE_URL: "https://supabase.example",
    },
    request: new Request("https://example.com/api/admin/products/summary", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      method,
    }),
  };
}

const originalFetch = globalThis.fetch;

try {
  globalThis.fetch = async (input) => {
    const target = String(input);

    if (target.includes("/rest/v1/products?")) {
      return new Response(
        JSON.stringify([
          {
            id: "pomade",
            name: "Matte Pomade",
            price: 18.5,
            category: "styling",
            stock: 12,
            customer_email: "hidden@example.com",
          },
          {
            id: "brush",
            name: "Fade Brush",
            price: 9.9,
            category: "tools",
            inventory_reserved: true,
          },
        ]),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    throw new Error(`Unexpected fetch target: ${target}`);
  };

  {
    const response = await onRequest(createContext());
    assert.equal(response.status, 401);
  }

  {
    const response = await onRequest(createContext({ token: "wrong-token" }));
    assert.equal(response.status, 401);
  }

  {
    const response = await onRequest(
      createContext({ method: "POST", token: "secret-admin-token" }),
    );
    assert.equal(response.status, 405);
  }

  {
    const response = await onRequest(
      createContext({ token: "secret-admin-token" }),
    );
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.adminApi, "available");
    assert.equal(payload.mode, "read-only");
    assert.equal(payload.writes, "disabled");
    assert.equal(payload.total, 2);
    assert.deepEqual(payload.products, [
      {
        id: "pomade",
        name: "Matte Pomade",
        price: 18.5,
        category: "styling",
      },
      {
        id: "brush",
        name: "Fade Brush",
        price: 9.9,
        category: "tools",
      },
    ]);

    assert.ok(!JSON.stringify(payload).includes("customer_email"));
    assert.ok(!JSON.stringify(payload).includes("inventory_reserved"));
    assert.ok(!JSON.stringify(payload).includes("stock"));
  }

  console.log("Admin products summary API tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
