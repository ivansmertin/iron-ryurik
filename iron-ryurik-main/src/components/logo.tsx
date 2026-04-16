export function Logo({ className }: { className?: string }) {
  return (
    <span className={`text-xl font-bold tracking-tight ${className ?? ""}`}>
      Железный Рюрик
    </span>
  );
}
