"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/notes", label: "Notes" },
  { href: "/about", label: "About" },
  { href: "/subscribe", label: "Follow" },
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
    <header className="sticky top-0 z-30 border-b border-line/60 bg-[#faf6ee]/95 backdrop-blur">
      <div className="mx-auto flex min-h-[74px] w-full max-w-[1750px] flex-col gap-3 px-5 py-3 sm:px-8 md:flex-row md:items-center md:justify-between md:gap-6 md:px-10">
        <Link href="/" className="font-serif text-[17px] leading-tight text-[#0b1620] sm:text-[20px] lg:text-[23px]">
          Behzad Gharehjanloo <span className="px-1 text-[#ad956f]" aria-hidden="true">·</span> Steven Jones
        </Link>

        <nav
          aria-label="Primary navigation"
          className="flex w-full min-w-0 flex-nowrap items-center gap-x-2 overflow-x-auto text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0b1620] sm:gap-x-3 sm:text-[12px] sm:tracking-[0.1em] md:flex-wrap md:justify-end md:gap-x-8 md:gap-y-3 md:text-sm md:font-medium md:tracking-[0.14em]"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap pb-2 transition hover:text-[#8f6d2f] ${
                isActive(pathname, item.href) ? "border-b border-[#b08a45]" : "border-b border-transparent"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
