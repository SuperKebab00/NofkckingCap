export function productImage(product, variant = "front") {
  const [primary, accent, neutral] = product.colors;
  const title = product.name.split(" ")[0].toUpperCase();
  const rotate = variant === "front" ? "-2" : "4";
  const detail = variant === "front" ? accent : primary;
  const background = variant === "front" ? primary : accent;

  const svgByShape = {
    bottle: `
      <rect x="108" y="40" width="44" height="28" rx="8" fill="${neutral}"/>
      <rect x="96" y="66" width="68" height="178" rx="20" fill="${background}" stroke="${neutral}" stroke-width="8"/>
      <rect x="108" y="96" width="44" height="98" rx="10" fill="#ffffff" opacity=".72"/>
      <text x="130" y="132" text-anchor="middle" font-family="Arial Black" font-size="19" fill="${neutral}" transform="rotate(-90 130 132)">${title}</text>
      <circle cx="130" cy="216" r="15" fill="${detail}"/>`,
    jar: `
      <ellipse cx="130" cy="86" rx="82" ry="24" fill="${neutral}"/>
      <path d="M48 88h164l-18 112c-3 20-19 34-39 34h-50c-20 0-36-14-39-34L48 88Z" fill="${background}" stroke="${neutral}" stroke-width="8"/>
      <rect x="62" y="118" width="136" height="64" rx="10" fill="${detail}" opacity=".85"/>
      <text x="130" y="157" text-anchor="middle" font-family="Arial Black" font-size="24" fill="#fff">${title}</text>
      <path d="M72 205h116" stroke="#fff" stroke-width="8" stroke-dasharray="9 9" opacity=".7"/>`,
    spray: `
      <rect x="102" y="32" width="56" height="38" rx="9" fill="${neutral}"/>
      <rect x="92" y="66" width="76" height="182" rx="22" fill="${background}" stroke="${neutral}" stroke-width="8"/>
      <rect x="108" y="96" width="44" height="106" rx="8" fill="#ffffff" opacity=".88"/>
      <text x="130" y="138" text-anchor="middle" font-family="Arial Black" font-size="18" fill="${detail}" transform="rotate(-90 130 138)">DUST</text>
      <path d="M96 218h68" stroke="${detail}" stroke-width="7"/>`,
    blade: `
      <path d="M46 78h168v66l-22 14H68l-22-14V78Z" fill="${background}" stroke="${neutral}" stroke-width="8"/>
      <path d="M58 144h144v58H58z" fill="${primary}" stroke="${neutral}" stroke-width="7"/>
      <path d="M74 96h112l-24 28H98z" fill="#fff" opacity=".92"/>
      <text x="130" y="188" text-anchor="middle" font-family="Arial Black" font-size="32" fill="${detail}">NC</text>
      <circle cx="84" cy="224" r="13" fill="#fff"/><circle cx="176" cy="224" r="13" fill="#fff"/>`,
    comb: `
      <rect x="40" y="80" width="180" height="44" rx="10" fill="${background}" stroke="${neutral}" stroke-width="7"/>
      <g fill="${background}" stroke="${neutral}" stroke-width="5">
        ${Array.from({ length: 13 }, (_, index) => `<rect x="${52 + index * 12}" y="122" width="6" height="${86 - (index % 2) * 16}" rx="2"/>`).join("")}
      </g>
      <text x="130" y="109" text-anchor="middle" font-family="Arial Black" font-size="22" fill="${detail}">NO CAP</text>`
  };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="260" height="280" viewBox="0 0 260 280">
      <rect width="260" height="280" fill="none"/>
      <g transform="rotate(${rotate} 130 140)">
        ${svgByShape[product.shape]}
      </g>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
