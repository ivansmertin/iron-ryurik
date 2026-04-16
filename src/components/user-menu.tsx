"use client";

import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "@/features/auth/actions";

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
  const [, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-h-10 items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-accent">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium md:inline-block">
          {fullName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl">
        <div className="flex flex-col gap-1 px-2 py-1.5">
          <p className="text-sm font-medium leading-none">{fullName}</p>
          <p className="text-xs text-muted-foreground leading-none">{email}</p>
        </div>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          className="cursor-pointer py-1.5 text-sm"
          onClick={() => startTransition(() => signOut())}
        >
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
