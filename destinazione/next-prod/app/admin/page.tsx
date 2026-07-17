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
import { AdminWorkspace } from "../../components/admin-workspace";
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

export default async function AdminPage() {
  const accessToken = (await cookies()).get(ADMIN_SESSION_ACCESS_COOKIE)?.value || "";
  const verification = await verifyAdminAccessToken(accessToken, getServerEnv());

  if (!verification.ok) {
    return (
      <main className="page-shell route-shell route-shell--admin">
        <AdminLoginPanel />
      </main>
    );
  }

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
      <SiteHeader />
      <main className="page-shell route-shell route-shell--admin">
        <section className="admin-hero">
          <span className="eyebrow">Area gestore</span>
          <h1>Gestione prodotti</h1>
          <p>Dashboard operativa per catalogo, contenuti shop, ordini e richieste.</p>
          <div className="admin-hero__actions">
            <Link className="ghost-button" href="/shop">Vai allo shop pubblico</Link>
            <Link className="ghost-button" href="/contact">Contatti</Link>
            <AdminSessionControls />
          </div>
        </section>
        <div className="admin-hub">
          <AdminWorkspace
            data={<><AdminReadonlyDashboard adminApiMessage={adminStatus.message} adminApiState={adminStatus.apiState} adminCategoriesCount={adminStatus.categoriesCount} adminMode={adminStatus.mode} adminProductsCount={adminStatus.productsCount} adminSource={adminStatus.source} adminWrites={adminStatus.writes} categoriesCount={categoriesCount} productsCount={productsCount} showStock={productsResult.showStock} usesLiveReadOnlyData={usesLiveReadOnlyData} /><AdminProductsSummaryPanel summary={adminProductsSummary} /></>}
            leads={<AdminLeadsPanel />}
            cuts={<AdminCutsPanel />}
            manage={<AdminProductsCrudPanel canPermanentDelete={verification.superAdmin} />}
            orders={<AdminOrdersPanel />}
            structure={<AdminShopStructurePanel />}
            superAdmin={<AdminSuperPanel />}
            superAdminEnabled={verification.superAdmin}
          />
        </div>
      </main>
    </>
  );
}
