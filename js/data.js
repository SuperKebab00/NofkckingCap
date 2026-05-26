import { todayISO } from "./utils.js";

export const INVENTORY_STORAGE_KEY = "no-cap-inventory-v1";
export const FEATURED_CUT_STORAGE_KEY = "no-cap-fresh-cut-v1";
export const MONTHLY_CUTS_STORAGE_KEY = "no-cap-monthly-cuts-v1";

export const products = [
  {
    id: "aftershave",
    name: "Aftershave",
    category: "hair",
    label: "Aftershave",
    price: 15,
    stock: 10,
    restock: 10,
    colors: ["#d7f4ee", "#c9935a", "#111111"],
    shape: "bottle",
    images: {
      packshot: "Img/products/aftershave-packshot.webp",
      lifestyle: "Img/products/aftershave-lifestyle.webp"
    }
  },
  {
    id: "black-wax",
    name: "Black Wax",
    category: "styling",
    label: "Styling",
    price: 17,
    stock: 6,
    restock: 8,
    colors: ["#0d0d0d", "#f4f4f4", "#d40f19"],
    shape: "jar",
    images: {
      packshot: "Img/products/black-wax-packshot.webp",
      lifestyle: "Img/products/black-wax-lifestyle.webp"
    }
  },
  {
    id: "clay-pomade",
    name: "Clay Pomade",
    category: "styling",
    label: "Styling",
    price: 16,
    stock: 3,
    restock: 8,
    colors: ["#161616", "#8b4fd1", "#f2d5ff"],
    shape: "jar",
    images: {
      packshot: "Img/products/clay-pomade-packshot.webp",
      lifestyle: "Img/products/clay-pomade-lifestyle.webp"
    }
  },
  {
    id: "dust-wax",
    name: "Dust Wax",
    category: "styling",
    label: "Styling",
    price: 20,
    stock: 2,
    restock: 7,
    colors: ["#111111", "#f5f5f5", "#d40f19"],
    shape: "spray",
    images: {
      packshot: "Img/products/dust-wax-packshot.webp",
      lifestyle: "Img/products/dust-wax-lifestyle.webp"
    }
  },
  {
    id: "fade-dlc",
    name: "Fade DLC + Shallow DLC",
    category: "tools",
    label: "Tools",
    price: 39.95,
    stock: 4,
    restock: 6,
    colors: ["#080808", "#2c2c2c", "#ffffff"],
    shape: "blade",
    images: {
      packshot: "Img/products/fade-dlc-packshot.webp",
      lifestyle: "Img/products/fade-dlc-lifestyle.webp"
    }
  },
  {
    id: "fade-gold",
    name: "Fade Gold + Slim Deep Gold",
    category: "tools",
    label: "Tools",
    price: 39.95,
    stock: 7,
    restock: 9,
    colors: ["#d6a61f", "#ffe37a", "#111111"],
    shape: "blade",
    images: {
      packshot: "Img/products/fade-gold-packshot.webp",
      lifestyle: "Img/products/fade-gold-lifestyle.webp"
    }
  },
  {
    id: "faper-dlc",
    name: "Faper DLC + Slim Deep DLC",
    category: "tools",
    label: "Tools",
    price: 39.95,
    stock: 1,
    restock: 6,
    colors: ["#111111", "#333333", "#f1f1f1"],
    shape: "blade"
  },
  {
    id: "comb-kit",
    name: "No Cap Comb Kit",
    category: "accessories",
    label: "Accessories",
    price: 24,
    stock: 0,
    restock: 5,
    colors: ["#0a0a0a", "#d40f19", "#ffffff"],
    shape: "comb"
  }
];

export function freshCutPlaceholder() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#050505"/>
          <stop offset=".58" stop-color="#161616"/>
          <stop offset=".59" stop-color="#d40f19"/>
          <stop offset="1" stop-color="#8f0710"/>
        </linearGradient>
        <radialGradient id="light" cx=".42" cy=".22" r=".58">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".2"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)"/>
      <rect width="1200" height="900" fill="url(#light)"/>
      <path d="M130 724 C240 622 232 446 310 286 C382 139 592 134 694 258 C784 367 787 546 722 668 C654 795 400 812 130 724Z" fill="#d9d9d9" opacity=".9"/>
      <path d="M284 298 C376 136 594 133 708 284 C620 245 518 228 418 268 C355 293 312 330 284 298Z" fill="#0a0a0a"/>
      <path d="M354 560 C462 616 594 610 696 534" fill="none" stroke="#0a0a0a" stroke-width="28" stroke-linecap="round" opacity=".38"/>
      <path d="M808 190 L1050 110 L1000 184 L1120 205 L842 308Z" fill="#0a0a0a" opacity=".82"/>
      <text x="72" y="110" fill="#ffffff" font-family="Impact, Arial Black, sans-serif" font-size="82" font-style="italic">FRESH CUT</text>
      <text x="78" y="176" fill="#d40f19" font-family="Impact, Arial Black, sans-serif" font-size="82" font-style="italic">OF THE DAY</text>
      <text x="910" y="790" fill="#0a0a0a" font-family="Impact, Arial Black, sans-serif" font-size="116" font-style="italic">NC</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const defaultFreshCut = {
  id: "default-cut",
  name: "Skin fade crop",
  description: "Sfumatura pulita, texture naturale e finish opaco. Il taglio del giorno pronto per homepage, social e vetrina shop.",
  image: "Img/wallpaper/5.webp",
  date: todayISO()
};
