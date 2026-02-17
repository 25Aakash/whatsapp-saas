import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { FacebookSDK } from "@/components/FacebookSDK";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "WA SaaS - WhatsApp Business Platform",
    template: "%s - WA SaaS",
  },
  description:
    "Multi-tenant WhatsApp Cloud API management platform. Send, receive, and manage WhatsApp Business conversations at scale.",
  keywords: [
    "WhatsApp",
    "Cloud API",
    "SaaS",
    "Business",
    "Messaging",
    "Multi-tenant",
  ],
  authors: [{ name: "WA SaaS Platform" }],
  openGraph: {
    title: "WA SaaS - WhatsApp Business Platform",
    description:
      "Manage all your WhatsApp Business conversations in one powerful platform.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <FacebookSDK />
        {children}
      </body>
    </html>
  );
}
