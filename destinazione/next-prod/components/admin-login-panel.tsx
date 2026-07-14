"use client";

import { useState } from "react";
import {
  signInAdminWithPassword,
  type AdminClientAuthResult,
} from "../lib/admin-login";

const initialResult: AdminClientAuthResult = {
  message: "Login admin richiesto per verificare una sessione reale.",
  state: "idle",
};

export function AdminLoginPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<AdminClientAuthResult>(initialResult);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setResult((current) => ({
      ...current,
      message: "Verifica admin in corso...",
      state: "submitting",
    }));

    try {
      const loginResult = await signInAdminWithPassword(email, password);
      setResult(loginResult);
      if (loginResult.state !== "error") {
        window.location.assign("/admin");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="missing-panel" aria-labelledby="admin-login-panel">
      <h2 id="admin-login-panel">Accesso gestore</h2>
      <p>
        Accedi con il tuo utente Supabase. La sessione viene verificata lato server
        e conservata esclusivamente in cookie sicuri HttpOnly.
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
            {isSubmitting ? "Verifica in corso..." : "Accedi all'area admin"}
          </button>
          <span className="status-badge">
            {result.state === "submitting"
                    ? "In corso"
                    : result.state === "error"
                      ? "Errore"
                      : "Login richiesto"}
          </span>
        </div>
      </form>

      <p className="admin-inline-note">
        {result.message}
      </p>
    </section>
  );
}
