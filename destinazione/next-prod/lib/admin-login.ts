export type AdminClientAuthState = "idle" | "submitting" | "error";

export type AdminClientAuthResult = {
  message: string;
  state: AdminClientAuthState;
};

type FetchOptions = { fetchImpl?: typeof fetch };

async function readResponse(response: Response) {
  return (await response.json().catch(() => null)) as
    | { admin?: boolean; error?: string }
    | null;
}

export async function signInAdminWithPassword(
  email: string,
  password: string,
  options: FetchOptions = {},
): Promise<AdminClientAuthResult> {
  const fetchImpl = options.fetchImpl || fetch;
  try {
    const response = await fetchImpl("/api/admin/session", {
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = await readResponse(response);
    if (!response.ok || payload?.admin !== true) {
      return {
        message: payload?.error || "Login admin non disponibile.",
        state: "error",
      };
    }

    return { message: "Accesso verificato.", state: "idle" };
  } catch (error) {
    return {
      message: error instanceof Error && error.message ? error.message : "Login admin non disponibile.",
      state: "error",
    };
  }
}

export async function signOutAdmin(options: FetchOptions = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  await fetchImpl("/api/admin/session", { method: "DELETE" });
}
