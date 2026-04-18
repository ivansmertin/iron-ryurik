"use client";

import { useEffect, useState } from "react";

export function StaticSplash() {
  const [phase, setPhase] = useState<"visible" | "hiding" | "removed">(
    "visible",
  );

  useEffect(() => {
    const hideTimer = window.setTimeout(() => {
      setPhase("hiding");
    }, 120);

    const removeTimer = window.setTimeout(() => {
      setPhase("removed");
    }, 450);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (phase === "removed") {
    return null;
  }

  return (
    <div
      id="static-splash"
      aria-hidden="true"
      data-phase={phase}
      className="static-splash"
    >
      <style>{`
        :root {
          --splash-bg: #f8fafc;
          --splash-text: #020617;
          --splash-primary: #000000;
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --splash-bg: #0a0a0a;
            --splash-text: #f8fafc;
            --splash-primary: #ffffff;
          }
        }

        .static-splash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: var(--splash-bg);
          color: var(--splash-text);
          font-family: var(--font-geist-sans), sans-serif;
          opacity: 1;
          transition: opacity 220ms ease;
          pointer-events: none;
          animation: splash-fade 220ms ease 4s forwards;
        }

        .static-splash[data-phase="hiding"] {
          animation: none;
          opacity: 0;
        }

        @keyframes splash-logo {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes splash-text {
          0% {
            transform: translateY(20px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes splash-progress {
          0% {
            transform: scaleX(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: scaleX(1);
            opacity: 0;
          }
        }

        @keyframes splash-fade {
          to {
            opacity: 0;
            visibility: hidden;
          }
        }

        .static-splash__inner {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .static-splash__mark {
          margin-bottom: 32px;
        }

        .static-splash__logo {
          animation: splash-logo 2.5s ease-out forwards;
        }

        .static-splash__logo--delayed {
          animation-delay: 0.5s;
        }

        .static-splash__title {
          animation: splash-text 1.2s ease-out 0.8s backwards;
          font-size: 24px;
          font-style: italic;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .static-splash__subtitle {
          animation: splash-text 1.5s ease-out 1s backwards;
          margin-top: 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.4em;
          opacity: 0.7;
          text-transform: uppercase;
        }

        .static-splash__progress {
          position: relative;
          width: 128px;
          height: 1px;
          margin-top: 48px;
          overflow: hidden;
          background: rgba(128, 128, 128, 0.2);
        }

        .static-splash__progress-bar {
          position: absolute;
          inset: 0;
          background: var(--splash-primary);
          transform-origin: left;
          animation: splash-progress 3s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
      `}</style>

      <div className="static-splash__inner">
        <svg
          width="80"
          height="80"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="static-splash__mark"
        >
          <path
            d="M16 2L4 7V16C4 23 9 28 16 30C23 28 28 23 28 16V7L16 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="static-splash__logo"
          />
          <path
            d="M12 22V10H17.5C19.5 10 21 11.5 21 13.5C21 15.5 19.5 17 17.5 17H12M17.5 17L21 22"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="static-splash__logo static-splash__logo--delayed"
          />
        </svg>
        <div className="static-splash__title">Железный</div>
        <div className="static-splash__subtitle">Рюрик</div>
        <div className="static-splash__progress">
          <div className="static-splash__progress-bar" />
        </div>
      </div>
    </div>
  );
}
