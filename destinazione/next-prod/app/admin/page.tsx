import type { Metadata } from "next";
import Link from "next/link";
import { AdminAuthStatusPanel } from "../../components/admin-auth-status-panel";
import { AdminFutureActions } from "../../components/admin-future-actions";
import { AdminLoginPanel } from "../../components/admin-login-panel";
import { AdminMigrationPanel } from "../../components/admin-migration-panel";
import { AdminLeadsPanel } from "../../components/admin-leads-panel";
import { AdminOrdersPanel } from "../../components/admin-orders-panel";
import { AdminProductsCrudPanel } from "../../components/admin-products-crud-panel";
import { AdminProductsSummaryPanel } from "../../components/admin-products-summary-panel";
import { AdminReadonlyDashboard } from "../../components/admin-readonly-dashboard";
import { AdminShopStructurePanel } from "../../components/admin-shop-structure-panel";
import { SiteHeader } from "../../components/site-header";
import { getAdminAuthCheck } from "../../lib/admin-auth-check";
import { getAdminProductsSummary } from "../../lib/admin-products-summary";
import { getAdminStatus } from "../../lib/admin-status";
import {
  getPublicProducts,
  getPublicShopCategories,
} from "../../lib/supabase-public";

export const metadata: Metadata = {
  title: "Admin Overview | No Cap Barbershop",
  description:
    "Area gestione Next in sola lettura, collegata in modo sicuro allo stato admin backend quando configurato.",
};

export default async function AdminPage() {
  const [
    productsResult,
    categoriesResult,
    adminStatus,
    adminProductsSummary,
    adminAuthCheck,
  ] = await Promise.all([
      getPublicProducts(),
      getPublicShopCategories(),
      getAdminStatus(),
      getAdminProductsSummary(),
      getAdminAuthCheck(),
    ]);

  const productsCount =
    adminStatus.productsCount ?? productsResult.products.length ?? 0;
  const categoriesCount = adminStatus.categoriesCount ?? categoriesResult.length ?? 0;
  const usesLiveReadOnlyData =
    adminStatus.source === "endpoint" ||
    productsResult.products.length > 0 ||
    categoriesResult.length > 0;

  return (
    <>
      <SiteHeader />
      <main className="page-shell route-shell route-shell--admin">
        <section className="admin-hero">
          <span className="eyebrow">Area admin</span>
          <h1>Panoramica gestione</h1>
          <p>
            L&apos;area admin resta protetta e limitata alla consultazione. Quando la
            configurazione server-side e pronta, questa pagina legge in modo
            sicuro lo stato dell&apos;endpoint Cloudflare protetto senza esporre
            token al browser.
          </p>
          <div className="admin-hero__actions">
            <Link className="ghost-button" href="/shop">
              Vai allo shop pubblico
            </Link>
            <Link className="ghost-button" href="/contact">
              Contatti
            </Link>
          </div>
        </section>

        <div className="admin-hub">
          <AdminReadonlyDashboard
            adminApiMessage={adminStatus.message}
            adminApiState={adminStatus.apiState}
            adminCategoriesCount={adminStatus.categoriesCount}
            adminMode={adminStatus.mode}
            adminProductsCount={adminStatus.productsCount}
            adminSource={adminStatus.source}
            adminWrites={adminStatus.writes}
            categoriesCount={categoriesCount}
            productsCount={productsCount}
            showStock={productsResult.showStock}
            usesLiveReadOnlyData={usesLiveReadOnlyData}
          />

          <AdminAuthStatusPanel authCheck={adminAuthCheck} />
          <AdminLoginPanel />
          <AdminProductsCrudPanel />
          <AdminShopStructurePanel />
          <AdminOrdersPanel />
          <AdminLeadsPanel />
          <AdminProductsSummaryPanel summary={adminProductsSummary} />
          <AdminMigrationPanel />
          <AdminFutureActions />
        </div>
      </main>
    </>
  );
}
