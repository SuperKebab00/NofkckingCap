export type NavItem = {
  label: string;
  href: string;
};

export type ProductTeaser = {
  name: string;
  category: string;
  image: string;
};

export type PlaceholderContent = {
  id: string;
  label: string;
  title: string;
  description: string;
};

export const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Checkout", href: "/checkout" },
  { label: "Admin", href: "/admin" },
  { label: "Contact", href: "/contact" },
];

export const heroContent = {
  eyebrow: "No Cap barber studio",
  titleFirstLine: "Fresh gear.",
  titleSecondLine: "Zero cap.",
  description:
    "Tagli netti, styling curato e selezione prodotti in evidenza: la home Next presenta il lato pubblico gia pronto per preview e deploy dedicato.",
  primaryAction: {
    label: "Vedi teaser shop",
    href: "#shop",
  },
  secondaryAction: {
    label: "Vai allo shop",
    href: "/shop",
  },
  image: {
    src: "/Img/wallpaper/1-opt.webp",
    alt: "No Cap Barber Shop",
  },
  badge: {
    label: "NC",
    description: "Shop, contatti e admin read-only",
  },
};

export const productTeasers: ProductTeaser[] = [
  {
    name: "Black wax",
    category: "Styling",
    image: "/Img/products/black-wax-packshot-opt.webp",
  },
  {
    name: "Clay pomade",
    category: "Finish matte",
    image: "/Img/products/clay-pomade-packshot-opt.webp",
  },
];

export const shopTeaserContent = {
  eyebrow: "Shop teaser",
  title: "Prodotti No Cap",
  description:
    "Anteprima statica del catalogo. Non e ancora collegata a Supabase e non legge disponibilita o prezzi reali.",
  productNote: "Placeholder statico, nessun carrello collegato.",
};

export const shopPageContent = {
  eyebrow: "Catalogo statico di migrazione",
  title: "Shop preview",
  description:
    "Prima route pubblica Next dedicata allo shop. Usa solo contenuti statici e non legge ancora prodotti, stock o prezzi da Supabase.",
  badge: "Catalogo statico di migrazione",
  missingTitle: "Cosa manca",
  missingItems: ["Dati Supabase reali", "Stock reale", "Carrello", "Checkout"],
  homeAction: {
    label: "Torna alla home",
    href: "/",
  },
  checkoutAction: {
    label: "Placeholder checkout",
    href: "/checkout",
  },
};

export const checkoutPageContent = {
  eyebrow: "Checkout migration placeholder",
  title: "Checkout non ancora migrato",
  description:
    "Questa pagina documenta lo stato del checkout durante la migrazione Next.js. Il checkout reale resta nella app vanilla.",
  notice:
    "Placeholder di migrazione: nessun form, nessun carrello e nessuna chiamata API.",
  currentStatusTitle: "Stato attuale",
  currentStatusItems: [
    "Checkout reale ancora vanilla",
    'Payment mode attivo: "in-shop"',
    "PayPal/Stripe off",
    "API Cloudflare preservate",
  ],
  invariantsTitle: "Invarianti da preservare",
  invariants: [
    "Il frontend non invia prezzi, totali o status.",
    "Il server resta fonte di verita per prezzi, stock, totali e stato ordine.",
    "Il payload checkout e gia testato nella app vanilla.",
  ],
  homeAction: {
    label: "Torna alla home",
    href: "/",
  },
  shopAction: {
    label: "Vai allo shop statico",
    href: "/shop",
  },
};

export const adminPageContent = {
  eyebrow: "Admin migration placeholder",
  title: "Admin non ancora migrato",
  description:
    "Questa pagina documenta lo stato dell'area admin durante la migrazione Next.js. Il pannello operativo reale resta nella app vanilla.",
  notice:
    "Placeholder di migrazione: nessuna auth, nessuna dashboard e nessuna mutazione admin.",
  currentStatusTitle: "Stato attuale",
  currentStatusItems: [
    "Admin reale ancora vanilla",
    "Supabase Auth/RLS non ancora migrati",
    "Service role mai nel client",
    "Mutazioni admin da migrare tardi",
  ],
  goNoGoTitle: "Go/no-go admin",
  goNoGoItems: [
    "GO solo dopo checklist auth, RLS e mutazioni.",
    "NO-GO se si rischia di confondere UI admin con sicurezza reale.",
  ],
  homeAction: {
    label: "Torna alla home",
    href: "/",
  },
  shopAction: {
    label: "Vai allo shop statico",
    href: "/shop",
  },
};

export const contactPageContent = {
  eyebrow: "Contact migration placeholder",
  title: "Contact non ancora migrato",
  description:
    "Questa pagina documenta lo stato del contatto durante la migrazione Next.js. Il form reale resta nella app vanilla e nelle API Cloudflare esistenti.",
  notice:
    "Placeholder di migrazione: nessun form funzionante e nessuna submit attiva.",
  currentStatusTitle: "Stato attuale",
  currentStatusItems: [
    "Contact reale ancora vanilla/API Cloudflare",
    "Nessuna submit attiva in Next",
    "Nessun dato inviato",
  ],
  homeAction: {
    label: "Torna alla home",
    href: "/",
  },
  shopAction: {
    label: "Vai allo shop statico",
    href: "/shop",
  },
};

export const brandStoryContent = {
  eyebrow: "Barber identity",
  title: "Shop barber, contenuti e catalogo restano protetti.",
  description:
    "Questa pagina porta solo home e navigazione pubblica. Checkout, admin, Supabase client e API Cloudflare non sono stati migrati in questo step.",
};

export const placeholders: PlaceholderContent[] = [
  {
    id: "checkout",
    label: "Checkout",
    title: "Non ancora migrato",
    description:
      "Il checkout reale resta nella app vanilla. Il flusso attivo resta `in-shop`; PayPal e Stripe restano off/futuri.",
  },
  {
    id: "admin",
    label: "Admin",
    title: "Non ancora migrato",
    description:
      "Admin, auth Supabase, ordini, prodotti e leads resteranno vanilla finche non avranno un task dedicato.",
  },
];

export const migrationStatus = [
  "Vanilla app ancora sorgente primaria",
  "API Cloudflare ancora in functions/api",
  "Payments online off",
  "Active flow: in-shop",
];
