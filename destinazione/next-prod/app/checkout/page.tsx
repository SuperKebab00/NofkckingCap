import type { Metadata } from "next";
import { Suspense } from "react";
import {
  CheckoutInShop,
  type CheckoutInShopProduct,
} from "../../components/checkout-in-shop";
import { SiteHeader } from "../../components/site-header";
import { productTeasers } from "../../lib/static-content";

export const metadata: Metadata = {
  title: "Checkout in Shop | No Cap Barbershop",
  description:
    "Checkout in shop per confermare prodotto, dati cliente e preferenza di ritiro senza pagamenti online attivi.",
};

function getFallbackCheckoutProducts(): CheckoutInShopProduct[] {
  return productTeasers.map((product) => ({
    category: product.category,
    description: null,
    id: product.checkoutHref.split("product=")[1] || undefined,
    image: product.image,
    name: product.name,
    price: product.price ?? null,
  }));
}

export default function CheckoutPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell route-shell route-shell--checkout">
        <section className="page-banner page-banner--checkout">
          <p className="eyebrow">Checkout</p>
          <h1>Conferma ordine</h1>
          <p>Inserisci i dati, scegli ritiro o consegna e conferma l&apos;ordine.</p>
        </section>

        <Suspense
          fallback={
            <section className="checkout-layout">
              <div className="checkout-form">
                <p className="eyebrow">Checkout</p>
                <h2>Caricamento riepilogo</h2>
                <p>Prepariamo il riepilogo locale del carrello.</p>
              </div>
            </section>
          }
        >
          <CheckoutInShop products={getFallbackCheckoutProducts()} />
        </Suspense>
      </main>
    </>
  );
}
