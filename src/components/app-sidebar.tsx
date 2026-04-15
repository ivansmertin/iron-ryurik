"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/actions";

export interface SidebarLink {
  href: string;
  label: string;
}

export function AppSidebar({ links }: { links: SidebarLink[] }) {
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const isActiveLink = (href: string) => {
    if (pathname === href) {
      return true;
    }

    return pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="bg-sidebar/95 text-sidebar-foreground flex w-full flex-col border-b border-sidebar-border/80 backdrop-blur md:h-full md:w-64 md:border-r md:border-b-0">
      <div className="flex h-14 items-center px-4">
        <Logo />
      </div>
      <Separator />
      <nav className="flex-1 overflow-x-auto p-2 md:space-y-1">
        <div className="flex gap-2 md:block">
        {links.map((link) => (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            className={cn(
              "block shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-all hover:bg-sidebar-accent hover:shadow-sm",
              isActiveLink(link.href) &&
                "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm",
            )}
          >
            {link.label}
          </Link>
        ))}
        </div>
      </nav>
      <Separator />
      <div className="hidden p-2 md:block">
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
