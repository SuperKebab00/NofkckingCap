import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero" aria-label="No Cap Barber Shop">
      <div className="hero__side-text">NO CAP BARBER SHOP</div>
      <div className="hero__content">
        <p className="eyebrow">Shop essentials</p>
        <h1>
          <span>Fresh gear.</span>
          <span>Zero cap.</span>
        </h1>
        <p className="hero__copy">
          Prodotti professionali, strumenti da banco e disponibilita aggiornata
          per uno shop barber pronto a vendere.
        </p>
        <div className="hero__actions">
          <Link className="primary-button" href="/shop">
            Vedi prodotti
          </Link>
          <Link className="outline-button" href="/taglio-fresco">
            Taglio del giorno
          </Link>
        </div>
      </div>
      <div className="hero__panel" aria-hidden="true">
        <span>Fresh cuts. Zero cap.</span>
        <strong>NC</strong>
      </div>
    </section>
  );
}
