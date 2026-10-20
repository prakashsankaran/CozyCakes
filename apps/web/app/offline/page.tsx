import type { Metadata } from "next";

export const metadata: Metadata = { title: "You're offline" };

/** Precached by the service worker and shown when a page can't load without a connection. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-7xl" aria-hidden="true">
        📶
      </p>
      <h1 className="mt-6 font-display text-4xl font-semibold">
        The oven&rsquo;s on, but the internet&rsquo;s off
      </h1>
      <p className="mt-3 text-lg text-cocoa-700">
        Check your connection and try again. Anything you&rsquo;ve picked is safe on this device.
      </p>
    </main>
  );
}
