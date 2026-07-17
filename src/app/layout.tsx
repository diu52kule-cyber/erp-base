import "./globals.css";
import type { Metadata, Viewport } from "next";
import SelectOnFocus from "@/components/SelectOnFocus";
import AppOverlays from "@/components/AppOverlays";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Gradia — ERP & GST Billing Software for Indian SMBs",
    template: "%s · Gradia",
  },
  description:
    "Gradia is an all-in-one business management platform for Indian SMBs — GST billing & invoicing, POS, inventory, CRM, HR & payroll, accounting, and a startup workspace. A modern, affordable alternative to Tally, Zoho & Vyapar.",
  keywords: [
    "ERP software India", "GST billing software", "invoicing software", "GST invoice generator",
    "inventory management software", "POS software", "point of sale", "CRM for small business",
    "accounting software India", "HR and payroll software", "purchase order software",
    "billing software for small business", "udhaar khata app", "GSTR-1 GSTR-3B software",
    "business management software", "Tally alternative", "Zoho Books alternative", "Vyapar alternative",
    "ERP for cafe restaurant retail", "SMB software India", "Gradia",
  ],
  alternates: { canonical: "/" },
  applicationName: "Gradia",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Gradia" },
  openGraph: {
    title: "Gradia",
    description: "Run your whole business — and your whole team — in one place.",
    type: "website",
    siteName: "Gradia",
  },
  twitter: { card: "summary_large_image", title: "Gradia", description: "Run your whole business — and your whole team — in one place." },
};

export const viewport: Viewport = {
  themeColor: "#171717",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Lora:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark')}var f=localStorage.getItem('app-font');if(f)d.style.setProperty('--app-font',f);var s=localStorage.getItem('app-font-size');if(s)d.style.setProperty('--app-font-size',s);}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <SelectOnFocus />
        <AppOverlays />
        {children}
      </body>
    </html>
  );
}
