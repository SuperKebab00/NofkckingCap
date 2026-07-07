export type NavItem = {
  label: string;
  href: string;
};

export type ProductTeaser = {
  name: string;
  category: string;
  description: string;
  image: string;
  lifestyleUrl: string;
  packshotUrl: string;
  checkoutHref: string;
  contactHref: string;
  price?: number;
  stock: number | null;
};

export const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Taglio fresco", href: "/taglio-fresco" },
  { label: "Showcase", href: "/showcase" },
  { label: "Contatti", href: "/contact" },
];

export const heroContent = {
  eyebrow: "Shop essentials",
  titleFirstLine: "Fresh gear.",
  titleSecondLine: "Zero cap.",
  description:
    "Prodotti professionali, strumenti da banco e disponibilita aggiornata per uno shop barber pronto a vendere.",
  primaryAction: {
    label: "Vedi prodotti",
    href: "/shop",
  },
  secondaryAction: {
    label: "Taglio del giorno",
    href: "/taglio-fresco",
  },
  image: {
    src: "/Img/wallpaper/1-opt.webp",
    alt: "No Cap Barber Shop hero",
  },
  badge: {
    label: "Fresh cuts. Zero cap.",
    description: "NC",
  },
};

export const homeSectionBanners = [
  {
    href: "/shop",
    accent: "01 / Shop",
    title: "All products",
    body: "Catalogo completo con disponibilita aggiornata",
  },
  {
    href: "/shop?category=styling",
    accent: "02 / Styling",
    title: "Wax & pomade",
    body: "Texture, tenuta e finish da barber shop",
  },
  {
    href: "/shop?category=tools",
    accent: "03 / Tools",
    title: "Blade kits",
    body: "Strumenti tecnici e ricambi premium",
  },
  {
    href: "/taglio-fresco",
    accent: "04 / Fresh cut",
    title: "Taglio del giorno",
    body: "Il look fresco da mettere in evidenza oggi",
  },
  {
    href: "/showcase",
    accent: "05 / Showcase",
    title: "Questo mese",
    body: "Una selezione visiva dei tagli e delle atmosfere in evidenza",
  },
];

export const homeEditorialSections = {
  freshCut: {
    eyebrow: "Daily highlight",
    title: "Taglio fresco del giorno",
    description:
      "Il look da mettere in vetrina oggi: immagine ampia, taglio pulito e atmosfera editoriale in pieno stile No Cap.",
    image: "/Img/wallpaper/2-opt.webp",
    ctaLabel: "Vedi showcase mensile",
    ctaHref: "/showcase",
  },
  showcase: {
    eyebrow: "Showcase",
    title: "Tagli di questo mese",
    description:
      "Una raccolta visiva costruita con i riferimenti del barber shop: texture, sfumature, atmosfera di studio e dettagli prodotto.",
    items: [
      {
        title: "Fade pulito",
        body: "Linee strette, lati netti e finish opaco per il classico look da vetrina.",
        image: "/Img/wallpaper/3-opt.webp",
      },
      {
        title: "Texture naturale",
        body: "Volume controllato e styling leggero per tagli pronti a durare tutta la giornata.",
        image: "/Img/wallpaper/4-opt.webp",
      },
      {
        title: "Mood da studio",
        body: "Ambiente, strumenti e prodotti selezionati per un'esperienza coerente dal taglio allo shop.",
        image: "/Img/wallpaper/1-opt.webp",
      },
    ],
  },
};

export const productTeasers: ProductTeaser[] = [
  {
    name: "Aftershave",
    category: "Hair",
    description: "Aftershave rinfrescante con finitura pulita da barber shop.",
    image: "/Img/products/aftershave-packshot-opt.webp",
    packshotUrl: "/Img/products/aftershave-packshot-opt.webp",
    lifestyleUrl: "/Img/products/aftershave-lifestyle-opt.webp",
    checkoutHref: "/checkout?product=aftershave",
    contactHref: "/contact?product=aftershave",
    price: 15,
    stock: 10,
  },
  {
    name: "Black Wax",
    category: "Styling",
    description: "Tenuta forte con shine controllato per look precisi tutto il giorno.",
    image: "/Img/products/black-wax-packshot-opt.webp",
    packshotUrl: "/Img/products/black-wax-packshot-opt.webp",
    lifestyleUrl: "/Img/products/black-wax-lifestyle-opt.webp",
    checkoutHref: "/checkout?product=black-wax",
    contactHref: "/contact?product=black-wax",
    price: 17,
    stock: 6,
  },
  {
    name: "Clay Pomade",
    category: "Styling",
    description: "Texture opaca, flessibile e naturale per volume definito.",
    image: "/Img/products/clay-pomade-packshot-opt.webp",
    packshotUrl: "/Img/products/clay-pomade-packshot-opt.webp",
    lifestyleUrl: "/Img/products/clay-pomade-lifestyle-opt.webp",
    checkoutHref: "/checkout?product=clay-pomade",
    contactHref: "/contact?product=clay-pomade",
    price: 16,
    stock: 3,
  },
  {
    name: "Dust Wax",
    category: "Styling",
    description: "Volume asciutto e texture dry per styling moderno.",
    image: "/Img/products/dust-wax-packshot-opt.webp",
    packshotUrl: "/Img/products/dust-wax-packshot-opt.webp",
    lifestyleUrl: "/Img/products/dust-wax-lifestyle-opt.webp",
    checkoutHref: "/checkout?product=dust-wax",
    contactHref: "/contact?product=dust-wax",
    price: 20,
    stock: 2,
  },
  {
    name: "Fade DLC + Shallow DLC",
    category: "Tools",
    description: "Lama DLC professionale per sfumature pulite e veloci.",
    image: "/Img/products/fade-dlc-packshot-opt.webp",
    packshotUrl: "/Img/products/fade-dlc-packshot-opt.webp",
    lifestyleUrl: "/Img/products/fade-dlc-lifestyle-opt.webp",
    checkoutHref: "/checkout?product=fade-dlc",
    contactHref: "/contact?product=fade-dlc",
    price: 39.95,
    stock: 4,
  },
  {
    name: "Fade Gold + Slim Deep Gold",
    category: "Tools",
    description: "Set gold premium per precisione elevata in ogni passata.",
    image: "/Img/products/fade-gold-packshot-opt.webp",
    packshotUrl: "/Img/products/fade-gold-packshot-opt.webp",
    lifestyleUrl: "/Img/products/fade-gold-lifestyle-opt.webp",
    checkoutHref: "/checkout?product=fade-gold",
    contactHref: "/contact?product=fade-gold",
    price: 39.95,
    stock: 7,
  },
];

export const shopTeaserContent = {
  eyebrow: "Shop",
  title: "Prodotti No Cap",
  description:
    "Catalogo professionale, disponibilita aggiornata e selezione costruita per barber shop, styling e strumenti da banco.",
};

export const shopPageContent = {
  eyebrow: "Shop",
  title: "Prodotti No Cap",
  badge: "Catalogo professionale",
  description:
    "Scopri prodotti, disponibilita e ultimi pezzi con un'esperienza pensata per barber shop e ritiro in negozio.",
  missingTitle: "Catalogo in aggiornamento",
  missingItems: [
    "Al momento non ci sono prodotti pubblicati in questa vista.",
    "Puoi contattarci direttamente per disponibilita e richieste specifiche.",
  ],
  homeAction: {
    href: "/",
    label: "Torna alla home",
  },
};

export const brandStoryContent = {
  eyebrow: "No Cap Barbershop",
  title: "Vignola, MO",
  description:
    "Passa in shop, chiamaci o scrivici per prodotti, tagli e informazioni. Lo stile resta quello del barber studio: diretto, pulito, senza fronzoli.",
};
