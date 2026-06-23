export function buildCheckoutOrderPayload({
  formData,
  cartRows,
  resolvePaymentMode,
}) {
  const fulfillment = formData.get("fulfillment");
  const requestedPaymentMode = String(formData.get("paymentMode") || "in-shop");
  const paymentMode = resolvePaymentMode(requestedPaymentMode);
  const items = cartRows.map((row) => ({
    productId: row.product.id,
    quantity: row.quantity,
  }));

  return {
    customer: {
      fullName: String(formData.get("fullName")).trim(),
      email: String(formData.get("email")).trim(),
      phone: String(formData.get("phone")).trim(),
    },
    fulfillment,
    shippingAddress:
      fulfillment === "shipping"
        ? {
            address: String(formData.get("address")).trim(),
            city: String(formData.get("city")).trim(),
            zip: String(formData.get("zip")).trim(),
          }
        : null,
    items,
    paymentMode,
  };
}
