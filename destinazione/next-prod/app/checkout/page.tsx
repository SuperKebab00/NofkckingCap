import type { Metadata } from "next";
import { Suspense } from "react";
import {
  CheckoutInShop,
  type CheckoutInShopProduct,
} from "../../components/checkout-in-shop";
import { SiteHeader } from "../../components/site-header";
import { getPublicProducts, type PublicProduct } from "../../lib/supabase-public";
import { productTeasers, type ProductTeaser } from "../../lib/static-content";

export const metadata: Metadata = {
  title: "Checkout in Shop | No Cap Barbershop",
  description:
    "Checkout in shop per confermare prodotto, dati cliente e preferenza di ritiro senza pagamenti online attivi.",
};

function mapCheckoutProduct(product: PublicProduct): CheckoutInShopProduct {
  return {
    category: product.category,
    description: product.description,
    id: product.id,
    image: product.packshotUrl || product.lifestyleUrl,
    name: product.name,
    price: product.price,
    stock: product.stock,
  };
}

function mapFallbackProduct(product: ProductTeaser): CheckoutInShopProduct {
  const requestedProduct = new URL(product.checkoutHref, "https://nocap.local").searchParams.get("product");

  return {
    category: product.category,
    description: product.description,
    id: requestedProduct || product.name,
    image: product.packshotUrl || product.lifestyleUrl,
    name: product.name,
    price: product.price ?? null,
    stock: product.stock,
  };
}

export default async function CheckoutPage() {
  const publicProducts = (await getPublicProducts()).products.map(mapCheckoutProduct);
  const fallbackProducts = process.env.APP_ENV === "production"
    ? []
    : productTeasers
        .map(mapFallbackProduct)
        .filter(
          (product) =>
            !publicProducts.some((publicProduct) => publicProduct.id === product.id),
        );
  const products = [...publicProducts, ...fallbackProducts];

  return (
    <>
      <SiteHeader />
      <main className="page-shell route-shell route-shell--checkout">
        <section className="page-banner page-banner--checkout">
          <p className="eyebrow">Checkout</p>
          <h1>Conferma ordine</h1>
          <p>Inserisci i dati e conferma l&apos;ordine per il ritiro in negozio.</p>
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
          <CheckoutInShop products={products} />
        </Suspense>
      </main>
    </>
  );
}
