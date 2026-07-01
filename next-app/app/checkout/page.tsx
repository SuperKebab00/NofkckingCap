import type { Metadata } from "next";
import { Suspense } from "react";
import {
  CheckoutInShop,
  type CheckoutInShopProduct,
} from "../../components/checkout-in-shop";
import { SiteHeader } from "../../components/site-header";
import {
  buildCheckoutContactHref,
  buildShopCheckoutHref,
} from "../../lib/public-flow";
import { productTeasers } from "../../lib/static-content";
import { getPublicProducts, type PublicProduct } from "../../lib/supabase-public";

export const metadata: Metadata = {
  title: "Checkout in Shop | No Cap Barbershop",
  description:
    "Prepara il ritiro in shop con un riepilogo semplice del prodotto selezionato e dei dettagli utili.",
};

function mapPublicProductToCheckoutProduct(
  product: PublicProduct,
): CheckoutInShopProduct {
  return {
    category: product.category,
    checkoutHref: buildShopCheckoutHref(product.name),
    contactHref: buildCheckoutContactHref(product.name),
    description: product.description,
    image: product.packshotUrl || product.lifestyleUrl,
    name: product.name,
    price: product.price,
  };
}

function getFallbackCheckoutProducts(): CheckoutInShopProduct[] {
  return productTeasers.map((product) => ({
    category: product.category,
    checkoutHref: buildShopCheckoutHref(product.name),
    contactHref: buildCheckoutContactHref(product.name),
    description: null,
    image: product.image,
    name: product.name,
    price: null,
  }));
}

export default async function CheckoutPage() {
  const publicProducts = await getPublicProducts();
  const checkoutProducts = publicProducts.products.length
    ? publicProducts.products.map(mapPublicProductToCheckoutProduct)
    : getFallbackCheckoutProducts();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-hero">
          <p className="eyebrow">Checkout</p>
          <div className="hero__content">
            <span className="status-badge">Flusso attivo: in-shop</span>
            <h1>Checkout in negozio, primo slice reale in Next</h1>
            <p>
              Questa pagina non e piu solo informativa: puoi usarla per preparare
              un riepilogo pubblico dell&apos;acquisto in negozio, senza pagamenti
              online e senza invio automatico dell'ordine.
            </p>
            <div className="hero__actions">
              <a href="/shop">Scegli un prodotto</a>
              <a className="ghost-button" href={buildCheckoutContactHref()}>
                Contattaci
              </a>
            </div>
          </div>
        </section>

        <Suspense
          fallback={
            <section className="section">
              <div className="spotlight-card">
                <p className="eyebrow">Checkout in shop</p>
                <h2>Caricamento riepilogo</h2>
                <p>Prepariamo il riepilogo pubblico del flusso in negozio.</p>
              </div>
            </section>
          }
        >
          <CheckoutInShop products={checkoutProducts} />
        </Suspense>
      </main>
    </>
  );
}
