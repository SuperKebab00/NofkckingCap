"use client";

import { useState } from "react";
import {
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
        return;
      }

      const verified = await verifyAdminAccessToken(loginResult.accessToken);
      setResult(verified);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="missing-panel" aria-labelledby="admin-login-panel">
      <h2 id="admin-login-panel">Login admin minimo</h2>
      <p style={{ marginTop: "0.5rem" }}>
        Questo pannello serve solo a ottenere un JWT Supabase lato client e far
        verificare lo stato admin a Cloudflare. Non abilita CRUD o write.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Email admin</span>
          <input
            className="contact-form__input"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Password</span>
          <input
            className="contact-form__input"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: "0.75rem",
            justifyContent: "space-between",
          }}
        >
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

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          marginTop: "1rem",
        }}
      >
        <article className="status-card">
          <h3 style={{ margin: 0 }}>Authenticated</h3>
          <p style={{ fontSize: "1.5rem", margin: "0.25rem 0" }}>
            {result.authenticated ? "true" : "false"}
          </p>
        </article>

        <article className="status-card">
          <h3 style={{ margin: 0 }}>Admin</h3>
          <p style={{ fontSize: "1.5rem", margin: "0.25rem 0" }}>
            {result.admin ? "true" : "false"}
          </p>
        </article>
      </div>

      <p className="admin-inline-note" style={{ marginTop: "1rem" }}>
        {result.message}
      </p>
    </section>
  );
}
