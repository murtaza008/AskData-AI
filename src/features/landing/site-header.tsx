import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonClass } from "@/components/ui/button";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#demos", label: "Try the code" },
  { href: "#safety", label: "Safety" },
  { href: "#screens", label: "Screens" },
];

/**
 * Full-width top bar. It starts flush with the page and gains a surface and a
 * border once the page scrolls (CSS scroll-driven animation, no JavaScript).
 */
export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-transparent">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-6 px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Sections" className="hidden flex-1 md:block">
          <ul className="flex items-center gap-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-sm px-2.5 py-1.5 text-[14px] text-fg-muted transition-colors hover:bg-sunken hover:text-fg"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/login" className={buttonClass("ghost", "sm", "hidden sm:inline-flex")}>
            Log in
          </Link>
          <Link href="/login?demo=1" data-press="" className={buttonClass("primary", "sm")}>
            Try the demo
          </Link>
        </div>
      </div>
    </header>
  );
}
