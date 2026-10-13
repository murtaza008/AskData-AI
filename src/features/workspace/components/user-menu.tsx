"use client";

import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { IconButton } from "@/components/ui/icon-button";
import { initials } from "@/lib/utils";

/** Signed-in user, theme toggle and sign-out, at the foot of the sidebar. */
export function UserMenu() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";

  return (
    <div className="flex items-center gap-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary font-mono text-[12px] text-primary-foreground">
        {name ? initials(name) : "··"}
      </span>
      <div className="min-w-0 flex-1 text-[13px] leading-tight">
        <div className="truncate font-medium">{name || " "}</div>
        <div className="truncate text-muted-foreground">{email || " "}</div>
      </div>
      <ThemeToggle />
      <IconButton label="Sign out" onClick={() => signOut({ redirectTo: "/" })}>
        <LogOut className="size-4" strokeWidth={1.5} />
      </IconButton>
    </div>
  );
}
