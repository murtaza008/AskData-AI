"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { IconButton } from "@/components/ui/icon-button";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <IconButton label="Toggle dark mode" className={className} onClick={() => setTheme(next)}>
      {/* Both icons render; CSS picks one, so there is no hydration mismatch. */}
      <Sun className="hidden size-4 dark:block" strokeWidth={1.5} />
      <Moon className="size-4 dark:hidden" strokeWidth={1.5} />
    </IconButton>
  );
}
