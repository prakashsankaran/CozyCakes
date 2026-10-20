import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "@/components/admin/sign-in-form";
import { LogoMark } from "@/components/shell/logo";

export const metadata: Metadata = {
  title: "Sign in to the kitchen",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main
      id="main"
      className="grain flex flex-1 items-center justify-center bg-blush-100 px-4 py-16"
    >
      <div className="animate-rise w-full max-w-sm rounded-[var(--radius-lg)] bg-cream-50 p-6 shadow-[var(--shadow-lifted)] sm:p-8">
        <LogoMark className="h-12 w-12" />
        <h1 className="mt-4 font-display text-3xl font-semibold">The CozyCakes kitchen</h1>
        <p className="mt-2 text-cocoa-700">
          Sign in with your email. We&rsquo;ll send you a 6-digit code, no password needed.
        </p>
        <Suspense>
          <SignInForm />
        </Suspense>
        <Link href="/" className="mt-6 inline-block text-sm font-bold text-cocoa-700 underline">
          Back to the shop
        </Link>
      </div>
    </main>
  );
}
