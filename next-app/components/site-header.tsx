import { navItems } from "../lib/static-content";

const publicNavItems = navItems.filter((item) =>
  ["/", "/shop", "/contact"].includes(item.href),
);

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="No Cap Barbershop home">
        <img src="/Img/Design/NO CAP LOGO_1.png" alt="No Cap Barbershop" />
      </a>

      <nav className="main-nav" aria-label="Navigazione principale">
        {publicNavItems.map((item) => (
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
