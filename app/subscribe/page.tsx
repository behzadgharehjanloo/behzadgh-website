import type { Metadata } from "next";
import { FollowSignup } from "@/components/FollowSignup";

export const metadata: Metadata = {
  title: "Follow",
  description: "Follow Behzad Gharehjanloo's personal writing project."
};

export default function SubscribePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-14 sm:px-8 md:pt-20">
      <p className="text-sm uppercase text-sage">Follow</p>
      <h1 className="mt-3 font-serif text-[38px] font-medium leading-[1.12] text-ink sm:text-6xl sm:leading-[1.05]">
        Follow the Journey
      </h1>
      <div className="mt-6 max-w-[680px] space-y-4 text-[17px] leading-[1.7] text-muted sm:text-lg sm:leading-[1.68]">
        <p>From time to time, I&rsquo;ll send a new note as this project continues to unfold.</p>
        <p>You&rsquo;ll receive new notes when they are written.</p>
        <p>If you&rsquo;d like to explore what came before, you&rsquo;ll also have access to earlier notes.</p>
      </div>
      <FollowSignup />
    </div>
  );
}
