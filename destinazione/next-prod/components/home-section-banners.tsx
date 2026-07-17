import Link from "next/link";

const banners = [
  {
    className: "section-banner--shop",
    href: "/shop",
    kicker: "01 / Shop",
    title: "All products",
    copy: "Catalogo completo con disponibilita aggiornata",
  },
  {
    className: "section-banner--styling",
    href: "/shop?category=styling",
    kicker: "02 / Styling",
    title: "Wax & pomade",
    copy: "Texture, tenuta e finish da barber shop",
  },
  {
    className: "section-banner--tools",
    href: "/shop?category=tools",
    kicker: "03 / Tools",
    title: "Blade kits",
    copy: "Strumenti tecnici e ricambi premium",
  },
  {
    className: "section-banner--cut",
    href: "/taglio-fresco",
    kicker: "04 / Fresh cut",
    title: "Taglio del giorno",
    copy: "Il look fresco da mettere in evidenza oggi",
  },
];

export function HomeSectionBanners() {
  return (
    <div className="section-banners" aria-label="Pagine del sito">
      {banners.map((item) => (
        <Link
          className={`section-banner ${item.className}`}
          href={item.href}
          key={item.kicker}
        >
          <span>{item.kicker}</span>
          <strong>{item.title}</strong>
          <small>{item.copy}</small>
        </Link>
      ))}
    </div>
  );
}
