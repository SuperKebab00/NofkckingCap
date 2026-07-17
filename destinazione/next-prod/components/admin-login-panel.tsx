"use client";

import { useState } from "react";
import {
  signInAdminWithPassword,
  type AdminClientAuthResult,
} from "../lib/admin-login";

const initialResult: AdminClientAuthResult = {
  message: "Inserisci le credenziali del negozio per continuare.",
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
    <section className="missing-panel admin-login-card" aria-labelledby="admin-login-panel">
      <img className="admin-login-card__logo" src="/Img/Design/no-cap-logo.webp" alt="No Cap Barber Shop" />
      <h2 id="admin-login-panel">Accesso gestore</h2>
      <p>
        Entra nell&apos;area riservata del negozio.
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
          <button className="primary-button admin-login-card__submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Accesso..." : "Accedi"}
          </button>
        </div>
      </form>

      <p className="admin-inline-note">
        {result.message}
      </p>
    </section>
  );
}
