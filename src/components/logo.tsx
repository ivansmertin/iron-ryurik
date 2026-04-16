export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      {/* Brand Mark - Stylized Shield/R */}
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary shrink-0"
      >
        <path 
          d="M16 2L4 7V16C4 23 9 28 16 30C23 28 28 23 28 16V7L16 2Z" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          d="M12 22V10H17.5C19.5 10 21 11.5 21 13.5C21 15.5 19.5 17 17.5 17H12M17.5 17L21 22" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>
      
      {/* Combined Typography */}
      <div className="flex flex-col leading-none">
        <span className="text-xl font-black tracking-tighter uppercase italic">
          Железный
        </span>
        <span className="text-xs font-bold tracking-[0.2em] text-primary/80 uppercase ml-0.5">
          Рюрик
        </span>
      </div>
    </div>
  );
}
