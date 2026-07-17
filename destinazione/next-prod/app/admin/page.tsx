import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { AdminLeadsPanel } from "../../components/admin-leads-panel";
import { AdminCutsPanel } from "../../components/admin-cuts-panel";
import { AdminLoginPanel } from "../../components/admin-login-panel";
import { AdminOrdersPanel } from "../../components/admin-orders-panel";
import { AdminProductsCrudPanel } from "../../components/admin-products-crud-panel";
import { AdminProductsSummaryPanel } from "../../components/admin-products-summary-panel";
import { AdminReadonlyDashboard } from "../../components/admin-readonly-dashboard";
import { AdminSessionControls } from "../../components/admin-session-controls";
import { AdminShopStructurePanel } from "../../components/admin-shop-structure-panel";
import { AdminSuperPanel } from "../../components/admin-super-panel";
import { AdminWorkspace, type AdminSection, type AdminSectionId } from "../../components/admin-workspace";
import { SiteHeader } from "../../components/site-header";
import { getAdminProductsSummary } from "../../lib/admin-products-summary";
import { getAdminStatus } from "../../lib/admin-status";
import { ADMIN_SESSION_ACCESS_COOKIE, verifyAdminAccessToken } from "../../lib/server/admin-auth";
import { getServerEnv } from "../../lib/server/api-core";
import { getPublicProducts, getPublicShopCategories } from "../../lib/supabase-public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Area Gestore | No Cap Barbershop",
  description: "Area gestione protetta per catalogo, ordini, richieste e struttura shop.",
};

const adminSections: AdminSection[] = [
  { id: "data", label: "Dati" },
  { id: "products", label: "Prodotti" },
  { id: "orders", label: "Ordini" },
  { id: "contacts", label: "Richieste" },
  { id: "cuts", label: "Tagli" },
];

const superAdminSections: AdminSection[] = [
  { id: "site", label: "Struttura sito" },
  { id: "users", label: "Utenti" },
  { id: "audit", label: "Audit" },
  { id: "maintenance", label: "Manutenzione" },
];

const sectionTitles: Record<AdminSectionId, { title: string; description: string }> = {
  audit: {
    description: "Registro essenziale delle attivita amministrative.",
    title: "Audit",
  },
  contacts: {
    description: "Messaggi arrivati dal form contatti.",
    title: "Richieste",
  },
  cuts: {
    description: "Taglio fresco e showcase pubblicati.",
    title: "Tagli",
  },
  data: {
    description: "Riepilogo operativo del negozio.",
    title: "Dati",
  },
  maintenance: {
    description: "Controlli utili sui tagli scaduti e sui file non collegati.",
    title: "Manutenzione",
  },
  orders: {
    description: "Ordini con ritiro in negozio e pagamento in sede.",
    title: "Ordini",
  },
  products: {
    description: "Catalogo, prezzi, disponibilita e immagini.",
    title: "Prodotti",
  },
  site: {
    description: "Categorie e sezioni pubblicate nello shop.",
    title: "Struttura sito",
  },
  users: {
    description: "Ruoli e accessi dell'area gestione.",
    title: "Utenti",
  },
};

function readRequestedSection(value: string | string[] | undefined): AdminSectionId {
  const section = Array.isArray(value) ? value[0] : value;
  if (
    section === "data" ||
    section === "products" ||
    section === "orders" ||
    section === "contacts" ||
    section === "cuts" ||
    section === "site" ||
    section === "users" ||
    section === "audit" ||
    section === "maintenance"
  ) {
    return section;
  }

  return "data";
}

async function renderDashboard() {
  const [productsResult, categoriesResult, adminStatus, adminProductsSummary] = await Promise.all([
    getPublicProducts(),
    getPublicShopCategories(),
    getAdminStatus(),
    getAdminProductsSummary(),
  ]);
  const productsCount = adminStatus.productsCount ?? productsResult.products.length ?? 0;
  const categoriesCount = adminStatus.categoriesCount ?? categoriesResult.length ?? 0;
  const usesLiveReadOnlyData = adminStatus.source === "endpoint" || productsResult.products.length > 0 || categoriesResult.length > 0;

  return (
    <>
      <AdminReadonlyDashboard
        categoriesCount={categoriesCount}
        productsCount={productsCount}
        showStock={productsResult.showStock}
        usesLiveReadOnlyData={usesLiveReadOnlyData}
      />
      <AdminProductsSummaryPanel summary={adminProductsSummary} />
    </>
  );
}

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const accessToken = (await cookies()).get(ADMIN_SESSION_ACCESS_COOKIE)?.value || "";
  const verification = await verifyAdminAccessToken(accessToken, getServerEnv());

  if (!verification.ok) {
    return (
      <main className="page-shell route-shell route-shell--admin">
        <AdminLoginPanel />
      </main>
    );
  }

  const params = await searchParams;
  const requestedSection = readRequestedSection(params?.section);
  const availableSections = verification.superAdmin
    ? [...adminSections, ...superAdminSections]
    : adminSections;
  const activeSection = availableSections.some((section) => section.id === requestedSection)
    ? requestedSection
    : "data";
  const activeCopy = sectionTitles[activeSection];

  let activePanel;
  if (activeSection === "data") {
    activePanel = await renderDashboard();
  } else if (activeSection === "products") {
    activePanel = <AdminProductsCrudPanel canPermanentDelete={verification.superAdmin} />;
  } else if (activeSection === "orders") {
    activePanel = <AdminOrdersPanel />;
  } else if (activeSection === "contacts") {
    activePanel = <AdminLeadsPanel />;
  } else if (activeSection === "cuts") {
    activePanel = <AdminCutsPanel />;
  } else if (activeSection === "site") {
    activePanel = <AdminShopStructurePanel />;
  } else if (activeSection === "users") {
    activePanel = <AdminSuperPanel view="users" />;
  } else if (activeSection === "audit") {
    activePanel = <AdminSuperPanel view="audit" />;
  } else {
    activePanel = <AdminSuperPanel view="maintenance" />;
  }

  return (
    <>
      <SiteHeader />
      <main className="page-shell route-shell route-shell--admin">
        <section className="admin-hero">
          <span className="eyebrow">Area gestore</span>
          <h1>{activeCopy.title}</h1>
          <p>{activeCopy.description}</p>
          <div className="admin-hero__actions">
            <Link className="ghost-button" href="/shop">Vai allo shop pubblico</Link>
            <Link className="ghost-button" href="/contact">Contatti</Link>
            <AdminSessionControls />
          </div>
        </section>
        <div className="admin-hub">
          <AdminWorkspace
            activeSection={activeSection}
            sections={availableSections}
          >
            {activePanel}
          </AdminWorkspace>
        </div>
      </main>
    </>
  );
}
