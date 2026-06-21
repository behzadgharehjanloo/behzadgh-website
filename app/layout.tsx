import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"]
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const navItems = [
  { href: "/", label: "Home" },
  { href: "/notes", label: "Notes" },
  { href: "/about", label: "About" },
  { href: "/subscribe", label: "Subscribe" }
];

export const metadata: Metadata = {
  metadataBase: new URL("https://behzadgh.com"),
  title: {
    default: "Behzad Gharehjanloo",
    template: "%s | Behzad Gharehjanloo"
  },
  description: "Notes, photographs, and occasional letters from Behzad Gharehjanloo.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Behzad Gharehjanloo",
    description: "Notes, photographs, and occasional letters.",
    url: "https://behzadgh.com",
    siteName: "Behzad Gharehjanloo",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} min-h-screen font-sans antialiased`}>
        <div className="site-shell min-h-screen bg-paper">
          <header className="site-header mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
            <Link href="/" className="font-serif text-2xl leading-none text-ink">
              Behzad Gharehjanloo
            </Link>
            <nav aria-label="Primary navigation" className="flex flex-wrap gap-x-6 gap-y-2 text-base text-muted">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="transition hover:text-ink">
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main>{children}</main>
          <footer className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
            <p>Behzad Gharehjanloo</p>
            <p>Notes, photographs, and occasional letters.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
