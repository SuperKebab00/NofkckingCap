import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const adminPage = await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
const workspace = await readFile(new URL("../components/admin-workspace.tsx", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../components/admin-readonly-dashboard.tsx", import.meta.url), "utf8");
const summary = await readFile(new URL("../components/admin-products-summary-panel.tsx", import.meta.url), "utf8");

test("admin workspace uses URL sections and renders only the active panel", () => {
  assert.match(adminPage, /searchParams/);
  assert.match(adminPage, /readRequestedSection/);
  assert.match(adminPage, /activePanel = await renderDashboard/);
  assert.match(workspace, /href=\{`\/admin\?section=\$\{section\.id\}`\}/);
  assert.match(workspace, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.doesNotMatch(workspace, /useState/);
  assert.doesNotMatch(workspace, /hidden=\{!/);
  assert.doesNotMatch(workspace, /role="tabpanel"/);
});

test("admin and super admin sections are separated", () => {
  for (const label of ["Dati", "Prodotti", "Ordini", "Richieste", "Tagli"]) {
    assert.match(adminPage, new RegExp(`label: "${label}"`));
  }

  for (const label of ["Struttura sito", "Utenti", "Audit", "Manutenzione"]) {
    assert.match(adminPage, new RegExp(`label: "${label}"`));
  }

  assert.match(adminPage, /verification\.superAdmin\s*\?\s*\[\.\.\.adminSections, \.\.\.superAdminSections\]/);
  assert.doesNotMatch(workspace, /Super admin/);
  assert.doesNotMatch(workspace, /Gestione/);
});

test("dashboard copy avoids technical status panels", () => {
  const visibleDashboardCopy = `${dashboard}\n${summary}`;
  for (const banned of [
    "Admin API",
    "Supabase",
    "Cloudflare",
    "HttpOnly",
    "JWT",
    "RLS",
    "service role",
    "binding",
    "endpoint",
    "Version ID",
    "Deployment ID",
    "Writes:",
    "Sorgente:",
  ]) {
    assert.doesNotMatch(visibleDashboardCopy, new RegExp(banned, "i"));
  }
});
