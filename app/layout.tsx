import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";

const publicUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

export const metadata: Metadata = {
  title: { default: "Codefyhub-DevOps Guide", template: "%s · Codefyhub-DevOps Guide" },
  description: "A field guide to resilient storage, Proxmox, secure networking, Ubuntu, and production operations.",
  metadataBase: new URL(publicUrl || "http://localhost:3000"),
  openGraph: { title: "Codefyhub-DevOps Guide", description: "Build infrastructure you can explain, secure, and recover.", type: "website" },
  icons: {
    icon: "/brand/Codefyhub-DevOps-g.jpg",
    shortcut: "/brand/Codefyhub-DevOps-g.jpg",
    apple: "/brand/Codefyhub-DevOps-g.jpg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
