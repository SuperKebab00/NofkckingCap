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
  price: string;
  stock: number | null;
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
  titleFirstLine: "Tagli, prodotti",
  titleSecondLine: "e passaggi in shop",
  description:
    "Una base pulita per scoprire il catalogo, preparare il ritiro in negozio e contattare il team senza attriti.",
  primaryAction: {
    label: "Scopri i prodotti",
    href: "/shop",
  },
  secondaryAction: {
    label: "Contattaci",
    href: "/contact",
  },
  image: {
    src: "/Img/wallpaper/1-opt.webp",
    alt: "Interno di No Cap Barbershop",
  },
  badge: {
    label: "Ritiro in shop",
    description: "Consulta i prodotti e prepara il passaggio in negozio.",
  },
};

export const productTeasers: ProductTeaser[] = [
  {
    name: "Black wax",
    category: "Styling",
    description: "Tenuta decisa con finish pulito per look strutturati.",
    image: "/Img/products/black-wax-packshot-opt.webp",
    packshotUrl: "/Img/products/black-wax-packshot-opt.webp",
    lifestyleUrl: "/Img/products/black-wax-lifestyle-opt.webp",
    checkoutHref: "/checkout?product=black-wax",
    contactHref: "/contact?product=black-wax",
    price: "€18",
    stock: null,
  },
  {
    name: "Clay pomade",
    category: "Texture",
    description: "Texture opaca e controllo flessibile per styling quotidiano.",
    image: "/Img/products/clay-pomade-packshot-opt.webp",
    packshotUrl: "/Img/products/clay-pomade-packshot-opt.webp",
    lifestyleUrl: "/Img/products/clay-pomade-lifestyle-opt.webp",
    checkoutHref: "/checkout?product=clay-pomade",
    contactHref: "/contact?product=clay-pomade",
    price: "€19",
    stock: null,
  },
  {
    name: "Sea salt spray",
    category: "Volume",
    description: "Volume leggero e texture salina per pieghe mosse e naturali.",
    image: "/Img/products/sea-salt-spray-packshot-opt.webp",
    packshotUrl: "/Img/products/sea-salt-spray-packshot-opt.webp",
    lifestyleUrl: "/Img/products/sea-salt-spray-lifestyle-opt.webp",
    checkoutHref: "/checkout?product=sea-salt-spray",
    contactHref: "/contact?product=sea-salt-spray",
    price: "€16",
    stock: null,
  },
];

export const shopTeaserContent = {
  eyebrow: "Prodotti in evidenza",
  title: "Una selezione pronta da consultare",
  description:
    "Styling, volume e finish da verificare prima del ritiro in negozio o del contatto diretto con il team.",
};

export const shopPageContent = {
  eyebrow: "Shop pubblico",
  title: "Prodotti e categorie disponibili",
  badge: "Catalogo aggiornato",
  description:
    "Consulta la selezione prodotti, filtra per categoria e prepara il tuo prossimo passaggio in negozio.",
  missingTitle: "Nessun prodotto disponibile al momento",
  missingItems: [
    "Controlla di nuovo piu tardi per la prossima disponibilita.",
    "Contattaci se vuoi verificare un prodotto specifico.",
  ],
  homeAction: {
    href: "/",
    label: "Torna alla home",
  },
};

export const brandStoryContent = {
  eyebrow: "Studio",
  title: "Ritmo di bottega, taglio contemporaneo",
  description:
    "No Cap unisce atmosfera da barber studio, prodotti selezionati e una gestione diretta delle richieste in shop.",
};
