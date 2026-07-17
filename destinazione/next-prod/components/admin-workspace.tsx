"use client";

import { useId, useState, type ReactNode } from "react";

type AdminView = "data" | "manage" | "orders" | "leads" | "structure" | "super";

type AdminWorkspaceProps = {
  data: ReactNode;
  leads: ReactNode;
  manage: ReactNode;
  orders: ReactNode;
  structure?: ReactNode;
  superAdmin?: ReactNode;
  superAdminEnabled?: boolean;
};

const tabs: Array<{ id: AdminView; label: string }> = [
  { id: "data", label: "Dati" },
  { id: "manage", label: "Gestione" },
  { id: "orders", label: "Ordini" },
  { id: "leads", label: "Richieste" },
  { id: "structure", label: "Struttura" },
  { id: "super", label: "Super admin" },
];

export function AdminWorkspace({
  data,
  leads,
  manage,
  orders,
  structure,
  superAdmin,
  superAdminEnabled = false,
}: AdminWorkspaceProps) {
  const [activeView, setActiveView] = useState<AdminView>("data");
  const tabId = useId();
  const availableTabs = tabs.filter((tab) =>
    tab.id === "structure" || tab.id === "super" ? superAdminEnabled : true,
  );

  const panels: Record<AdminView, ReactNode> = {
    data,
    manage,
    orders,
    leads,
    structure,
    super: superAdmin,
  };

  return (
    <section className="admin-workspace" aria-label="Workspace amministrativo">
      <div className="admin-tabs" role="tablist" aria-label="Sezioni admin">
        {availableTabs.map((tab) => {
          const isActive = tab.id === activeView;
          return (
            <button
              aria-controls={`${tabId}-${tab.id}`}
              aria-selected={isActive}
              className={`admin-tab${isActive ? " is-active" : ""}`}
              id={`${tabId}-${tab.id}-tab`}
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {availableTabs.map((tab) => {
        const isActive = tab.id === activeView;
        return (
          <div
            aria-labelledby={`${tabId}-${tab.id}-tab`}
            className={`admin-workspace__panel${isActive ? " is-active" : ""}`}
            hidden={!isActive}
            id={`${tabId}-${tab.id}`}
            key={tab.id}
            role="tabpanel"
          >
            {panels[tab.id]}
          </div>
        );
      })}
    </section>
  );
}
