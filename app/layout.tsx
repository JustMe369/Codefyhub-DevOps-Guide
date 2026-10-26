import type { Metadata } from "next";
import { headers } from "next/headers";
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('devops-guide:theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')}catch(e){}" }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
