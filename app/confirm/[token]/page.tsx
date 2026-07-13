import type { Metadata } from "next";
import { confirmationForToken } from "@/lib/subscribers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Confirm subscription",
  robots: { index: false, follow: false }
};

export default async function ConfirmSubscriptionPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { token } = await params;
  const { confirmed } = await searchParams;
  const confirmation = await confirmationForToken(token);

  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-20 pt-16 sm:px-8">
      <p className="text-sm uppercase text-sage">Newsletter</p>
      <h1 className="mt-3 font-serif text-5xl leading-tight text-ink">Confirm subscription.</h1>
      {confirmed === "1" ? (
        <p className="mt-8 text-base leading-7 text-muted">Your subscription is confirmed. A welcome email will follow shortly.</p>
      ) : !confirmation ? (
        <p className="mt-8 text-base leading-7 text-muted">This confirmation link is invalid or has expired.</p>
      ) : (
        <form method="post" action={`/api/confirm/${encodeURIComponent(token)}`} className="mt-10 border-y border-line py-8">
          <p className="text-base leading-7 text-muted">Confirm that you asked to receive occasional notes by email.</p>
          <button type="submit" className="mt-5 min-h-12 rounded-full bg-ink px-6 text-sm font-medium text-paper transition hover:bg-clay focus:outline-none focus:ring-2 focus:ring-clay/30 focus:ring-offset-2 focus:ring-offset-paper">
            Confirm subscription
          </button>
        </form>
      )}
    </div>
  );
}
