"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Custom SVG icon representing the Safari Share button
 */
const SafariShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

/**
 * Custom SVG icon representing the "Add to Home Screen" button
 */
const AddToHomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export function IosInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the device is iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    
    // Check if the app is already running in standalone mode (PWA)
    const isStandalone =
      (window.navigator as any).standalone ||
      window.matchMedia("(display-mode: standalone)").matches;

    // Check if the user has already dismissed the prompt
    const isDismissed = localStorage.getItem("pwa_ios_prompt_dismissed");

    // Only show if on iOS, not installed, and not recently dismissed
    if (isIOS && !isStandalone && !isDismissed) {
      // INSTANT appearance as requested by user
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Remember dismissal for 14 days for a better UX
    const expiry = new Date().getTime() + 14 * 24 * 60 * 60 * 1000;
    localStorage.setItem("pwa_ios_prompt_dismissed", expiry.toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-[100] px-4 animate-in slide-in-from-bottom-8 duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
      <div 
        className={cn(
          "relative mx-auto max-w-[320px] overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/70 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-2xl transition-all",
          "dark:border-white/10 dark:bg-black/60 dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
        )}
      >
        {/* Visual Handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-muted/40" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground transition-all"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-6 pt-2">
          <div className="text-center">
            <h3 className="text-lg font-black tracking-tight text-foreground uppercase italic leading-tight">
              Установить приложение
            </h3>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground leading-relaxed">
              Добавьте <span className="text-primary font-bold italic lowercase">железный рюрик</span><br />на экран «Домой»
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm group-hover:scale-110 transition-transform duration-500 ease-spring">
                <SafariShareIcon />
              </div>
              <p className="text-[13px] font-semibold text-foreground/90 leading-snug">
                1. Нажмите <span className="text-primary font-black uppercase italic">«Поделиться»</span>
              </p>
            </div>
            
            <div className="flex items-center gap-4 group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm group-hover:scale-110 transition-transform duration-500 ease-spring">
                <AddToHomeIcon />
              </div>
              <p className="text-[13px] font-semibold text-foreground/90 leading-snug">
                2. Выберите <span className="text-primary font-black uppercase italic">«На экран „Домой“»</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full rounded-2xl bg-primary py-3.5 text-xs font-black tracking-widest text-primary-foreground shadow-lg shadow-primary/20 uppercase italic transition-all hover:brightness-110 active:scale-[0.96]"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
