import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: "primary" | "secondary";
};

export function ButtonLink({ className = "", variant = "primary", ...props }: ButtonLinkProps) {
  const base =
    "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-clay/30 focus:ring-offset-2 focus:ring-offset-paper";
  const styles =
    variant === "primary"
      ? "bg-ink text-paper hover:bg-clay"
      : "border border-line bg-transparent text-ink hover:border-ink";

  return <Link className={`${base} ${styles} ${className}`} {...props} />;
}
