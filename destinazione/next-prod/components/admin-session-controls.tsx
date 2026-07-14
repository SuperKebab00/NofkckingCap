"use client";

import { useState } from "react";

import { signOutAdmin } from "../lib/admin-login";

export function AdminSessionControls() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      await signOutAdmin();
    } finally {
      window.location.assign("/admin");
    }
  }

  return (
    <button className="outline-button" disabled={isSubmitting} onClick={handleLogout} type="button">
      {isSubmitting ? "Uscita..." : "Esci"}
    </button>
  );
}
