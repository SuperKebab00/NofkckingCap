import {
  buildCanonicalOrder,
  createPaypalOrder,
  createStripeCheckoutSession,
  deleteOrder,
  insertOrder,
  json,
  parseGuardedJson,
  safeError,
  safeLog,
  statusFromError
} from "../_lib/checkout.js";

export async function onRequestPost(context) {
  try {
    const payload = await parseGuardedJson(context, {
      rateLimitKey: "checkout:create",
      rateLimit: 12,
      turnstile: true
    });
    const order = await buildCanonicalOrder(context.env, payload.order);
    const createdOrder = await insertOrder(context.env, order);

    if (createdOrder.paymentMode === "paypal") {
      try {
        const paypal = await createPaypalOrder(context.env, context.request, createdOrder);
        return json({
          mode: "paypal",
          order: createdOrder,
          paypalOrderId: paypal.paypalOrderId,
          approvalUrl: paypal.approvalUrl
        });
      } catch (error) {
        await deleteOrder(context.env, createdOrder.id);
        throw error;
      }
    }

    if (createdOrder.paymentMode === "stripe") {
      try {
        const stripe = await createStripeCheckoutSession(context.env, context.request, createdOrder);
        return json({
          mode: "stripe",
          order: createdOrder,
          stripeSessionId: stripe.stripeSessionId,
          checkoutUrl: stripe.checkoutUrl
        });
      } catch (error) {
        await deleteOrder(context.env, createdOrder.id);
        throw error;
      }
    }

    return json({
      mode: "in-shop",
      order: createdOrder
    });
  } catch (error) {
    safeLog(context, "checkout-create failed", { status: statusFromError(error), message: error?.message });
    return json({ error: safeError(error, "Impossibile creare l'ordine.", context.env.APP_ENV !== "production") }, statusFromError(error));
  }
}
