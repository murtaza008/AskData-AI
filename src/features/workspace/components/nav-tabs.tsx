"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useLayoutEffect, useRef } from "react";
import { HoverCard } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "../nav";
import { NavPreview, prefetchPageData } from "./nav-preview";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Move an indicator element onto a link (positions written outside React). */
function place(indicator: HTMLElement | null, target: HTMLElement | null, animate: boolean) {
  if (!indicator) return;
  if (!target) {
    indicator.style.opacity = "0";
    return;
  }
  indicator.style.transition = animate
    ? `transform 320ms ${EASE}, width 320ms ${EASE}, opacity 150ms`
    : "opacity 150ms";
  indicator.style.transform = `translateX(${target.offsetLeft}px)`;
  indicator.style.width = `${target.offsetWidth}px`;
  indicator.style.opacity = "1";
}

/**
 * Desktop navigation: grouped tabs with one sliding active underline and one
 * soft highlight that follows the pointer. Each tab has a hover card with
 * what the page is for and live counts, and hovering prefetches the page's
 * code and data.
 */
export function NavTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const links = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const active = useRef<HTMLSpanElement>(null);
  const hover = useRef<HTMLSpanElement>(null);
  const placedOnce = useRef(false);

  const current = NAV_ITEMS.find((item) => item.match(pathname));

  useLayoutEffect(() => {
    const target = current ? (links.current.get(current.href) ?? null) : null;
    place(active.current, target, placedOnce.current);
    placedOnce.current = true;
  }, [current]);

  // Fonts load after first paint and change tab widths; re-measure then.
  useLayoutEffect(() => {
    const remeasure = () => place(active.current, current ? (links.current.get(current.href) ?? null) : null, false);
    void document.fonts?.ready.then(remeasure);
    window.addEventListener("resize", remeasure);
    return () => window.removeEventListener("resize", remeasure);
  }, [current]);

  const warm = (href: string) => {
    router.prefetch(href);
    prefetchPageData(queryClient, href);
  };

  return (
    <nav aria-label="Main" className="relative hidden h-full md:block" onPointerLeave={() => place(hover.current, null, false)}>
      <span
        ref={hover}
        aria-hidden
        className="pointer-events-none absolute left-0 top-1/2 h-8 -translate-y-1/2 rounded-sm bg-sunken opacity-0"
        style={{ width: 0 }}
      />
      <span
        ref={active}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-[2px] rounded-full bg-accent opacity-0"
        style={{ width: 0 }}
      />
      <ul className="relative flex h-full items-stretch">
        {NAV_ITEMS.map((item, index) => {
          const isActive = current?.href === item.href;
          const newGroup = index > 0 && NAV_ITEMS[index - 1].group !== item.group;
          const Icon = item.icon;
          return (
            <Fragment key={item.href}>
              {newGroup && <li aria-hidden className="mx-1.5 my-auto h-4 w-px bg-border" />}
              <li className="flex items-center">
                <HoverCard
                  width={280}
                  trigger={
                    <Link
                      ref={(element) => {
                        if (element) links.current.set(item.href, element);
                        else links.current.delete(item.href);
                      }}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onPointerEnter={(event) => {
                        place(hover.current, event.currentTarget, hover.current?.style.opacity === "1");
                        warm(item.href);
                      }}
                      onFocus={() => warm(item.href)}
                      className={cn(
                        "relative inline-flex h-8 items-center gap-2 rounded-sm px-3 text-[14px] transition-colors duration-150",
                        isActive ? "font-medium text-fg" : "text-fg-muted hover:text-fg",
                      )}
                    >
                      <Icon aria-hidden className={cn("size-4", isActive && "text-accent-text")} strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  }
                >
                  <NavPreview item={item} />
                </HoverCard>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </nav>
  );
}

/** Same tabs without the active state, used while the path is unknown (prerendering). */
export function NavTabsFallback() {
  return (
    <nav aria-label="Main" className="hidden h-full md:block">
      <ul className="flex h-full items-center">
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const newGroup = index > 0 && NAV_ITEMS[index - 1].group !== item.group;
          return (
            <Fragment key={item.href}>
              {newGroup && <li aria-hidden className="mx-1.5 h-4 w-px bg-border" />}
              <li>
                <Link href={item.href} className="inline-flex h-8 items-center gap-2 rounded-sm px-3 text-[14px] text-fg-muted">
                  <Icon aria-hidden className="size-4" strokeWidth={1.75} />
                  {item.label}
                </Link>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </nav>
  );
}
