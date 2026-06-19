import {
  capturePaypalOrder,
  getOrderWithItems,
  json,
  parseGuardedJson,
  safeError,
  safeLog,
  statusFromError,
  updateOrderFields,
  updateOrderStatus,
  verifyCapturedPaypalOrder
} from "../_lib/checkout.js";

export async function onRequestPost(context) {
  try {
    const payload = await parseGuardedJson(context, {
      rateLimitKey: "checkout:capture",
      rateLimit: 20
    });
    const orderId = String(payload.orderId || "").trim();
    const paypalOrderId = String(payload.paypalOrderId || "").trim();

    if (!orderId || !paypalOrderId) {
      throw new Error("CLIENT: Parametri pagamento mancanti.");
    }

    const order = await getOrderWithItems(context.env, orderId);
    const currentStatus = String(order.status || "").toLowerCase();

    if (currentStatus === "pagato" || currentStatus === "paid" || currentStatus === "completato" || currentStatus === "completed") {
      return json({ order });
    }

    if (order.paymentMode !== "paypal") {
      throw new Error("CLIENT: L'ordine non e associato a PayPal.");
    }

    const capture = await capturePaypalOrder(context.env, paypalOrderId);
    const verified = verifyCapturedPaypalOrder(capture, orderId);

    await updateOrderFields(context.env, orderId, {
      status: "pagato",
      paypal_order_id: paypalOrderId,
      paypal_capture_id: verified.paypalCaptureId
    }).catch(async () => {
      await updateOrderStatus(context.env, orderId, "pagato");
    });

    const updatedOrder = await getOrderWithItems(context.env, orderId);
    return json({ order: updatedOrder });
  } catch (error) {
    safeLog(context, "paypal-capture failed", { status: statusFromError(error), message: error?.message });
    return json({ error: safeError(error, "Impossibile confermare il pagamento.", context.env.APP_ENV !== "production") }, statusFromError(error));
  }
}
