import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8">
      <p className="text-sm uppercase text-sage">Not found</p>
      <h1 className="mt-3 font-serif text-5xl text-ink">This page is not here.</h1>
      <Link href="/" className="mt-8 inline-block text-sm text-muted underline hover:text-ink">
        Return home
      </Link>
    </div>
  );
}
