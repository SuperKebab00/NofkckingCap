import assert from "node:assert/strict";

import {
  buildCanonicalOrder,
  clampText,
  insertOrder,
  normalizePhone,
  safeError,
  statusFromError,
  validateOrderDraft,
  verifyCapturedPaypalOrder,
} from "../functions/api/_lib/checkout.js";

const testEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
};

const productRows = [
  {
    id: "aftershave",
    name: "Aftershave",
    price: 15,
    stock: 10,
    is_active: true,
  },
  {
    id: "wax",
    name: "Wax",
    price: 17.5,
    stock: 1,
    is_active: true,
  },
  {
    id: "inactive",
    name: "Inactive Product",
    price: 99,
    stock: 10,
    is_active: false,
  },
];

function installSupabaseProductsFetchMock(products = productRows) {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const parsedUrl = new URL(String(url));
    assert.equal(parsedUrl.origin, "https://example.supabase.co");
    assert.equal(parsedUrl.pathname, "/rest/v1/products");
    assert.equal(init.headers.get("apikey"), "test-service-role");
    assert.equal(init.headers.get("Authorization"), "Bearer test-service-role");

    const idFilter = parsedUrl.searchParams.get("id") || "";
    const requestedIds = idFilter
      .replace(/^in\.\(/, "")
      .replace(/\)$/, "")
      .split(",")
      .map((value) => value.replace(/^"|"$/g, "").replace(/\\"/g, '"'))
      .filter(Boolean);
    const body = products.filter((product) =>
      requestedIds.includes(product.id),
    );

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

function canonicalInShopOrder() {
  return {
    id: "order-test-1",
    orderNumber: "NC-TEST-1",
    createdAt: "2026-06-23T10:00:00.000Z",
    customer: {
      fullName: "Mario Rossi",
      email: "mario@example.com",
      phone: "+393200000000",
    },
    fulfillment: "pickup",
    shippingAddress: null,
    items: [
      {
        productId: "aftershave",
        productName: "Aftershave",
        unitPrice: 15,
        quantity: 2,
        lineTotal: 30,
      },
    ],
    subtotal: 30,
    shipping: 0,
    total: 30,
    status: "prenotato",
    paymentMode: "in-shop",
  };
}

function installInsertOrderFetchMock({ failOn = "" } = {}) {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, init = {}) => {
    const parsedUrl = new URL(String(url));
    const body = init.body ? JSON.parse(init.body) : null;
    const call = {
      url: String(url),
      method: init.method || "GET",
      path: parsedUrl.pathname,
      search: parsedUrl.search,
      body,
      headers: init.headers,
    };
    calls.push(call);

    assert.equal(parsedUrl.origin, "https://example.supabase.co");
    assert.equal(init.headers.get("apikey"), "test-service-role");
    assert.equal(init.headers.get("Authorization"), "Bearer test-service-role");

    if (
      failOn === "order_items" &&
      call.method === "POST" &&
      call.path === "/rest/v1/order_items"
    ) {
      return new Response(JSON.stringify({ message: "order_items failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      failOn === "status" &&
      call.method === "PATCH" &&
      call.path === "/rest/v1/orders"
    ) {
      return new Response(JSON.stringify({ message: "status failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (call.method === "POST" && call.path === "/rest/v1/orders") {
      return new Response(
        JSON.stringify([
          {
            id: body.id,
            order_number: body.order_number,
            customer_name: body.customer_name,
            customer_email: body.customer_email,
            customer_phone: body.customer_phone,
            fulfillment: body.fulfillment,
            address: body.address,
            city: body.city,
            zip: body.zip,
            subtotal: body.subtotal,
            shipping: body.shipping,
            total: body.total,
            status: body.status,
            payment_mode: body.payment_mode,
            created_at: body.created_at,
          },
        ]),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }

    if (call.method === "POST" && call.path === "/rest/v1/order_items") {
      return new Response("", { status: 201 });
    }

    if (call.method === "PATCH" && call.path === "/rest/v1/orders") {
      return new Response(
        JSON.stringify([
          {
            id: "order-test-1",
            order_number: "NC-TEST-1",
            customer_name: "Mario Rossi",
            customer_email: "mario@example.com",
            customer_phone: "+393200000000",
            fulfillment: "pickup",
            address: null,
            city: null,
            zip: null,
            subtotal: 30,
            shipping: 0,
            total: 30,
            status: body.status,
            payment_mode: "in-shop",
            created_at: "2026-06-23T10:00:00.000Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (call.method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch call: ${call.method} ${call.path}`);
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

function validOrder(overrides = {}) {
  return {
    customer: {
      fullName: "Mario Rossi",
      email: "mario@example.com",
      phone: "+39 320 000 0000",
      ...(overrides.customer || {}),
    },
    fulfillment: "pickup",
    paymentMode: "in-shop",
    items: [{ productId: "aftershave", quantity: 2 }],
    ...overrides,
  };
}

assert.deepEqual(validateOrderDraft(validOrder()), {
  customer: {
    fullName: "Mario Rossi",
    email: "mario@example.com",
    phone: "+393200000000",
  },
  fulfillment: "pickup",
  shippingAddress: null,
  paymentMode: "in-shop",
  items: [{ productId: "aftershave", quantity: 2 }],
});

assert.deepEqual(
  validateOrderDraft(
    validOrder({
      fulfillment: "shipping",
      paymentMode: "paypal",
      shippingAddress: {
        address: " Via Roma 1 ",
        city: " Vignola ",
        zip: " 41058 ",
      },
    }),
  ),
  {
    customer: {
      fullName: "Mario Rossi",
      email: "mario@example.com",
      phone: "+393200000000",
    },
    fulfillment: "shipping",
    shippingAddress: {
      address: "Via Roma 1",
      city: "Vignola",
      zip: "41058",
    },
    paymentMode: "paypal",
    items: [{ productId: "aftershave", quantity: 2 }],
  },
);

assert.deepEqual(validateOrderDraft(validOrder({ customer: null })).customer, {
  fullName: "",
  email: "",
  phone: "",
});
assert.equal(
  validateOrderDraft(validOrder({ customer: { email: "not-an-email" } }))
    .customer.email,
  "not-an-email",
);
assert.equal(
  validateOrderDraft(validOrder({ customer: { phone: "abc" } })).customer.phone,
  "",
);

assert.throws(
  () => validateOrderDraft(validOrder({ items: [] })),
  /Carrello non valido/,
);
assert.throws(
  () =>
    validateOrderDraft(
      validOrder({ items: [{ productId: "aftershave", quantity: 0 }] }),
    ),
  /Quantita non valida/,
);
assert.throws(
  () =>
    validateOrderDraft(
      validOrder({ items: [{ productId: "aftershave", quantity: -1 }] }),
    ),
  /Quantita non valida/,
);
assert.throws(
  () =>
    validateOrderDraft(
      validOrder({ items: [{ productId: "aftershave", quantity: 1.5 }] }),
    ),
  /Quantita non valida/,
);
assert.throws(
  () =>
    validateOrderDraft(
      validOrder({ items: [{ productId: "aftershave", quantity: 11 }] }),
    ),
  /Quantita non valida/,
);
assert.throws(
  () =>
    validateOrderDraft(
      validOrder({
        items: Array.from({ length: 21 }, (_, index) => ({
          productId: `product-${index}`,
          quantity: 1,
        })),
      }),
    ),
  /Carrello non valido/,
);
assert.throws(
  () =>
    validateOrderDraft(
      validOrder({ items: [{ productId: "../bad", quantity: 1 }] }),
    ),
  /Prodotto non valido/,
);

assert.equal(normalizePhone("+39 320 000-0000"), "+393200000000");
assert.equal(normalizePhone("abc 123 456"), "123456");

assert.equal(clampText("  ciao   mondo  ", 100), "ciao mondo");
assert.equal(clampText("abcdef", 3), "abc");
assert.equal(clampText(12345, 4), "1234");
assert.equal(clampText(null, 4), "");

assert.equal(
  safeError(new Error("CLIENT: Email non valida.")),
  "Email non valida.",
);
assert.equal(safeError(new Error("Errore DB"), "Fallback"), "Fallback");
assert.equal(safeError(new Error("Errore DB"), "Fallback", true), "Errore DB");

assert.equal(statusFromError(new Error("CLIENT: Quantita non valida.")), 400);
assert.equal(statusFromError(new Error("Metodo non consentito.")), 405);
assert.equal(statusFromError(new Error("Troppe richieste.")), 429);
assert.equal(statusFromError(new Error("Errore interno.")), 500);
assert.equal(statusFromError(new Error("Errore interno."), 503), 503);

assert.throws(
  () => verifyCapturedPaypalOrder({ status: "PENDING" }, "order-1"),
  /Pagamento PayPal non completato/,
);
assert.throws(
  () =>
    verifyCapturedPaypalOrder(
      {
        status: "COMPLETED",
        purchase_units: [{ reference_id: "other-order" }],
      },
      "order-1",
    ),
  /non corrisponde/,
);
assert.deepEqual(
  verifyCapturedPaypalOrder(
    {
      status: "COMPLETED",
      purchase_units: [
        {
          reference_id: "order-1",
          payments: { captures: [{ id: "capture-1" }] },
        },
      ],
    },
    "order-1",
  ),
  { paypalCaptureId: "capture-1" },
);
assert.deepEqual(
  verifyCapturedPaypalOrder(
    {
      status: "COMPLETED",
      purchase_units: [{ custom_id: "order-2" }],
    },
    "order-2",
  ),
  { paypalCaptureId: null },
);

{
  const fetchMock = installSupabaseProductsFetchMock();
  try {
    const order = await buildCanonicalOrder(
      testEnv,
      validOrder({
        items: [
          {
            productId: "aftershave",
            quantity: 2,
            price: 999,
            productName: "Fake name",
            lineTotal: 999,
          },
        ],
        total: 999,
        status: "pagato",
      }),
    );

    assert.equal(fetchMock.calls.length, 1);
    assert.equal(order.customer.fullName, "Mario Rossi");
    assert.equal(order.fulfillment, "pickup");
    assert.equal(order.shippingAddress, null);
    assert.equal(order.subtotal, 30);
    assert.equal(order.shipping, 0);
    assert.equal(order.total, 30);
    assert.equal(order.status, "prenotato");
    assert.equal(order.paymentMode, "in-shop");
    assert.deepEqual(order.items, [
      {
        productId: "aftershave",
        productName: "Aftershave",
        unitPrice: 15,
        quantity: 2,
        lineTotal: 30,
      },
    ]);
  } finally {
    fetchMock.restore();
  }
}

{
  const fetchMock = installSupabaseProductsFetchMock();
  try {
    const order = await buildCanonicalOrder(
      testEnv,
      validOrder({
        fulfillment: "shipping",
        shippingAddress: {
          address: " Via Roma 1 ",
          city: " Vignola ",
          zip: " 41058 ",
        },
        items: [{ productId: "wax", quantity: 1 }],
      }),
    );

    assert.equal(fetchMock.calls.length, 1);
    assert.deepEqual(order.shippingAddress, {
      address: "Via Roma 1",
      city: "Vignola",
      zip: "41058",
    });
    assert.equal(order.subtotal, 17.5);
    assert.equal(order.shipping, 6);
    assert.equal(order.total, 23.5);
    assert.equal(order.status, "prenotato");
  } finally {
    fetchMock.restore();
  }
}

{
  const fetchMock = installSupabaseProductsFetchMock();
  try {
    const order = await buildCanonicalOrder(
      testEnv,
      validOrder({ paymentMode: "paypal" }),
    );

    assert.equal(fetchMock.calls.length, 1);
    assert.equal(order.status, "pending-payment");
    assert.equal(order.paymentMode, "paypal");
  } finally {
    fetchMock.restore();
  }
}

{
  const fetchMock = installSupabaseProductsFetchMock();
  try {
    await assert.rejects(
      () =>
        buildCanonicalOrder(
          testEnv,
          validOrder({ items: [{ productId: "wax", quantity: 2 }] }),
        ),
      /Disponibilita insufficiente/,
    );
    assert.equal(
      statusFromError(new Error("CLIENT: Disponibilita insufficiente.")),
      400,
    );
  } finally {
    fetchMock.restore();
  }
}

{
  const fetchMock = installSupabaseProductsFetchMock();
  try {
    await assert.rejects(
      () =>
        buildCanonicalOrder(
          testEnv,
          validOrder({ items: [{ productId: "inactive", quantity: 1 }] }),
        ),
      /Prodotto non disponibile/,
    );
  } finally {
    fetchMock.restore();
  }
}

{
  const fetchMock = installSupabaseProductsFetchMock();
  try {
    await assert.rejects(
      () =>
        buildCanonicalOrder(
          testEnv,
          validOrder({ items: [{ productId: "missing", quantity: 1 }] }),
        ),
      /Prodotto non disponibile/,
    );
  } finally {
    fetchMock.restore();
  }
}

{
  const fetchMock = installSupabaseProductsFetchMock();
  try {
    await assert.rejects(
      () =>
        buildCanonicalOrder(
          testEnv,
          validOrder({ items: [{ productId: "aftershave", quantity: 11 }] }),
        ),
      /Quantita non valida/,
    );
    assert.equal(fetchMock.calls.length, 0);
  } finally {
    fetchMock.restore();
  }
}

{
  const fetchMock = installInsertOrderFetchMock();
  try {
    const inserted = await insertOrder(testEnv, canonicalInShopOrder());

    assert.equal(fetchMock.calls.length, 3);

    assert.equal(fetchMock.calls[0].method, "POST");
    assert.equal(fetchMock.calls[0].path, "/rest/v1/orders");
    assert.equal(fetchMock.calls[0].body.status, "draft");
    assert.equal(fetchMock.calls[0].body.id, "order-test-1");
    assert.equal(fetchMock.calls[0].body.order_number, "NC-TEST-1");
    assert.equal(fetchMock.calls[0].body.customer_name, "Mario Rossi");
    assert.equal(fetchMock.calls[0].body.customer_email, "mario@example.com");
    assert.equal(fetchMock.calls[0].body.customer_phone, "+393200000000");
    assert.equal(fetchMock.calls[0].body.subtotal, 30);
    assert.equal(fetchMock.calls[0].body.shipping, 0);
    assert.equal(fetchMock.calls[0].body.total, 30);
    assert.equal(fetchMock.calls[0].body.payment_mode, "in-shop");

    assert.equal(fetchMock.calls[1].method, "POST");
    assert.equal(fetchMock.calls[1].path, "/rest/v1/order_items");
    assert.deepEqual(fetchMock.calls[1].body, [
      {
        order_id: "order-test-1",
        product_id: "aftershave",
        product_name: "Aftershave",
        unit_price: 15,
        quantity: 2,
        line_total: 30,
      },
    ]);

    assert.equal(fetchMock.calls[2].method, "PATCH");
    assert.equal(fetchMock.calls[2].path, "/rest/v1/orders");
    assert.equal(fetchMock.calls[2].search, "?select=*&id=eq.order-test-1");
    assert.deepEqual(fetchMock.calls[2].body, { status: "prenotato" });

    assert.equal(inserted.id, "order-test-1");
    assert.equal(inserted.status, "prenotato");
    assert.equal(inserted.paymentMode, "in-shop");
    assert.equal(inserted.total, 30);
    assert.deepEqual(inserted.items, canonicalInShopOrder().items);
  } finally {
    fetchMock.restore();
  }
}

{
  const fetchMock = installInsertOrderFetchMock({ failOn: "order_items" });
  try {
    await assert.rejects(
      () => insertOrder(testEnv, canonicalInShopOrder()),
      /order_items failed/,
    );

    const deleteCalls = fetchMock.calls.filter(
      (call) => call.method === "DELETE",
    );
    assert.equal(deleteCalls.length, 2);
    assert.equal(deleteCalls[0].path, "/rest/v1/order_items");
    assert.equal(deleteCalls[0].search, "?order_id=eq.order-test-1");
    assert.equal(deleteCalls[1].path, "/rest/v1/orders");
    assert.equal(deleteCalls[1].search, "?id=eq.order-test-1");
  } finally {
    fetchMock.restore();
  }
}

{
  const fetchMock = installInsertOrderFetchMock({ failOn: "status" });
  try {
    await assert.rejects(
      () => insertOrder(testEnv, canonicalInShopOrder()),
      /status failed/,
    );

    const deleteCalls = fetchMock.calls.filter(
      (call) => call.method === "DELETE",
    );
    assert.equal(deleteCalls.length, 2);
    assert.equal(deleteCalls[0].path, "/rest/v1/order_items");
    assert.equal(deleteCalls[0].search, "?order_id=eq.order-test-1");
    assert.equal(deleteCalls[1].path, "/rest/v1/orders");
    assert.equal(deleteCalls[1].search, "?id=eq.order-test-1");
  } finally {
    fetchMock.restore();
  }
}

console.log("Backend checkout tests passed.");
