import {
  getOrderWithItems,
  json,
  safeError,
  safeLog,
  statusFromError,
  supabaseRequest,
  updateOrderFields,
  updateOrderStatus,
  verifyStripeWebhookSignature,
} from "../_lib/checkout.js";

export async function onRequestPost(context) {
  try {
    const contentLength = Number(
      context.request.headers.get("content-length") || 0,
    );
    if (contentLength > 64 * 1024) {
      throw new Error("CLIENT: Payload troppo grande.");
    }
    const payload = await context.request.text();
    await verifyStripeWebhookSignature(
      context.env,
      payload,
      context.request.headers.get("Stripe-Signature"),
    );

    const event = JSON.parse(payload);
    if (event?.id) {
      const inserted = await recordStripeEvent(context.env, event.id);
      if (!inserted) return json({ received: true, duplicate: true });
    }

    if (event?.type !== "checkout.session.completed") {
      return json({ received: true });
    }

    const session = event.data?.object;
    const orderId = String(
      session?.client_reference_id || session?.metadata?.local_order_id || "",
    ).trim();
    if (!orderId) {
      throw new Error("Order id mancante nel webhook Stripe.");
    }

    if (session?.payment_status !== "paid") {
      return json({ received: true, skipped: true });
    }

    await updateOrderFields(context.env, orderId, {
      status: "pagato",
      stripe_session_id: session.id || null,
      stripe_payment_intent_id: session.payment_intent || null,
    }).catch(async () => {
      await updateOrderStatus(context.env, orderId, "pagato");
    });
    const order = await getOrderWithItems(context.env, orderId);
    return json({ received: true, order });
  } catch (error) {
    safeLog(context, "stripe-webhook failed", {
      status: statusFromError(error),
      message: error?.message,
    });
    return json(
      {
        error: safeError(
          error,
          "Webhook Stripe non valido.",
          context.env.APP_ENV !== "production",
        ),
      },
      statusFromError(error),
    );
  }
}

async function recordStripeEvent(env, eventId) {
  try {
    await supabaseRequest(env, "payment_events", {
      method: "POST",
      headers: {
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        provider: "stripe",
        event_id: eventId,
        processed_at: new Date().toISOString(),
      }),
    });
    return true;
  } catch (error) {
    if (
      String(error?.message || "")
        .toLowerCase()
        .includes("duplicate")
    )
      return false;
    throw error;
  }
}
