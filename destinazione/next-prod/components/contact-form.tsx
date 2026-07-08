"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildContactPayload,
  validateContactFormData,
  type ContactFormValues,
} from "../lib/contact-form";
import {
  buildContactInitialValues,
  CONTACT_FLOW_COPY,
  CONTACT_FORM_ENDPOINT,
  getContactFormMode,
  getContactFormModeMessage,
  isContactFormSubmissionEnabled,
  type ContactInitialContext,
} from "../lib/public-flow";

type SubmitState = "idle" | "submitting" | "success" | "error";

type ContactFormProps = {
  initialContext?: ContactInitialContext;
};

const baseInitialValues: ContactFormValues = {
  email: "",
  message: "",
  phone: "",
  privacy: false,
  subject: "",
  website: "",
};

const contactFormMode = getContactFormMode(
  process.env.NEXT_PUBLIC_CONTACT_FORM_MODE,
);

function readFormValues(formData: FormData): ContactFormValues {
  return {
    email: String(formData.get("email") || "").trim(),
    message: String(formData.get("message") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    privacy: formData.get("privacy") === "on",
    subject: String(formData.get("subject") || "").trim(),
    website: String(formData.get("website") || "").trim(),
  };
}

export function ContactForm({ initialContext }: ContactFormProps) {
  const initialValues = useMemo(
    () => ({
      ...baseInitialValues,
      ...buildContactInitialValues(initialContext),
    }),
    [initialContext],
  );
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  useEffect(() => {
    setValues(initialValues);
    setFieldErrors({});
    setFormMessage("");
    setSubmitState("idle");
  }, [initialValues]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextValues = readFormValues(formData);
    const errors = validateContactFormData(nextValues);

    setValues(nextValues);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSubmitState("error");
      setFormMessage("Controlla i campi evidenziati e riprova.");
      return;
    }

    if (!isContactFormSubmissionEnabled(contactFormMode)) {
      setSubmitState("idle");
      setFormMessage(getContactFormModeMessage(contactFormMode));
      return;
    }

    setSubmitState("submitting");
    setFormMessage("");

    try {
      const response = await fetch(CONTACT_FORM_ENDPOINT, {
        body: JSON.stringify(buildContactPayload(nextValues)),
        headers: { "Content-Type": "application/json" },
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

      setFieldErrors({});
      setSubmitState("success");
      setFormMessage("Richiesta inviata. Ti ricontatteremo il prima possibile.");
      setValues(initialValues);
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
    <form className="contact-form" noValidate onSubmit={handleSubmit}>
      <input
        autoComplete="off"
        className="contact-honeypot"
        name="website"
        onChange={(event) =>
          setValues((current) => ({ ...current, website: event.target.value }))
        }
        tabIndex={-1}
        type="text"
        value={values.website}
      />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Contattaci</p>
          <h2>Scrivici</h2>
        </div>
        <p>Lascia i tuoi dati e il messaggio: ti ricontatteremo il prima possibile.</p>
      </div>

      {contactFormMode !== "live" ? (
        <p className="admin-inline-note">
          {getContactFormModeMessage(contactFormMode)}
        </p>
      ) : null}

      {initialContext?.product ? (
        <div className="contact-context">
          <p className="eyebrow">{CONTACT_FLOW_COPY.contextualBoxLabel}</p>
          <h3>{initialContext.product}</h3>
          <p>{CONTACT_FLOW_COPY.contextualBoxBody}</p>
        </div>
      ) : (
        <p className="admin-inline-note">{CONTACT_FLOW_COPY.genericHelper}</p>
      )}

      <div className="contact-form__grid">
        <label>
          Email
          <input
            className="contact-form__input"
            name="email"
            onChange={(event) =>
              setValues((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="nome@email.com"
            type="email"
            value={values.email}
          />
          {fieldErrors.email ? (
            <span className="field-error">{fieldErrors.email}</span>
          ) : null}
        </label>

        <label>
          Numero di telefono
          <input
            className="contact-form__input"
            name="phone"
            onChange={(event) =>
              setValues((current) => ({ ...current, phone: event.target.value }))
            }
            placeholder="+39 320 000 0000"
            type="text"
            value={values.phone}
          />
          {fieldErrors.phone ? (
            <span className="field-error">{fieldErrors.phone}</span>
          ) : null}
        </label>
      </div>

      <label>
        Oggetto
        <input
          className="contact-form__input"
          name="subject"
          onChange={(event) =>
            setValues((current) => ({ ...current, subject: event.target.value }))
          }
          placeholder="Prenotazione, prodotti, informazioni"
          type="text"
          value={values.subject}
        />
        {fieldErrors.subject ? (
          <span className="field-error">{fieldErrors.subject}</span>
        ) : null}
      </label>

      <label>
        Messaggio
        <textarea
          className="contact-form__input"
          name="message"
          onChange={(event) =>
            setValues((current) => ({ ...current, message: event.target.value }))
          }
          placeholder="Scrivi qui il tuo messaggio..."
          rows={5}
          value={values.message}
        />
        {fieldErrors.message ? (
          <span className="field-error">{fieldErrors.message}</span>
        ) : null}
      </label>

      <p className="admin-inline-note">{CONTACT_FLOW_COPY.noAutomaticOrderNote}</p>

      <label className="checkout-radio checkout-option contact-consent">
        <input
          checked={values.privacy}
          name="privacy"
          onChange={(event) =>
            setValues((current) => ({ ...current, privacy: event.target.checked }))
          }
          type="checkbox"
        />
        <span className="checkout-option__body">
          <strong>Privacy Policy</strong>
          <small>
            Accetto il trattamento dati per essere ricontattato come da{" "}
            <a href="/privacy">Privacy Policy</a>.
          </small>
        </span>
      </label>
      {fieldErrors.privacy ? (
        <span className="field-error">{fieldErrors.privacy}</span>
      ) : null}

      <div className="contact-form__actions">
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
          disabled={
            submitState === "submitting" ||
            !isContactFormSubmissionEnabled(contactFormMode)
          }
          type="submit"
        >
          {submitState === "submitting"
            ? "Invio..."
            : contactFormMode === "live"
              ? "Invia richiesta"
              : "Invio disabilitato"}
        </button>
      </div>

      {formMessage ? (
        <p
          className={`admin-inline-note contact-form__message ${
            submitState === "success" ? "contact-form__message--success" : ""
          }`}
        >
          {formMessage}
        </p>
      ) : null}
    </form>
  );
}
