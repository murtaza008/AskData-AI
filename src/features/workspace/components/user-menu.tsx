"use client";

import { useQuery } from "@tanstack/react-query";
import { FileUp, History, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { q } from "@/lib/queries";
import { initials } from "@/lib/utils";

/** Account menu: who is signed in, demo quota, shortcuts and sign-out. */
export function UserMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const me = useQuery(q.me());
  const name = session?.user?.name ?? me.data?.name ?? "";
  const email = session?.user?.email ?? me.data?.email ?? "";
  const usage = me.data?.usage;

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          aria-label={name ? `${initials(name)}: account menu for ${name}` : "Account menu"}
          data-press=""
          className="grid size-8 place-items-center rounded-full bg-inverse font-mono text-[11px] font-semibold text-inverse-fg ring-offset-2 ring-offset-surface transition-shadow hover:ring-2 hover:ring-border-strong"
        >
          {name ? initials(name) : "·"}
        </button>
      </MenuTrigger>
      <MenuContent className="w-64">
        <div className="px-2.5 pb-2 pt-1.5">
          <p className="truncate font-medium text-fg">{name || "Signed in"}</p>
          <p className="truncate text-[12.5px] text-fg-muted">{email}</p>
          {me.data?.isDemo && usage?.dailyLimit && (
            <p className="mt-2 rounded-sm bg-sunken px-2 py-1.5 text-[12px] text-fg-muted">
              Shared demo account ·{" "}
              <span className="num text-fg">
                {usage.questionsLast24h} of {usage.dailyLimit}
              </span>{" "}
              questions used in the last 24 h
            </p>
          )}
        </div>
        <MenuSeparator />
        <MenuItem onSelect={() => router.push("/app/history")}>
          <History aria-hidden /> Conversation history
        </MenuItem>
        <MenuItem onSelect={() => router.push("/app/upload")}>
          <FileUp aria-hidden /> Upload a CSV
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => void signOut({ redirectTo: "/" })}>
          <LogOut aria-hidden /> Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
