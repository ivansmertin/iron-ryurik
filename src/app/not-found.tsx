import Link from "next/link";
import { MoveLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 -z-10 h-full w-full opacity-[0.03]">
        <div className="absolute top-0 h-px w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="absolute h-full w-full bg-[radial-gradient(circle_at_center,_var(--primary)_1px,_transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Animated icon container */}
        <div className="bg-primary/5 border-primary/10 relative mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border shadow-soft transition-transform duration-500 hover:rotate-3 hover:scale-110">
          <Search className="text-primary h-10 w-10" />
          <div className="absolute -top-1 -right-1 flex h-6 w-6 animate-bounce items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-lg">
            404
          </div>
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight md:text-6xl">
          Пусто в этом <span className="text-primary">зале</span>
        </h1>
        
        <p className="text-muted-foreground mb-12 max-w-md text-lg leading-relaxed">
          Похоже, этой страницы не существует или она была перенесена. 
          Возможно, стоит проверить расписание или вернуться на главную.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            nativeButton={false}
            render={<Link href="/" />}
            className="group px-8"
          >
            <MoveLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Вернуться на главную
          </Button>
          
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/client/schedule" />}
            className="px-8"
          >
            В расписание
          </Button>
        </div>
      </div>

      {/* Subtle glow */}
      <div className="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-20 blur-[120px]">
        <div className="bg-primary h-full w-full rounded-full" />
      </div>
    </div>
  );
}
