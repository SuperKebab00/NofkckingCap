import assert from "node:assert/strict";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/server/orders-create.ts");

const env = {
  APP_ENV: "development",
  SUPABASE_SERVICE_ROLE_KEY: "server-secret",
  SUPABASE_URL: "https://orders.supabase.co",
};

function postOrder(body) {
  return new Request("https://example.com/api/orders/create", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

assert.throws(
  () => mod.__ordersCreateTest.normalizePayload({ items: [] }),
  /Payload ordine non valido/,
);

assert.deepEqual(
  mod.__ordersCreateTest.normalizePayload({
    customer: {
      email: "client@example.com",
      fullName: " Mario Rossi ",
      phone: " +39 333 1234567 ",
    },
    fulfillment: "delivery",
    idempotency_key: "idem-123456789",
    items: [{ productId: "black-wax", quantity: "2" }],
    paymentMode: "in_shop",
    shippingAddress: {
      address: "Via Roma 1",
      city: "Napoli",
      zip: "80100",
    },
  }),
  {
    city: "Napoli",
    customerEmail: "client@example.com",
    customerName: "Mario Rossi",
    customerPhone: "+39 333 1234567",
    fulfillment: "shipping",
    idempotencyKey: "idem-123456789",
    items: [{ productId: "black-wax", quantity: 2, slug: undefined }],
    notes: null,
    paymentMode: "in-shop",
    shippingAddress: "Via Roma 1",
    zip: "80100",
  },
);

{
  const originalFetch = global.fetch;
  const requests = [];

  global.fetch = async (input, init = {}) => {
    const url = String(input);
    requests.push({ body: init.body, method: init.method || "GET", url });

    if (url.endsWith("/rest/v1/rpc/create_order_with_items")) {
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer server-secret");
      const body = JSON.parse(String(init.body));
      assert.equal(body.p_idempotency_key, "idem-rpc-success-1");
      assert.equal(body.p_payload.items[0].product_id, "black-wax");
      assert.equal(body.p_payload.items[0].quantity, 2);
      assert.ok(typeof body.p_payload_hash === "string");
      return new Response(
        JSON.stringify({
          order: {
            id: "11111111-1111-1111-1111-111111111111",
            items: [{ id: "item-1", line_total: 40 }],
            order_number: "NC-2026-123456",
            payment_mode: "paypal",
            shipping: 6,
            status: "in-attesa",
            subtotal: 40,
            total: 46,
          },
        }),
        { status: 201 },
      );
    }

    if (url.endsWith("/rest/v1/admin_audit_log")) {
      const body = JSON.parse(String(init.body));
      assert.equal(body.action, "order.create");
      assert.equal(body.entity_type, "order");
      return new Response("", { status: 201 });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const response = await mod.handleOrderCreate(
      postOrder({
        customer: {
          email: "client@example.com",
          fullName: "Mario Rossi",
          phone: "+393331234567",
        },
        fulfillment: "shipping",
        idempotency_key: "idem-rpc-success-1",
        items: [{ productId: "black-wax", quantity: 2, unitPrice: 999 }],
        paymentMode: "paypal",
        shippingAddress: {
          address: "Via Roma 1",
          city: "Napoli",
          zip: "80100",
        },
      }),
      env,
    );

    assert.equal(response.status, 201);
    const json = await response.json();
    assert.equal(json.order.total, 46);
    assert.equal(json.order.order_number, "NC-2026-123456");
    assert.ok(requests.some((request) => request.url.endsWith("/rest/v1/admin_audit_log")));
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const originalFetch = global.fetch;

  global.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/rest/v1/rpc/create_order_with_items")) {
      return new Response(JSON.stringify({ message: "CLIENT: Stock insufficiente per Black Wax." }), { status: 400 });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const response = await mod.handleOrderCreate(
      postOrder({
        customer_email: "client@example.com",
        customer_name: "Mario Rossi",
        customer_phone: "+393331234567",
        idempotency_key: "idem-stock-low-1",
        items: [{ productId: "black-wax", quantity: 2 }],
      }),
      env,
    );

    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /Stock insufficiente/);
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const originalFetch = global.fetch;

  global.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/rest/v1/rpc/create_order_with_items")) {
      return new Response(JSON.stringify({ message: "CLIENT: Prodotto ordine non trovato." }), { status: 400 });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const response = await mod.handleOrderCreate(
      postOrder({
        customer_email: "client@example.com",
        customer_name: "Mario Rossi",
        customer_phone: "+393331234567",
        idempotency_key: "idem-missing-product-1",
        items: [{ productId: "missing-product", quantity: 1 }],
      }),
      env,
    );

    assert.equal(response.status, 404);
    assert.match((await response.json()).error, /Prodotto ordine non trovato/);
  } finally {
    global.fetch = originalFetch;
  }
}

{
  const originalFetch = global.fetch;

  global.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/rest/v1/rpc/create_order_with_items")) {
      return new Response(JSON.stringify({ message: "CLIENT: Idempotency conflict." }), { status: 400 });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const response = await mod.handleOrderCreate(
      postOrder({
        customer_email: "client@example.com",
        customer_name: "Mario Rossi",
        customer_phone: "+393331234567",
        idempotency_key: "idem-conflict-1",
        items: [{ productId: "black-wax", quantity: 1 }],
      }),
      env,
    );

    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /Idempotency conflict/);
  } finally {
    global.fetch = originalFetch;
  }
}

console.log("Orders create tests passed.");
