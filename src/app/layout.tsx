import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { IosInstallPrompt } from "@/components/pwa/ios-install-prompt";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  display: "optional",
});

export const metadata: Metadata = {
  title: "Железный Рюрик",
  description: "Приложение для управления тренажёрным залом",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Железный Рюрик",
    startupImage: [
      {
        url: "/apple-touch-icon.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
      // Note: For a professional production app, I recommend generating specific splash screens 
      // for all iPhone resolutions and placing them in public/splash/
    ],
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} min-h-[100dvh] antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-[100dvh] flex-col">
        {/* Instant Static Splash Screen */}
        <div id="static-splash" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'inherit',
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            :root { --splash-bg: #f8fafc; --splash-text: #020617; --splash-primary: #000000; }
            @media (prefers-color-scheme: dark) { :root { --splash-bg: #0a0a0a; --splash-text: #f8fafc; --splash-primary: #ffffff; } }
            #static-splash { background-color: var(--splash-bg); color: var(--splash-text); font-family: sans-serif; }
            @keyframes splash-logo { 
              0% { stroke-dasharray: 100; stroke-dashoffset: 100; opacity: 0; }
              20% { opacity: 1; }
              100% { stroke-dashoffset: 0; opacity: 1; }
            }
            @keyframes splash-text { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
            @keyframes splash-progress { 0% { transform: scaleX(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: scaleX(1); opacity: 0; } }
            .s-logo { animation: splash-logo 2.5s ease-out forwards; }
            .s-text { animation: splash-text 1.2s ease-out 0.8s backwards; font-weight: 900; font-style: italic; text-transform: uppercase; font-size: 24px; letter-spacing: -0.05em; }
            .s-subtext { animation: splash-text 1.5s ease-out 1s backwards; font-size: 10px; font-weight: bold; letter-spacing: 0.4em; text-transform: uppercase; opacity: 0.7; margin-top: 4px; }
            .s-progress { width: 128px; height: 1px; background: rgba(128,128,128,0.2); margin-top: 48px; position: relative; overflow: hidden; }
            .s-progress-bar { position: absolute; inset: 0; background: var(--splash-primary); transform-origin: left; animation: splash-progress 3s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
          `}} />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="80" height="80" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '32px' }}>
              <path d="M16 2L4 7V16C4 23 9 28 16 30C23 28 28 23 28 16V7L16 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="s-logo" />
              <path d="M12 22V10H17.5C19.5 10 21 11.5 21 13.5C21 15.5 19.5 17 17.5 17H12M17.5 17L21 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: '0.5s' }} className="s-logo" />
            </svg>
            <div className="s-text">Железный</div>
            <div className="s-subtext">Рюрик</div>
            <div className="s-progress"><div className="s-progress-bar" /></div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var observer = new MutationObserver(function(mutations) {
              if (document.querySelector('.dark') || document.querySelector('.light')) {
                var splash = document.getElementById('static-splash');
                if (splash) setTimeout(function() { splash.style.opacity = '0'; setTimeout(function() { splash.remove(); }, 300); }, 100);
                observer.disconnect();
              }
            });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
          })();
        `}} />

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <PwaRegister />
          <IosInstallPrompt />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
