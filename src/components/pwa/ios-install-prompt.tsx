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
  const [shouldRender, setShouldRender] = useState(false);

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
    const dismissalExpiry = isDismissed ? parseInt(isDismissed, 10) : 0;
    const now = new Date().getTime();

    // Only show if on iOS, not installed, and not recently dismissed (or dismissal expired)
    if (isIOS && !isStandalone && (!isDismissed || now > dismissalExpiry)) {
      // PREVENT flickering: Wait for 3 seconds before showing
      const timer = setTimeout(() => {
        setShouldRender(true);
        // Small delay to trigger the animation
        setTimeout(() => setIsVisible(true), 50);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for animation to finish before unrendering
    setTimeout(() => {
      setShouldRender(false);
      // Remember dismissal for 7 days (reduced from 14 for better testing/re-engagement)
      const expiry = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem("pwa_ios_prompt_dismissed", expiry.toString());
    }, 500);
  };

  if (!shouldRender) return null;

  return (
    <div 
      className={cn(
        "fixed inset-x-0 bottom-6 z-[100] px-4 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isVisible 
          ? "translate-y-0 opacity-100 scale-100" 
          : "translate-y-20 opacity-0 scale-95"
      )}
    >
      <div 
        className={cn(
          "relative mx-auto max-w-[280px] overflow-hidden rounded-[2rem] border border-white/20 bg-white/80 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-all",
          "dark:border-white/10 dark:bg-black/70 dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
        )}
      >
        {/* Visual Handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-muted/30" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground/50 hover:bg-muted/30 hover:text-foreground transition-all"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-4 pt-1">
          <div className="text-center">
            <h3 className="text-base font-black tracking-tight text-foreground uppercase italic leading-tight">
              Установить
            </h3>
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground leading-snug">
              Добавьте <span className="text-primary font-bold italic lowercase">железный рюрик</span> на главный экран
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                <SafariShareIcon />
              </div>
              <p className="text-[12px] font-semibold text-foreground/90 leading-tight">
                Нажмите <span className="text-primary font-black uppercase italic text-[11px]">«Поделиться»</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                <AddToHomeIcon />
              </div>
              <p className="text-[12px] font-semibold text-foreground/90 leading-tight">
                Выберите <span className="text-primary font-black uppercase italic text-[11px]">«На экран „Домой“»</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full rounded-xl bg-primary py-2.5 text-[10px] font-black tracking-[0.15em] text-primary-foreground shadow-lg shadow-primary/20 uppercase italic transition-all hover:brightness-110 active:scale-[0.96]"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
