import Link from "next/link";

import { CartCount } from "./cart-count";
import { navItems } from "../lib/static-content";

export function SiteHeader() {
  return (
    <header className="site-header" data-elevated="false">
      <Link className="brand" href="/" aria-label="No Cap Barber Shop home">
        <img src="/Img/Design/no-cap-logo.webp" alt="No Cap Barber Shop" />
      </Link>

      <nav className="main-nav" aria-label="Navigazione principale">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <Link
          className="manager-toggle manager-toggle--hidden"
          href="/admin"
          aria-label="Area gestore"
        >
          <span aria-hidden="true">...</span>
        </Link>
        <Link className="cart-trigger" href="/checkout" aria-label="Vai al checkout">
          <span className="cart-trigger__icon" aria-hidden="true" />
          <CartCount />
        </Link>
      </div>
    </header>
  );
}
