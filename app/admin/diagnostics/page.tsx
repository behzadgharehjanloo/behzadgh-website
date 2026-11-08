import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticatedReadOnly } from "@/lib/auth";
import { AdminGmailDiagnostic } from "@/components/AdminGmailDiagnostic";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin diagnostics", robots: { index: false, follow: false } };

export default async function AdminDiagnosticsPage() {
  if (!(await isAdminAuthenticatedReadOnly())) redirect("/admin/login");
  return <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
    <Link href="/admin" className="text-sm font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2">← Admin dashboard</Link>
    <h1 className="mt-6 font-serif text-4xl">Diagnostics</h1>
    <AdminGmailDiagnostic />
    <Link href="/admin/diagnostics/notes-test" className="mt-8 inline-block text-sm font-semibold underline underline-offset-4">Prepare one synthetic Notes test email</Link>
  </main>;
}
