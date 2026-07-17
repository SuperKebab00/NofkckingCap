import "server-only";

import { getServerEnv, supabaseRequest } from "./server/api-core";

export type PublicCut = {
  dateLabel: string;
  description: string;
  expiresAt: string | null;
  id: string;
  imageUrl: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  title: string;
};

const CUT_SELECT =
  "id,title,description,image_path,image_url,is_featured,is_published,published_at,expires_at,date,created_at";

function storagePublicUrl(imagePath: unknown) {
  const path = String(imagePath || "").replace(/^\/+/, "");
  const env = getServerEnv();
  const base = String(env.SUPABASE_URL || "").replace(/\/+$/, "");

  if (!path || path.includes("..") || !base) return null;
  return `${base}/storage/v1/object/public/cuts/${encodeURI(path)}`;
}

function mapCut(row: Record<string, unknown>): PublicCut {
  const publishedAt = String(row.published_at || row.date || row.created_at || "");
  const date = publishedAt ? new Date(publishedAt) : null;

  return {
    dateLabel:
      date && Number.isFinite(date.getTime())
        ? date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })
        : "",
    description: String(row.description || ""),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    id: String(row.id || ""),
    imageUrl: storagePublicUrl(row.image_path) || String(row.image_url || "") || null,
    isFeatured: row.is_featured === true,
    publishedAt: row.published_at ? String(row.published_at) : null,
    title: String(row.title || ""),
  };
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> =>
        Boolean(row && typeof row === "object"),
      )
    : [];
}

export async function getPublishedCuts() {
  const env = getServerEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  const now = new Date().toISOString();
  const data = await supabaseRequest(
    env,
    `cuts?select=${CUT_SELECT}&is_published=eq.true&or=(expires_at.is.null,expires_at.gt.${encodeURIComponent(now)})&order=is_featured.desc,published_at.desc,created_at.desc`,
    { method: "GET" },
  );

  return rows(data).map(mapCut).filter((cut) => cut.id && cut.title);
}

export async function getFeaturedCut() {
  const cuts = await getPublishedCuts();
  return cuts.find((cut) => cut.isFeatured) || cuts[0] || null;
}
