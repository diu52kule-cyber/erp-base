import "./globals.css";
import type { Metadata } from "next";
import SelectOnFocus from "@/components/SelectOnFocus";

export const metadata: Metadata = {
  title: "ERP Base",
  description: "Modular business management platform for Indian SMBs",
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
        {children}
      </body>
    </html>
  );
}
