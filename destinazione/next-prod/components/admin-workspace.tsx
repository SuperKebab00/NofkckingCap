import Link from "next/link";
import type { ReactNode } from "react";

import { AdminSessionControls } from "./admin-session-controls";

export type AdminSectionId =
  | "data"
  | "products"
  | "orders"
  | "contacts"
  | "cuts"
  | "site"
  | "users"
  | "audit"
  | "maintenance";

export type AdminSection = {
  id: AdminSectionId;
  label: string;
};

type AdminWorkspaceProps = {
  activeSection: AdminSectionId;
  children: ReactNode;
  sections: AdminSection[];
};

export function AdminWorkspace({
  activeSection,
  children,
  sections,
}: AdminWorkspaceProps) {
  return (
    <section className="admin-workspace" aria-label="Area gestione">
      <nav className="admin-sidebar" aria-label="Sezioni area gestione">
        <div className="admin-sidebar__links">
          {sections.map((section) => {
            const isActive = section.id === activeSection;
            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`admin-tab${isActive ? " is-active" : ""}`}
                href={`/admin?section=${section.id}`}
                key={section.id}
              >
                {section.label}
              </Link>
            );
          })}
        </div>
        <div className="admin-sidebar__footer">
          <AdminSessionControls />
        </div>
      </nav>

      <div className="admin-workspace__panel">{children}</div>
    </section>
  );
}
