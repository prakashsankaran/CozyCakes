import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { RegisterServiceWorker } from "@/components/shell/register-sw";
import { site } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  style: ["normal", "italic"],
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "CozyCakes · Made-to-order cakes", template: "%s · CozyCakes" },
  description: site.tagline,
  applicationName: "CozyCakes",
  appleWebApp: { capable: true, title: "CozyCakes", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#FFF8F0",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
