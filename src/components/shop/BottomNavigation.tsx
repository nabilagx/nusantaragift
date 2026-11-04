
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "Beranda", href: "/shop", icon: "home" },
  { label: "Favorit", href: "/favorites", icon: "heart" },
  { label: "Keranjang", href: "/cart", icon: "bag" },
  { label: "Profil", href: "/profile", icon: "profile" },
];

function NavigationIcon({
  icon,
  active,
}: {
  icon: string;
  active: boolean;
}) {
  const common = {
    className: "h-[25px] w-[25px] shrink-0",
    viewBox: "0 0 24 24",
    stroke: active ? "#93372A" : "#9C897F",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const fill = active ? "#93372A" : "none";

  if (icon === "home") {
    return (
      <svg {...common} fill="none">
        <path
          d="M3 10.5 12 3l9 7.5v10a.5.5 0 0 1-.5.5h-6v-7h-5v7h-6a.5.5 0 0 1-.5-.5v-10Z"
          fill={fill}
        />
      </svg>
    );
  }

  if (icon === "heart") {
    return (
      <svg {...common} fill="none">
        <path
          d="M20.8 8.8c0 4.2-8.8 11-8.8 11s-8.8-6.8-8.8-11A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"
          fill={fill}
        />
      </svg>
    );
  }

  if (icon === "bag") {
    return (
      <svg {...common} fill="none">
        <rect
          x="3.5"
          y="7.5"
          width="17"
          height="14"
          rx="1.5"
          fill={fill}
        />
        <path d="M8 7.5V5a4 4 0 0 1 8 0v2.5" />
      </svg>
    );
  }

  return (
    <svg {...common} fill="none">
      <circle cx="12" cy="7.5" r="4" fill={fill} />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2Z" fill={fill} />
    </svg>
  );
}

export default function BottomNavigation() {
  const pathname = usePathname();

  const activeIndex = navigationItems.findIndex((item) => {
    if (item.href === "/shop") {
      return pathname === "/shop" || pathname === "/";
    }

    return (
      pathname === item.href ||
      pathname.startsWith(`${item.href}/`)
    );
  });

  return (
    <div
      className="
        fixed inset-x-0 bottom-0 z-[100]
        px-[25px] pb-0
        sm:bottom-6 sm:px-6
      "
    >
      <nav
        aria-label="Navigasi utama"
        className="
          relative mx-auto flex h-[85px] w-full max-w-[480px]
          items-center rounded-t-[28px] rounded-b-none
          bg-[#FFFAF8] px-2
          shadow-[0_-5px_25px_rgba(80,45,30,0.12)]
          sm:rounded-[28px]
          sm:shadow-[0_8px_35px_rgba(80,45,30,0.14)]
        "
      >
        {/* Indikator aktif yang bergerak */}
        {activeIndex >= 0 && (
          <span
            className="
              pointer-events-none absolute bottom-[9px] left-0
              h-[3px] w-1/4
              transition-transform duration-500
              ease-[cubic-bezier(0.22,1,0.36,1)]
            "
            style={{
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          >
            <span className="mx-auto block h-full w-[22px] rounded-full bg-[#93372A]" />
          </span>
        )}

        {navigationItems.map((item, index) => {
          const active = activeIndex === index;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="
                relative z-10 flex h-full min-w-0 flex-1
                flex-col items-center justify-center gap-[7px]
                transition-colors duration-300
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-[#93372A]
                focus-visible:ring-inset
              "
            >
              <span className="transition-colors duration-300">
                <NavigationIcon icon={item.icon} active={active} />
              </span>

              <span
                className={`
                  whitespace-nowrap text-[11px] font-semibold
                  transition-colors duration-300
                  ${active ? "text-[#93372A]" : "text-[#9C897F]"}
                `}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
