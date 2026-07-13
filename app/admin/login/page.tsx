import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false }
};

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-20 pt-16 sm:px-8">
      <p className="text-sm uppercase text-sage">Private admin</p>
      <h1 className="mt-3 font-serif text-5xl leading-tight text-ink">Sign in.</h1>
      <form method="post" action="/api/admin/login" className="mt-10 border-y border-line py-8">
        <label htmlFor="password" className="block text-sm font-medium text-ink">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="mt-3 min-h-12 w-full border border-line bg-paper px-4 text-base text-ink outline-none transition focus:border-ink"
        />
        {error ? (
          <p role="alert" className="mt-4 text-sm leading-6 text-clay">
            {error === "configuration" ? "Admin access is not configured." : "The password was not accepted. Please wait before trying again if attempts continue to fail."}
          </p>
        ) : null}
        <button type="submit" className="mt-5 min-h-12 rounded-full bg-ink px-6 text-sm font-medium text-paper transition hover:bg-clay focus:outline-none focus:ring-2 focus:ring-clay/30 focus:ring-offset-2 focus:ring-offset-paper">
          Sign in
        </button>
      </form>
    </div>
  );
}
