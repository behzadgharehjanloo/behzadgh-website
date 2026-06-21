import { ButtonLink } from "@/components/ButtonLink";
import { NoteList } from "@/components/NoteList";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/notes", label: "Notes" },
  { href: "/about", label: "About" },
  { href: "/subscribe", label: "Subscribe" }
];

export default function Home() {
  return (
    <div className="w-full">
      <section className="home-hero relative flex min-h-screen w-full flex-col overflow-hidden bg-[#faf6ee] md:min-h-screen md:justify-center">
        <div
          className="absolute inset-x-0 bottom-0 h-[45vh] bg-cover bg-[position:76%_center] md:inset-0 md:h-auto md:bg-[position:center_center]"
          style={{ backgroundImage: "url('/train-window-hero.png')" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-[45vh] bg-[linear-gradient(180deg,rgba(250,246,238,0.04)_0%,rgba(250,246,238,0)_40%,rgba(5,10,18,0.12)_100%)] md:inset-0 md:h-auto md:bg-[linear-gradient(90deg,rgba(250,246,238,0.94)_0%,rgba(250,246,238,0.82)_30%,rgba(250,246,238,0.24)_56%,rgba(7,10,15,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(250,246,238,0.98)_0%,rgba(250,246,238,0.92)_49%,rgba(250,246,238,0)_68%)] md:bg-[linear-gradient(180deg,rgba(250,246,238,0.34)_0%,rgba(250,246,238,0)_28%)]" />

        <header className="relative z-20 mx-auto flex w-full max-w-7xl items-start justify-between px-6 pt-8 sm:px-10 md:absolute md:inset-x-0 md:top-0 md:px-12 lg:px-14">
          <Link href="/" className="font-serif text-[22px] leading-tight text-[#0b1620] md:text-[28px]">
            Behzad Gharehjanloo
          </Link>
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-10 text-sm font-medium uppercase tracking-[0.14em] text-white md:flex"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`pb-4 transition hover:text-[#d8b36a] ${
                  item.href === "/" ? "border-b border-[#b08a45] text-[#f8f1e5]" : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            aria-label="Open navigation"
            className="flex h-11 w-11 items-center justify-center text-[#0b1620] md:hidden"
          >
            <span className="flex w-7 flex-col gap-1.5">
              <span className="h-0.5 w-full bg-current" />
              <span className="h-0.5 w-full bg-current" />
              <span className="h-0.5 w-full bg-current" />
            </span>
          </button>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-[47vh] pt-14 sm:px-10 md:px-12 md:pb-16 md:pt-28 lg:px-14">
          <div className="h-px w-16 bg-[#b08a45] md:w-20" />
          <h1 className="mt-8 max-w-[640px] font-serif text-[34px] font-medium leading-[1.12] text-[#0b1620] md:text-[76px] md:leading-[1.16] lg:text-[88px]">
            A story
            <br />
            still unfolding.
          </h1>
          <div className="mt-7 h-px w-16 bg-[#b08a45] md:w-20" />
          <p className="mt-8 max-w-[560px] text-[17px] leading-[1.72] text-[#101923] md:text-[20px] md:leading-[1.78]">
            For years, people have told me:
            <br />
            &quot;You should write a book.&quot;
            <br />
            I wasn&apos;t sure they were right.
            <br />
            This website is where I&apos;m documenting
            <br className="hidden md:block" />
            the process of finding out.
          </p>
          <a
            href="/subscribe"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-xs font-bold uppercase tracking-[0.18em] text-[#0b1620] shadow-[0_18px_46px_rgba(17,24,39,0.18)] transition hover:bg-[#f7efe2] hover:text-[#8f6d2f] focus:outline-none focus:ring-2 focus:ring-[#b08a45]/40 focus:ring-offset-2 focus:ring-offset-transparent md:mt-10 md:text-sm"
          >
            JOIN THE JOURNEY &rarr;
          </a>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-16 sm:px-8 md:pt-20 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase text-sage">Latest</p>
            <h2 className="mt-2 font-serif text-[26px] font-medium leading-[1.2] text-ink sm:text-[32px]">Notes</h2>
          </div>
          <ButtonLink href="/notes" variant="secondary" className="hidden sm:inline-flex">
            Archive
          </ButtonLink>
        </div>
        <NoteList limit={3} />
      </section>
    </div>
  );
}
