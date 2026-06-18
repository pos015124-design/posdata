import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bhaby E-Shop — Download the App | Tanzania's #1 Mobile Marketplace",
  description:
    "Download the Bhaby E-Shop app for Android — Tanzania's premier multi-vendor marketplace. Browse thousands of local products, checkout in seconds, and get delivery managed by BHABY GROUP LTD.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://download.bhabygroup.co.tz"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Bhaby E-Shop — Download the Android App",
    description:
      "Download the Bhaby E-Shop Android app and enjoy a native shopping experience powered by Tanzania's leading e-commerce platform.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://download.bhabygroup.co.tz",
    siteName: "Bhaby E-Shop",
    images: [
      {
        url: "/bhaby-og-image.png",
        width: 1200,
        height: 630,
        alt: "Bhaby E-Shop — Download for Android",
      },
    ],
    type: "website",
    locale: "en_TZ",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bhaby E-Shop — Download the App",
    description:
      "Download the Bhaby E-Shop Android app and enjoy a native shopping experience.",
    images: ["/bhaby-og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  keywords: [
    "bhaby eshop",
    "tanzania marketplace",
    "download android app",
    "bhaby group",
    "tanzanian ecommerce",
    "mobile shopping tanzania",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
