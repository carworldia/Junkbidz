import "./globals.css";
import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const viewport: Viewport = { themeColor: "#0d1117", colorScheme: "light dark", viewportFit: "cover" };

const DESCRIPTION = "Post your junk once and get quotes from local junk removal companies. Compare prices and reviews, pick one, and chat in the app.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: SITE_NAME, url: "/", title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: DESCRIPTION },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  applicationName: SITE_NAME,
  formatDetection: { telephone: false },
};

// Applies the saved Appearance before the page paints (Dark is the default; see components/ThemeSwitch.tsx).
const INIT_THEME = `(function(){try{var p=localStorage.getItem("jk_theme"),d=p!=="light"&&(p!=="auto"||matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";if(!d){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#ffffff")}}catch(e){}})();`;
const FONTS = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
        <script dangerouslySetInnerHTML={{ __html: INIT_THEME }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
