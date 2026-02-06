import type { Metadata } from "next";
// import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/contexts/I18nContext";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

// Fallback for offline build
const inter = { variable: "font-sans-fallback" };
const devanagari = { variable: "font-devanagari-fallback" };

/*
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
});
*/

export const metadata: Metadata = {
  title: "FarmScan - Precision Agriculture AI",
  description: "AI-powered crop disease detection and satellite field analysis for farmers",
  generator: "Next.js",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#059669" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FarmScan" />
      </head>
      <body
        className={`${inter.variable} ${devanagari.variable} antialiased font-sans`}
      >
        <I18nProvider>
          <ServiceWorkerRegistration />
          {children}
          {/* <OfflineIndicator /> */}
        </I18nProvider>
      </body>
    </html>
  );
}
