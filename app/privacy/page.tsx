import type { Metadata } from "next";
import { signupGeographyDisclosure } from "@/lib/signup-geography-disclosure";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How email subscriptions and approximate readership statistics are handled."
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-14 sm:px-8 md:pt-20">
      <h1 className="font-serif text-[38px] font-medium leading-tight text-ink sm:text-6xl">Privacy</h1>
      <div className="mt-8 max-w-[680px] space-y-5 text-[17px] leading-[1.7] text-muted">
        <p>When you subscribe, your email address is used to send you notes and subscription-related messages. You can unsubscribe at any time.</p>
        <p>{signupGeographyDisclosure}</p>
      </div>
    </div>
  );
}
