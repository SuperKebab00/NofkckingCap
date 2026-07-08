import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { loadTsModule } from "./load-ts-module.mjs";

const mod = await loadTsModule("lib/admin-leads-client.ts");
const leadId = "lead-real-1";

{
  const requests = [];
  const leads = await mod.listAdminLeads(
    "admin-token",
    { page: 2, pageSize: 10, search: "Mario", status: "new" },
    {
      fetchImpl: async (input, init) => {
        requests.push({ input: String(input), init });
        return new Response(JSON.stringify({ leads: [{ email: "mario@example.com", id: leadId }] }), { status: 200 });
      },
    },
  );
  assert.equal(leads.length, 1);
  assert.equal(requests[0].input, "/api/admin/leads?page=2&pageSize=10&status=new&search=Mario");
  assert.equal(new Headers(requests[0].init.headers).get("Authorization"), "Bearer admin-token");
}

{
  const requests = [];
  const lead = await mod.getAdminLead("admin-token", leadId, {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(JSON.stringify({ lead: { id: leadId, subject: "Info" } }), { status: 200 });
    },
  });
  assert.equal(lead.subject, "Info");
  assert.equal(requests[0].input, `/api/admin/leads/${leadId}`);
}

{
  const requests = [];
  const lead = await mod.updateAdminLeadStatus("admin-token", leadId, { status: "contacted" }, {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(JSON.stringify({ lead: { id: leadId, status: "contacted" } }), { status: 200 });
    },
  });
  assert.equal(lead.status, "contacted");
  assert.equal(requests[0].init.method, "PATCH");
  assert.equal(JSON.parse(String(requests[0].init.body)).status, "contacted");
}

{
  const requests = [];
  await mod.archiveAdminLead("admin-token", leadId, {
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(JSON.stringify({ lead: { id: leadId, status: "closed" } }), { status: 200 });
    },
  });
  assert.equal(requests[0].input, `/api/admin/leads/${leadId}`);
  assert.equal(requests[0].init.method, "DELETE");
}

for (const status of [400, 401, 403, 404, 500]) {
  await assert.rejects(
    () => mod.listAdminLeads("admin-token", {}, {
      fetchImpl: async () => new Response(JSON.stringify({ error: `Errore ${status}` }), { status }),
    }),
    (error) => {
      assert.equal(error.status, status);
      assert.equal(error.message, `Errore ${status}`);
      return true;
    },
  );
}

await assert.rejects(
  () => mod.listAdminLeads(""),
  (error) => {
    assert.equal(error.status, 401);
    assert.match(error.message, /Sessione admin mancante/);
    return true;
  },
);

{
  const helperSource = readFileSync("lib/admin-leads-client.ts", "utf8");
  const panelSource = readFileSync("components/admin-leads-panel.tsx", "utf8");
  const combined = `${helperSource}\n${panelSource}`;
  assert.ok(!combined.includes("@supabase/"));
  assert.ok(!combined.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!combined.includes("ADMIN_API_TOKEN"));
  assert.ok(!combined.includes("lib/server/"));
}

console.log("Admin leads client tests passed.");
