"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface SidebarLink {
  href: string;
  label: string;
}

export function AppSidebar({ links }: { links: SidebarLink[] }) {
  const pathname = usePathname();

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full w-60 flex-col border-r">
      <div className="flex h-14 items-center px-4">
        <Logo />
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent",
              pathname === link.href &&
                "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="p-2">
        <form action="/logout" method="POST">
          <Button variant="ghost" className="w-full justify-start" type="submit">
            Выйти
          </Button>
        </form>
      </div>
    </aside>
  );
}
