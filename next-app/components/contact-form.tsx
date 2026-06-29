"use client";

import { useState } from "react";
import {
  buildContactPayload,
  validateContactFormData,
  type ContactFieldErrors,
  type ContactFormValues,
} from "../lib/contact-form";

type SubmitState = "idle" | "submitting" | "success" | "error";

const initialValues: ContactFormValues = {
  email: "",
  message: "",
  phone: "",
  privacy: false,
  subject: "",
  website: "",
};

function readFormValues(formData: FormData): ContactFormValues {
  return {
    email: String(formData.get("email") || ""),
    message: String(formData.get("message") || ""),
    phone: String(formData.get("phone") || ""),
    privacy: formData.get("privacy") === "on",
    subject: String(formData.get("subject") || ""),
    website: String(formData.get("website") || ""),
  };
}

export function ContactForm() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [formMessage, setFormMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const values = readFormValues(new FormData(form));
    const errors = validateContactFormData(values);

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSubmitState("error");
      setFormMessage("Controlla i campi evidenziati e riprova.");
      return;
    }

    setSubmitState("submitting");
    setFormMessage("");

    try {
      const response = await fetch("/api/contact/create", {
        body: JSON.stringify(buildContactPayload(values)),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error || "Impossibile inviare la richiesta. Riprova.",
        );
      }

      form.reset();
      setFieldErrors({});
      setSubmitState("success");
      setFormMessage("Richiesta inviata. Ti ricontatteremo il prima possibile.");
    } catch (error) {
      setSubmitState("error");
      setFormMessage(
        error instanceof Error && error.message
          ? error.message
          : "Impossibile inviare la richiesta. Riprova.",
      );
    }
  }

  return (
    <form className="panel" noValidate onSubmit={handleSubmit}>
      <input
        aria-hidden="true"
        autoComplete="off"
        hidden
        name="website"
        tabIndex={-1}
        type="text"
      />

      <div className="panel-heading">
        <div>
          <p className="eyebrow">Contattaci</p>
          <h2>Scrivici</h2>
        </div>
        <p>
          Lascia i tuoi dati e il messaggio: il backend Cloudflare resta la
          fonte di verita per validazione, rate limit e scrittura leads.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: "1rem",
        }}
      >
        <label>
          Email
          <input
            autoComplete="email"
            name="email"
            placeholder="nome@email.com"
            type="email"
          />
        </label>
        {fieldErrors.email ? (
          <span className="admin-inline-note">{fieldErrors.email}</span>
        ) : null}

        <label>
          Numero di telefono
          <input
            autoComplete="tel"
            name="phone"
            placeholder="+39 320 000 0000"
            type="tel"
          />
        </label>
        {fieldErrors.phone ? (
          <span className="admin-inline-note">{fieldErrors.phone}</span>
        ) : null}

        <label>
          Oggetto
          <input
            name="subject"
            placeholder="Prenotazione, prodotti, informazioni"
            type="text"
          />
        </label>
        {fieldErrors.subject ? (
          <span className="admin-inline-note">{fieldErrors.subject}</span>
        ) : null}

        <label>
          Messaggio
          <textarea
            name="message"
            placeholder="Scrivi qui il tuo messaggio..."
            rows={5}
          />
        </label>
        {fieldErrors.message ? (
          <span className="admin-inline-note">{fieldErrors.message}</span>
        ) : null}

        <label className="checkout-radio checkout-option">
          <input name="privacy" type="checkbox" />
          <span className="checkout-option__body">
            <strong>Privacy Policy</strong>
            <small>
              Accetto il trattamento dati per essere ricontattato come da{" "}
              <a href="/privacy">Privacy Policy</a>.
            </small>
          </span>
        </label>
        {fieldErrors.privacy ? (
          <span className="admin-inline-note">{fieldErrors.privacy}</span>
        ) : null}
      </div>

      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginTop: "1rem",
        }}
      >
        <a
          className="ghost-button"
          href="https://wa.me/393208839692"
          rel="noreferrer"
          target="_blank"
        >
          Scrivici su WhatsApp
        </a>
        <button
          className="primary-button"
          disabled={submitState === "submitting"}
          type="submit"
        >
          {submitState === "submitting" ? "Invio in corso..." : "Invia richiesta"}
        </button>
      </div>

      {formMessage ? (
        <p
          className="admin-inline-note"
          style={{
            color: submitState === "success" ? "#c7f0d3" : undefined,
            marginTop: "1rem",
          }}
        >
          {formMessage}
        </p>
      ) : null}
    </form>
  );
}
