"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserMenu({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium md:inline-block">
          {fullName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{fullName}</p>
          <p className="text-muted-foreground text-xs">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <form action="/logout" method="POST">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).closest("form")?.requestSubmit();
            }}
          >
            Выйти
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
