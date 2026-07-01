import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const sourceFile = resolve("lib/contact-form.ts");
const tmpDir = resolve("tests/.tmp-contact");
const compiledFile = resolve(tmpDir, "contact-form.mjs");

try {
  mkdirSync(dirname(compiledFile), { recursive: true });

  const source = readFileSync(sourceFile, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  writeFileSync(compiledFile, compiled);

  const mod = await import(`${pathToFileURL(compiledFile).href}?t=${Date.now()}`);

  assert.deepEqual(
    mod.validateContactFormData({
      email: "customer@example.com",
      message: "Messaggio valido di almeno dieci caratteri.",
      phone: "+39 320 883 9692",
      privacy: true,
      subject: "Informazioni prodotti",
      website: "",
    }),
    {},
  );

  assert.equal(mod.isValidEmail("not-an-email"), false);
  assert.equal(mod.isValidPhone("1111111111"), false);

  assert.deepEqual(
    mod.validateContactFormData({
      email: "bad-email",
      message: "short",
      phone: "123",
      privacy: false,
      subject: "",
      website: "bot-value",
    }),
    {
      email: "Inserisci una email valida.",
      message: "Scrivi almeno 10 caratteri.",
      phone: "Inserisci il numero con formato +39 320 000 0000.",
      privacy: "Accetta la Privacy Policy per inviare la richiesta.",
      subject: "Inserisci l'oggetto.",
    },
  );

  assert.deepEqual(
    mod.buildContactPayload({
      email: "  CUSTOMER@Example.com ",
      message: "  Ciao dal form Next.  ",
      phone: " +39 320 883 9692 ",
      privacy: true,
      subject: "  Info prodotti  ",
      website: " hidden-bot ",
    }),
    {
      email: "customer@example.com",
      message: "Ciao dal form Next.",
      phone: "+393208839692",
      privacy_accepted: true,
      subject: "Info prodotti",
      website: "hidden-bot",
    },
  );

  console.log("Contact form tests passed.");
} finally {
  rmSync(tmpDir, { force: true, recursive: true });
}
