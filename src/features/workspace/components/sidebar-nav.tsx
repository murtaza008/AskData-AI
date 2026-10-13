"use client";

import { LayoutDashboard, MessageSquare, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  // "Ask" covers both a new chat (/app) and an open conversation (/app/c/…).
  { href: "/app", label: "Ask", icon: MessageSquare, match: (path: string) => path === "/app" || path.startsWith("/app/c/") },
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (path: string) => path.startsWith("/app/dashboard") },
  { href: "/app/upload", label: "Upload data", icon: Upload, match: (path: string) => path.startsWith("/app/upload") },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5" aria-label="Workspace">
      {ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[14px] transition-colors hover:bg-muted hover:text-foreground",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" strokeWidth={1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
