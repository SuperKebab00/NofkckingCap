"use client";

import { useState } from "react";
import {
  ADMIN_ACCESS_TOKEN_STORAGE_KEY,
  ADMIN_AUTH_CHANGED_EVENT,
  getAdminClientConfig,
  signInAdminWithPassword,
  verifyAdminAccessToken,
  type AdminClientAuthResult,
} from "../lib/admin-login";

const initialResult: AdminClientAuthResult = {
  accessToken: null,
  admin: false,
  authenticated: false,
  message: "Login admin richiesto per verificare una sessione reale.",
  state: "idle",
};

export function AdminLoginPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<AdminClientAuthResult>(initialResult);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = getAdminClientConfig();

  function publishAdminToken(accessToken: string | null) {
    if (typeof window === "undefined") return;

    if (accessToken) {
      sessionStorage.setItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY, accessToken);
    } else {
      sessionStorage.removeItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY);
    }

    window.dispatchEvent(
      new CustomEvent(ADMIN_AUTH_CHANGED_EVENT, {
        detail: { accessToken },
      }),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!config) {
      setResult({
        accessToken: null,
        admin: false,
        authenticated: false,
        message:
          "Config client admin non disponibile: servono NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        state: "not-configured",
      });
      return;
    }

    setIsSubmitting(true);
    setResult((current) => ({
      ...current,
      message: "Verifica admin in corso...",
      state: "submitting",
    }));

    try {
      const loginResult = await signInAdminWithPassword(email, password);
      if (!loginResult.accessToken) {
        setResult(loginResult);
        publishAdminToken(null);
        return;
      }

      const verified = await verifyAdminAccessToken(loginResult.accessToken);
      setResult(verified);
      publishAdminToken(verified.admin ? verified.accessToken : null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="missing-panel" aria-labelledby="admin-login-panel">
      <h2 id="admin-login-panel">Login admin minimo</h2>
      <p>
        Questo pannello serve solo a ottenere un JWT Supabase lato client e far
        verificare lo stato admin a Cloudflare. Non abilita CRUD o write.
      </p>

      <form className="admin-login-form" onSubmit={handleSubmit}>
        <label>
          <span>Email admin</span>
          <input
            className="contact-form__input"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label>
          <span>Password</span>
          <input
            className="contact-form__input"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        <div className="admin-form-actions">
          <button className="ghost-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Verifica in corso..." : "Verifica sessione admin"}
          </button>
          <span className="status-badge">
            {result.state === "admin"
              ? "Admin verificato"
              : result.state === "non-admin"
                ? "Non admin"
                : result.state === "not-configured"
                  ? "Non configurata"
                  : result.state === "submitting"
                    ? "In corso"
                    : result.state === "error"
                      ? "Errore"
                      : "Login richiesto"}
          </span>
        </div>
      </form>

      <div className="admin-metric-grid admin-metric-grid--compact">
        <article className="status-card">
          <h3>Authenticated</h3>
          <p className="admin-metric-value admin-metric-value--text">
            {result.authenticated ? "true" : "false"}
          </p>
        </article>

        <article className="status-card">
          <h3>Admin</h3>
          <p className="admin-metric-value admin-metric-value--text">
            {result.admin ? "true" : "false"}
          </p>
        </article>
      </div>

      <p className="admin-inline-note">
        {result.message}
      </p>
    </section>
  );
}
