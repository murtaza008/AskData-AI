import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Pressable } from "@/components/motion/reveal";
import { buttonClass } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="animate-rise sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-10">
          <Wordmark />
          <nav className="hidden items-center gap-6 text-[14px] text-muted-foreground md:flex" aria-label="Sections">
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#safety" className="transition-colors hover:text-foreground">Safety</a>
            <a href="#questions" className="transition-colors hover:text-foreground">Examples</a>
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden px-3 py-2 text-[14px] hover:underline sm:block">
            Log in
          </Link>
          <Pressable>
            <Link href="/login?demo=1" className={buttonClass("primary")}>
              Try the demo
            </Link>
          </Pressable>
        </div>
      </div>
    </header>
  );
}
