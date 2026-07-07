import {
  getOrderWithItems,
  json,
  parseGuardedJson,
  safeError,
  safeLog,
  statusFromError,
  updateOrderFields,
  updateOrderStatus,
  verifyStripeCheckoutSession,
} from "../../_lib/checkout.js";

export async function onRequestPost(context) {
  try {
    const payload = await parseGuardedJson(context, {
      rateLimitKey: "checkout:stripe:verify",
      rateLimit: 20,
    });
    const orderId = String(payload.orderId || "").trim();
    const stripeSessionId = String(payload.stripeSessionId || "").trim();

    if (!orderId || !stripeSessionId) {
      throw new Error("CLIENT: Parametri Stripe mancanti.");
    }

    const order = await getOrderWithItems(context.env, orderId);
    const currentStatus = String(order.status || "").toLowerCase();
    if (["pagato", "paid", "completato", "completed"].includes(currentStatus)) {
      return json({ order });
    }

    if (order.paymentMode !== "stripe") {
      throw new Error("CLIENT: L'ordine non e associato a Stripe.");
    }

    const session = await verifyStripeCheckoutSession(
      context.env,
      stripeSessionId,
      orderId,
    );
    await updateOrderFields(context.env, orderId, {
      status: "pagato",
      stripe_session_id: stripeSessionId,
      stripe_payment_intent_id: session.payment_intent || null,
    }).catch(async () => {
      await updateOrderStatus(context.env, orderId, "pagato");
    });

    const updatedOrder = await getOrderWithItems(context.env, orderId);
    return json({ order: updatedOrder });
  } catch (error) {
    safeLog(context, "stripe-verify failed", {
      status: statusFromError(error),
      message: error?.message,
    });
    return json(
      {
        error: safeError(
          error,
          "Impossibile verificare il pagamento Stripe.",
          context.env.APP_ENV !== "production",
        ),
      },
      statusFromError(error),
    );
  }
}
