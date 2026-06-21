"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/notes", label: "Notes" },
  { href: "/about", label: "About" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/contact", label: "Contact" }
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 h-[160px] border-b border-line/60 bg-[#faf6ee]/95 backdrop-blur md:h-[76px]">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-5 py-5 sm:px-8 md:flex-row md:items-center md:justify-between md:px-10 md:py-0 lg:px-14">
        <Link href="/" className="font-serif text-[22px] leading-tight text-[#0b1620] md:text-[28px]">
          Behzad Gharehjanloo
        </Link>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 md:justify-end">
          <nav
            aria-label="Primary navigation"
            className="flex flex-wrap items-center gap-x-3 gap-y-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0b1620] sm:gap-x-5 sm:text-[13px] md:gap-x-8 md:text-sm md:font-medium"
          >
            {navItems.map((item) => (
              <span key={item.href} className="contents">
                <Link
                  href={item.href}
                  className={`pb-2 transition hover:text-[#8f6d2f] ${
                    isActive(pathname, item.href) ? "border-b border-[#b08a45]" : "border-b border-transparent"
                  }`}
                >
                  {item.label}
                </Link>
                {item.href === "/about" ? <span className="basis-full md:hidden" aria-hidden="true" /> : null}
              </span>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex" aria-label="Social links">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b08a45]/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0b1620]">
              IG
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b08a45]/50 text-[12px] font-semibold text-[#0b1620]">
              f
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
