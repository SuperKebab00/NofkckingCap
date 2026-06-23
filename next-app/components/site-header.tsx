import { navItems } from "../lib/static-content";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#home" aria-label="No Cap Barber Shop home">
        <img src="/Img/Design/NO CAP LOGO_1.png" alt="No Cap Barber Shop" />
      </a>
      <nav className="main-nav" aria-label="Migration sections">
        {navItems.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
