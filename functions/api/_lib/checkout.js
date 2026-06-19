const JSON_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8"
};

const MAX_JSON_BYTES = 32 * 1024;
const MAX_CHECKOUT_ITEMS = 20;
const MAX_ITEM_QUANTITY = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const LOCAL_RATE_LIMITS = new Map();

const PAYPAL_API_BASE = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com"
};

const STRIPE_API_BASE = "https://api.stripe.com";

function quoteListValue(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function todayIsoString() {
  return new Date().toISOString();
}

function numeric(value) {
  return Number(Number(value || 0).toFixed(2));
}

function buildOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const compact = `${now.getMonth() + 1}`.padStart(2, "0")
    + `${now.getDate()}`.padStart(2, "0")
    + `${now.getHours()}`.padStart(2, "0")
    + `${now.getMinutes()}`.padStart(2, "0")
    + `${now.getSeconds()}`.padStart(2, "0");
  const random = Math.floor(100 + Math.random() * 900);
  return `NC-${year}-${compact}-${random}`;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

export function safeError(error, fallback = "Richiesta non riuscita.", exposeDetails = false) {
  const message = String(error?.message || "");
  if (message.startsWith("CLIENT:")) {
    return message.replace(/^CLIENT:\s*/, "");
  }
  if (exposeDetails && message) return message;
  return fallback;
}

export function safeLog(context, message, details = {}) {
  if (context?.env?.APP_ENV === "production") return;
  console.warn(message, details);
}

export function statusFromError(error, fallback = 500) {
  const message = String(error?.message || "");
  if (
    message.startsWith("CLIENT:")
    || message.includes("Payload JSON non valido")
    || message.includes("Payload troppo grande")
    || message.includes("Content-Type non supportato")
    || message.includes("non corrisponde all'ordine locale")
    || message.includes("non e associato")
    || message.includes("non ancora confermato")
    || message.includes("Pagamento ")
  ) {
    return 400;
  }
  if (message.includes("Metodo non consentito")) return 405;
  if (message.includes("Troppe richieste")) return 429;
  return fallback;
}

export async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("CLIENT: Content-Type non supportato.");
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_JSON_BYTES) {
    throw new Error("CLIENT: Payload troppo grande.");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_JSON_BYTES) {
    throw new Error("CLIENT: Payload troppo grande.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("CLIENT: Payload JSON non valido.");
  }
}

function getRequiredEnv(env, key) {
  const value = env[key];
  if (!value) {
    throw new Error(`Variabile ambiente mancante: ${key}`);
  }
  return value;
}

function clientIp(request) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "local";
}

async function verifyTurnstileIfConfigured(context, token) {
  const secret = context.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;
  if (!token) throw new Error("CLIENT: Verifica anti-spam richiesta.");

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret,
      response: token,
      remoteip: clientIp(context.request)
    }).toString()
  });
  const result = await response.json().catch(() => null);
  if (!result?.success) {
    throw new Error("CLIENT: Verifica anti-spam non valida.");
  }
}

export async function guardApiRequest(context, options = {}) {
  if (context.request.method !== "POST") {
    throw new Error("Metodo non consentito.");
  }
  await applyRateLimit(context, options.rateLimitKey || "api", options.rateLimit || 30);
}

async function applyRateLimit(context, bucket, maxRequests) {
  const key = `${bucket}:${clientIp(context.request)}`;
  const now = Date.now();
  const resetAt = now + RATE_LIMIT_WINDOW_MS;

  if (context.env.RATE_LIMIT_KV) {
    const current = await context.env.RATE_LIMIT_KV.get(key, "json");
    const next = current && current.resetAt > now
      ? { count: current.count + 1, resetAt: current.resetAt }
      : { count: 1, resetAt };
    await context.env.RATE_LIMIT_KV.put(key, JSON.stringify(next), {
      expirationTtl: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
    });
    if (next.count > maxRequests) throw new Error("Troppe richieste.");
    return;
  }

  const current = LOCAL_RATE_LIMITS.get(key);
  const next = current && current.resetAt > now
    ? { count: current.count + 1, resetAt: current.resetAt }
    : { count: 1, resetAt };
  LOCAL_RATE_LIMITS.set(key, next);
  if (next.count > maxRequests) throw new Error("Troppe richieste.");
}

export async function parseGuardedJson(context, options = {}) {
  await guardApiRequest(context, options);
  const payload = await readJson(context.request);
  if (options.turnstile) {
    await verifyTurnstileIfConfigured(context, payload.turnstileToken || payload["cf-turnstile-response"]);
  }
  return payload;
}

async function parseResponse(response, fallbackMessage) {
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!response.ok) {
    throw new Error(data?.message || data?.error_description || fallbackMessage);
  }
  return data;
}

export async function supabaseRequest(env, path, init = {}) {
  const supabaseUrl = getRequiredEnv(env, "SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const headers = new Headers(init.headers || {});
  headers.set("apikey", serviceRoleKey);
  headers.set("Authorization", `Bearer ${serviceRoleKey}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers
  });

  return parseResponse(response, "Errore chiamata Supabase.");
}

export async function getProductsByIds(env, ids) {
  if (!ids.length) return [];
  const params = new URLSearchParams({
    select: "id,name,price,stock,is_active"
  });
  params.set("id", `in.(${ids.map(quoteListValue).join(",")})`);
  return supabaseRequest(env, `products?${params.toString()}`);
}

export function validateOrderDraft(inputOrder) {
  if (!inputOrder || typeof inputOrder !== "object") {
    throw new Error("CLIENT: Ordine mancante.");
  }

  const rawItems = Array.isArray(inputOrder.items) ? inputOrder.items : [];
  if (!rawItems.length || rawItems.length > MAX_CHECKOUT_ITEMS) {
    throw new Error("CLIENT: Carrello non valido.");
  }

  const items = rawItems.map((item) => {
    const productId = String(item.productId || "").trim();
    const quantity = Number(item.quantity);
    if (!/^[a-z0-9][a-z0-9-]{1,80}$/i.test(productId)) {
      throw new Error("CLIENT: Prodotto non valido.");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      throw new Error("CLIENT: Quantita non valida.");
    }
    return { productId, quantity };
  });

  if (!items.length) {
    throw new Error("CLIENT: Nessun prodotto valido nell'ordine.");
  }

  return {
    customer: {
      fullName: clampText(inputOrder.customer?.fullName, 90),
      email: clampText(inputOrder.customer?.email, 160).toLowerCase(),
      phone: normalizePhone(inputOrder.customer?.phone)
    },
    fulfillment: inputOrder.fulfillment === "shipping" ? "shipping" : "pickup",
    shippingAddress: inputOrder.fulfillment === "shipping"
      ? {
          address: clampText(inputOrder.shippingAddress?.address, 180),
          city: clampText(inputOrder.shippingAddress?.city, 90),
          zip: clampText(inputOrder.shippingAddress?.zip, 20)
        }
      : null,
    paymentMode: inputOrder.paymentMode === "stripe"
      ? "stripe"
      : (inputOrder.paymentMode === "paypal" ? "paypal" : "in-shop"),
    items
  };
}

export function clampText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").slice(0, 20);
}

export async function buildCanonicalOrder(env, inputOrder) {
  const draft = validateOrderDraft(inputOrder);
  if (!draft.customer.fullName) {
    throw new Error("CLIENT: Nome cliente mancante.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.customer.email)) {
    throw new Error("CLIENT: Email cliente non valida.");
  }
  if (draft.customer.phone.replace(/[^\d+]/g, "").length < 8) {
    throw new Error("CLIENT: Telefono cliente non valido.");
  }
  if (draft.fulfillment === "shipping") {
    if (!draft.shippingAddress?.address || !draft.shippingAddress.city || !draft.shippingAddress.zip) {
      throw new Error("CLIENT: Indirizzo di spedizione incompleto.");
    }
  }

  const products = await getProductsByIds(env, draft.items.map((item) => item.productId));
  const productsById = new Map(products.map((product) => [product.id, product]));

  const orderItems = draft.items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product || product.is_active === false) {
      throw new Error("CLIENT: Prodotto non disponibile.");
    }

    const stock = Number(product.stock || 0);
    if (stock < item.quantity) {
      throw new Error("CLIENT: Disponibilita insufficiente.");
    }

    return {
      productId: product.id,
      productName: product.name,
      unitPrice: numeric(product.price),
      quantity: item.quantity,
      lineTotal: numeric(Number(product.price || 0) * item.quantity)
    };
  });

  const subtotal = numeric(orderItems.reduce((sum, item) => sum + item.lineTotal, 0));
  const shipping = draft.fulfillment === "shipping" ? 6 : 0;
  const total = numeric(subtotal + shipping);
  if (total <= 0) {
    throw new Error("CLIENT: Totale ordine non valido.");
  }
  const now = todayIsoString();

  return {
    id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    orderNumber: buildOrderNumber(),
    createdAt: now,
    customer: draft.customer,
    fulfillment: draft.fulfillment,
    shippingAddress: draft.shippingAddress,
    items: orderItems,
    subtotal,
    shipping,
    total,
    status: ["paypal", "stripe"].includes(draft.paymentMode) ? "pending-payment" : "prenotato",
    paymentMode: draft.paymentMode
  };
}

export async function insertOrder(env, order) {
  const createdRows = await supabaseRequest(env, "orders", {
    method: "POST",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      id: order.id,
      order_number: order.orderNumber,
      customer_name: order.customer.fullName,
      customer_email: order.customer.email,
      customer_phone: order.customer.phone,
      fulfillment: order.fulfillment,
      address: order.shippingAddress?.address || null,
      city: order.shippingAddress?.city || null,
      zip: order.shippingAddress?.zip || null,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      status: "draft",
      payment_mode: order.paymentMode,
      created_at: order.createdAt
    })
  });

  try {
    await supabaseRequest(env, "order_items", {
      method: "POST",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify(order.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        line_total: item.lineTotal
      })))
    });

    const updatedRow = await updateOrderStatus(env, order.id, order.status);
    return normalizeOrderRow(updatedRow || createdRows?.[0], order.items);
  } catch (error) {
    await deleteOrder(env, order.id).catch(() => null);
    throw error;
  }
}

function normalizeOrderRow(row, items = []) {
  if (!row) return null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    customer: {
      fullName: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone
    },
    fulfillment: row.fulfillment,
    shippingAddress: row.address || row.city || row.zip
      ? {
          address: row.address || "",
          city: row.city || "",
          zip: row.zip || ""
        }
      : null,
    items,
    subtotal: numeric(row.subtotal),
    shipping: numeric(row.shipping),
    total: numeric(row.total),
    status: row.status,
    paymentMode: row.payment_mode || "in-shop"
  };
}

export async function getOrderWithItems(env, orderId) {
  const orderParams = new URLSearchParams({ select: "*" });
  orderParams.set("id", `eq.${orderId}`);
  const itemParams = new URLSearchParams({ select: "*" });
  itemParams.set("order_id", `eq.${orderId}`);

  const [orders, items] = await Promise.all([
    supabaseRequest(env, `orders?${orderParams.toString()}`),
    supabaseRequest(env, `order_items?${itemParams.toString()}`)
  ]);

  if (!Array.isArray(orders) || !orders.length) {
    throw new Error("Ordine non trovato.");
  }

  const normalizedItems = (items || []).map((item) => ({
    productId: item.product_id,
    productName: item.product_name,
    unitPrice: numeric(item.unit_price),
    quantity: Number(item.quantity || 0),
    lineTotal: numeric(item.line_total)
  }));

  return normalizeOrderRow(orders[0], normalizedItems);
}

export async function updateOrderStatus(env, orderId, status) {
  const params = new URLSearchParams({ select: "*" });
  params.set("id", `eq.${orderId}`);
  const rows = await supabaseRequest(env, `orders?${params.toString()}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify({ status })
  });
  return rows?.[0] || null;
}

export async function updateOrderFields(env, orderId, fields) {
  const params = new URLSearchParams({ select: "*" });
  params.set("id", `eq.${orderId}`);
  const rows = await supabaseRequest(env, `orders?${params.toString()}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify(fields)
  });
  return rows?.[0] || null;
}

export async function deleteOrder(env, orderId) {
  const itemParams = new URLSearchParams();
  itemParams.set("order_id", `eq.${orderId}`);
  await supabaseRequest(env, `order_items?${itemParams.toString()}`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });

  const orderParams = new URLSearchParams();
  orderParams.set("id", `eq.${orderId}`);
  await supabaseRequest(env, `orders?${orderParams.toString()}`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });
}

function isStripeConfigured(env) {
  return Boolean(env.STRIPE_SECRET_KEY);
}

function toStripeAmount(value) {
  return Math.round(Number(value || 0) * 100);
}

function buildFormBody(params) {
  const search = new URLSearchParams();
  params.forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.append(key, String(value));
  });
  return search.toString();
}

export async function stripeRequest(env, path, init = {}) {
  const secretKey = getRequiredEnv(env, "STRIPE_SECRET_KEY");
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${secretKey}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    ...init,
    headers
  });

  return parseResponse(response, "Errore API Stripe.");
}

export async function createStripeCheckoutSession(env, request, order) {
  if (!isStripeConfigured(env)) {
    throw new Error("Stripe non configurato.");
  }

  const origin = getSiteOrigin(request, env);
  const params = [
    ["mode", "payment"],
    ["success_url", `${origin}/?stripe=success&orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`],
    ["cancel_url", `${origin}/?stripe=cancel&orderId=${encodeURIComponent(order.id)}`],
    ["client_reference_id", order.id],
    ["customer_email", order.customer.email],
    ["locale", "it"],
    ["payment_method_types[0]", "card"],
    ["metadata[local_order_id]", order.id],
    ["metadata[order_number]", order.orderNumber],
    ["custom_text[submit][message]", "No Cap Barber Shop confermera l'ordine automaticamente dopo il pagamento."]
  ];

  order.items.forEach((item, index) => {
    params.push([`line_items[${index}][quantity]`, item.quantity]);
    params.push([`line_items[${index}][price_data][currency]`, "eur"]);
    params.push([`line_items[${index}][price_data][unit_amount]`, toStripeAmount(item.unitPrice)]);
    params.push([`line_items[${index}][price_data][product_data][name]`, item.productName]);
  });

  if (order.shipping > 0) {
    const shippingIndex = order.items.length;
    params.push([`line_items[${shippingIndex}][quantity]`, 1]);
    params.push([`line_items[${shippingIndex}][price_data][currency]`, "eur"]);
    params.push([`line_items[${shippingIndex}][price_data][unit_amount]`, toStripeAmount(order.shipping)]);
    params.push([`line_items[${shippingIndex}][price_data][product_data][name]`, "Spedizione No Cap"]);
  }

  const data = await stripeRequest(env, "/v1/checkout/sessions", {
    method: "POST",
    body: buildFormBody(params)
  });

  if (!data?.url || !data?.id) {
    throw new Error("Stripe non ha restituito una sessione valida.");
  }

  return {
    stripeSessionId: data.id,
    checkoutUrl: data.url
  };
}

export async function getStripeCheckoutSession(env, sessionId) {
  return stripeRequest(env, `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET"
  });
}

export async function verifyStripeCheckoutSession(env, sessionId, localOrderId) {
  const session = await getStripeCheckoutSession(env, sessionId);
  if (session?.client_reference_id !== localOrderId) {
    throw new Error("La sessione Stripe non corrisponde all'ordine locale.");
  }
  if (session?.payment_status !== "paid") {
    throw new Error("Pagamento Stripe non ancora confermato.");
  }
  return session;
}

async function hmacSha256Hex(secret, payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyStripeWebhookSignature(env, payload, stripeSignature) {
  const webhookSecret = getRequiredEnv(env, "STRIPE_WEBHOOK_SECRET");
  if (!stripeSignature) {
    throw new Error("Header Stripe-Signature mancante.");
  }

  const timestamps = [];
  const signatures = [];
  stripeSignature.split(",").forEach((part) => {
    const [key, value] = part.split("=");
    if (key === "t" && value) timestamps.push(value);
    if (key === "v1" && value) signatures.push(value);
  });

  const timestamp = timestamps[0];
  if (!timestamp || !signatures.length) {
    throw new Error("Header Stripe-Signature non valido.");
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
    throw new Error("Timestamp webhook Stripe fuori tolleranza.");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const computed = await hmacSha256Hex(webhookSecret, signedPayload);
  if (!signatures.includes(computed)) {
    throw new Error("Firma webhook Stripe non valida.");
  }
}

function paypalBaseUrl(env) {
  return env.PAYPAL_ENV === "live" ? PAYPAL_API_BASE.live : PAYPAL_API_BASE.sandbox;
}

export async function getPaypalAccessToken(env) {
  const clientId = getRequiredEnv(env, "PAYPAL_CLIENT_ID");
  const clientSecret = getRequiredEnv(env, "PAYPAL_CLIENT_SECRET");
  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${paypalBaseUrl(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await parseResponse(response, "Impossibile ottenere il token PayPal.");
  return data.access_token;
}

export async function paypalRequest(env, path, init = {}) {
  const accessToken = await getPaypalAccessToken(env);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${paypalBaseUrl(env)}${path}`, {
    ...init,
    headers
  });

  return parseResponse(response, "Errore API PayPal.");
}

export function getSiteOrigin(request, env) {
  return String(env.PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export async function createPaypalOrder(env, request, order) {
  const origin = getSiteOrigin(request, env);
  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: order.id,
        custom_id: order.id,
        invoice_id: order.orderNumber,
        description: `Ordine ${order.orderNumber} No Cap Barber Shop`,
        amount: {
          currency_code: "EUR",
          value: order.total.toFixed(2)
        }
      }
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "No Cap Barber Shop",
          locale: "it-IT",
          landing_page: "LOGIN",
          user_action: "PAY_NOW",
          return_url: `${origin}/?paypal=success&orderId=${encodeURIComponent(order.id)}`,
          cancel_url: `${origin}/?paypal=cancel&orderId=${encodeURIComponent(order.id)}`
        }
      }
    }
  };

  const data = await paypalRequest(env, "/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify(body)
  });

  const approvalLink = (data.links || []).find((link) => link.rel === "approve")?.href;
  if (!approvalLink) {
    throw new Error("PayPal non ha restituito il link di approvazione.");
  }

  return {
    paypalOrderId: data.id,
    approvalUrl: approvalLink
  };
}

export async function capturePaypalOrder(env, paypalOrderId) {
  return paypalRequest(env, `/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      "PayPal-Request-Id": paypalOrderId
    },
    body: JSON.stringify({})
  });
}

export function verifyCapturedPaypalOrder(captureData, localOrderId) {
  const purchaseUnit = captureData?.purchase_units?.[0];
  const completed = captureData?.status === "COMPLETED";
  const referenceId = purchaseUnit?.reference_id || purchaseUnit?.custom_id;
  if (!completed) {
    throw new Error("Pagamento PayPal non completato.");
  }
  if (referenceId !== localOrderId) {
    throw new Error("Il pagamento PayPal non corrisponde all'ordine locale.");
  }
  return {
    paypalCaptureId: purchaseUnit?.payments?.captures?.[0]?.id || null
  };
}
