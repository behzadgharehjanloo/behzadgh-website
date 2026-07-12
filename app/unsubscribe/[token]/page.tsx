import type { Metadata } from "next";
import { subscriberForToken } from "@/lib/subscribers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false }
};

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const subscriber = subscriberForToken(token);

  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-20 pt-16 sm:px-8">
      <p className="text-sm uppercase text-sage">Email preferences</p>
      <h1 className="mt-3 font-serif text-5xl leading-tight text-ink">Unsubscribe.</h1>
      {!subscriber ? (
        <p className="mt-8 text-base leading-7 text-muted">This unsubscribe link is not valid.</p>
      ) : subscriber.status === "unsubscribed" ? (
        <p className="mt-8 text-base leading-7 text-muted">You are already unsubscribed.</p>
      ) : subscriber.status === "suppressed" ? (
        <p className="mt-8 text-base leading-7 text-muted">This address is not receiving newsletter email.</p>
      ) : (
        <form method="post" action={`/api/unsubscribe/${encodeURIComponent(token)}`} className="mt-10 border-y border-line py-8">
          <p className="text-base leading-7 text-muted">Confirm that you no longer want to receive newsletter email.</p>
          <input type="hidden" name="confirm" value="1" />
          <button type="submit" className="mt-5 min-h-12 rounded-full bg-ink px-6 text-sm font-medium text-paper transition hover:bg-clay focus:outline-none focus:ring-2 focus:ring-clay/30 focus:ring-offset-2 focus:ring-offset-paper">
            Unsubscribe
          </button>
        </form>
      )}
    </div>
  );
}
