export type AdminCut = {
  created_at?: string;
  description?: string | null;
  expires_at?: string | null;
  id: string;
  image_path?: string | null;
  image_url?: string | null;
  is_featured?: boolean;
  is_published?: boolean;
  published_at?: string | null;
  title: string;
  updated_at?: string;
};

export type AdminCutPayload = {
  description?: string;
  image_path?: string | null;
  image_url?: string | null;
  is_featured?: boolean;
  is_published?: boolean;
  title?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;
  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error || "Richiesta tagli non riuscita.");
  }
  return payload as T;
}

export async function listAdminCuts(): Promise<AdminCut[]> {
  const payload = await fetch("/api/admin/cuts").then((response) =>
    readJson<{ cuts?: AdminCut[] }>(response),
  );
  return Array.isArray(payload.cuts) ? payload.cuts : [];
}

export async function createAdminCut(payload: AdminCutPayload): Promise<AdminCut> {
  const response = await fetch("/api/admin/cuts", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).then((item) => readJson<{ cut: AdminCut }>(item));
  return response.cut;
}

export async function updateAdminCut(id: string, payload: AdminCutPayload): Promise<AdminCut> {
  const response = await fetch(`/api/admin/cuts/${encodeURIComponent(id)}`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  }).then((item) => readJson<{ cut: AdminCut }>(item));
  return response.cut;
}

export async function archiveAdminCut(id: string): Promise<AdminCut> {
  const response = await fetch(`/api/admin/cuts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).then((item) => readJson<{ cut: AdminCut }>(item));
  return response.cut;
}

export async function uploadAdminCutImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/api/admin/cuts/upload", {
    body: formData,
    method: "POST",
  }).then((item) => readJson<{ upload?: { image_path?: string } }>(item));
  const imagePath = response.upload?.image_path;
  if (!imagePath) throw new Error("Upload immagine non riuscito.");
  return imagePath;
}
