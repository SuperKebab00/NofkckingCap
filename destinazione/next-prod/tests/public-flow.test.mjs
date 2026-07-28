import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const sourceFile = resolve("lib/public-flow.ts");
const tmpDir = resolve("tests/.tmp-public-flow");
const compiledFile = resolve(tmpDir, "public-flow.mjs");

try {
  mkdirSync(tmpDir, { recursive: true });

  const source = readFileSync(sourceFile, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourceFile,
  }).outputText;

  writeFileSync(compiledFile, compiled, "utf8");

  const mod = await import(`${pathToFileURL(compiledFile).href}?t=${Date.now()}`);

  assert.equal(mod.SHOP_FLOW_COPY.checkoutCta, "Prepara ritiro in shop");
  assert.equal(mod.SHOP_FLOW_COPY.contactCta, "Chiedi disponibilità");
  assert.equal(
    mod.buildShopCheckoutHref("Black wax"),
    "/checkout?product=Black%20wax",
  );
  assert.equal(
    mod.buildShopContactHref("Black wax"),
    "/contact?product=Black+wax&subject=Disponibilit%C3%A0+Black+wax",
  );

  const products = [
    { name: "Black wax", price: 18.5 },
    { name: "Clay Pomade", price: null },
  ];

  assert.deepEqual(mod.findCheckoutProduct(products, "black wax"), products[0]);
  assert.equal(mod.findCheckoutProduct(products, ""), null);
  assert.equal(mod.findCheckoutProduct(products, "missing"), null);
  assert.equal(mod.formatCheckoutPrice(18.5), "18,50 €");
  assert.equal(mod.formatCheckoutPrice("EUR 20,00"), "EUR 20,00");
  assert.equal(mod.formatCheckoutPrice(null), null);
  assert.equal(
    mod.CHECKOUT_FLOW_COPY.emptyStateTitle,
    "Nessun prodotto selezionato",
  );
  assert.ok(
    !/Stripe|PayPal|ordine confermato/i.test(
      mod.CHECKOUT_FLOW_COPY.noAutomaticOrderNote,
    ),
  );
  assert.equal(mod.CONTACT_FLOW_COPY.contextualBoxLabel, "Richiesta per");
  assert.ok(
    /disponibilità|ritiro|richiesta generica/i.test(
      mod.CONTACT_FLOW_COPY.contextualBoxBody,
    ),
  );
  assert.ok(
    /non crea ordini automatici|non conferma pagamenti online/i.test(
      mod.CONTACT_FLOW_COPY.noAutomaticOrderNote,
    ),
  );
  assert.equal(mod.getContactFormMode(undefined), "live");
  assert.equal(mod.getContactFormMode("preview"), "preview");
  assert.equal(mod.getContactFormMode("disabled"), "disabled");
  assert.equal(mod.getContactFormMode("weird"), "live");
  assert.equal(mod.isContactFormSubmissionEnabled("live"), true);
  assert.equal(mod.isContactFormSubmissionEnabled("preview"), false);
  assert.equal(mod.isContactFormSubmissionEnabled("disabled"), false);
  assert.equal(
    mod.getContactFormModeMessage("preview"),
    "Il modulo di contatto non è disponibile in questo momento.",
  );
  assert.equal(
    mod.getContactFormModeMessage("disabled"),
    "Non è possibile inviare il messaggio in questo momento. Contattaci telefonicamente o tramite WhatsApp.",
  );
  assert.equal(mod.getContactFormModeMessage("live"), "");

  assert.deepEqual(mod.buildContactInitialValues(), {
    message: "",
    subject: "",
  });
  assert.deepEqual(
    mod.buildContactInitialValues({
      product: "Black wax",
    }),
    {
      message:
        "Ciao, vorrei ricevere disponibilità per Black wax e capire come procedere con l'acquisto o il ritiro in negozio.",
      subject: "Richiesta Black wax in shop",
    },
  );
  assert.deepEqual(
    mod.buildContactInitialValues({
      message: "Messaggio custom",
      product: "Black wax",
      subject: "Oggetto custom",
    }),
    {
      message: "Messaggio custom",
      subject: "Oggetto custom",
    },
  );
  assert.equal(mod.CONTACT_FORM_ENDPOINT, "/api/contact/create");

  console.log("Public flow tests passed.");
} finally {
  rmSync(tmpDir, { force: true, recursive: true });
}
