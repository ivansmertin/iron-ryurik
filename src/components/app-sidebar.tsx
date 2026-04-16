"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  ClipboardList,
  NotebookPen,
  User,
  Clock,
  Users,
  CreditCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/actions";
import type { IconName, NavLink } from "@/config/navigation";

const iconMap: Record<IconName, LucideIcon> = {
  home: Home,
  calendar: Calendar,
  "clipboard-list": ClipboardList,
  "notebook-pen": NotebookPen,
  user: User,
  clock: Clock,
  users: Users,
  "credit-card": CreditCard,
};

function useActiveHref(links: NavLink[]) {
  const pathname = usePathname();
  return (
    links
      .slice()
      .sort((a, b) => b.href.length - a.href.length)
      .find((link) =>
        pathname === link.href ? true : pathname.startsWith(`${link.href}/`),
      )?.href ?? null
  );
}

export function AppSidebar({ links }: { links: NavLink[] }) {
  const [, startTransition] = useTransition();
  const activeHref = useActiveHref(links);

  return (
    <aside className="bg-sidebar/95 text-sidebar-foreground hidden h-full w-64 flex-col border-r border-sidebar-border/80 backdrop-blur md:flex">
      <div className="flex h-14 items-center px-4">
        <Logo />
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {links.map((link) => {
          const Icon = iconMap[link.icon];
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all hover:bg-sidebar-accent hover:shadow-sm",
                activeHref === link.href &&
                  "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <div className="p-2">
        <Button
          variant="ghost"
          className="w-full justify-start rounded-xl"
          onClick={() => startTransition(() => signOut())}
        >
          Выйти
        </Button>
      </div>
    </aside>
  );
}

export function MobileBottomNav({ links }: { links: NavLink[] }) {
  const activeHref = useActiveHref(links);

  return (
    <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t border-border/70 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {links.map((link) => {
          const Icon = iconMap[link.icon];
          const isActive = activeHref === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
