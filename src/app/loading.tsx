"use client";

import { useEffect, useState } from "react";

export default function Loading() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="relative flex flex-col items-center">
        {/* Animated Brand Mark */}
        <div className="relative mb-8">
          <svg 
            width="80" 
            height="80" 
            viewBox="0 0 32 32" 
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
          >
            <path 
              d="M16 2L4 7V16C4 23 9 28 16 30C23 28 28 23 28 16V7L16 2Z" 
              fill="none"
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-logo-path"
            />
            <path 
              d="M12 22V10H17.5C19.5 10 21 11.5 21 13.5C21 15.5 19.5 17 17.5 17H12M17.5 17L21 22" 
              fill="none"
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="animate-logo-path-delayed"
            />
          </svg>
          
          {/* Subtle Glow */}
          <div className="absolute inset-0 -z-10 bg-primary/20 blur-2xl animate-pulse" />
        </div>
        
        {/* Animated Typography */}
        <div className="flex flex-col items-center gap-1 overflow-hidden">
          <span className="text-2xl font-black tracking-tighter uppercase italic animate-show-text">
            Железный
          </span>
          <span className="text-[10px] font-bold tracking-[0.4em] text-primary/70 uppercase translate-y-4 animate-show-subtext">
            Рюрик
          </span>
        </div>

        {/* Premium Progress Bar */}
        <div className="mt-12 h-[1px] w-32 overflow-hidden bg-muted/30 rounded-full">
          <div className="h-full w-full bg-primary origin-left animate-progress-reveal" />
        </div>
      </div>
    </div>
  );
}
